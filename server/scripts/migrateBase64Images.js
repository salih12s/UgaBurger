/*
 * DB'deki base64 (data:image/...) image_url'leri tespit eder ve fiziksel dosyaya
 * yazip path'i gunceller. Boylece /api/products yaniti devasa olmaktan kurtulur,
 * resimler tarayicida cache'lenir, LCP saniyeler kazanir.
 *
 * Calistirma:
 *   cd server
 *   node scripts/migrateBase64Images.js
 *
 * Etkilenen tablolar: Product, Category, Setting (site_logo) -- Product oncelikli.
 *
 * Idempotent: zaten path olanlara dokunmaz.
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

let sharp;
try { sharp = require('sharp'); } catch { /* sharp yoksa optimize etmeden kaydeder */ }

const { sequelize, Product, Setting } = require('../models');

const UPLOADS_DIR = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const DATA_URL_RE = /^data:(image\/(png|jpe?g|webp|gif));base64,(.+)$/i;

async function base64ToFile(dataUrl) {
  const m = dataUrl.match(DATA_URL_RE);
  if (!m) return null;
  const mime = m[1].toLowerCase();
  const ext = mime === 'image/jpeg' ? 'jpg' : mime.split('/')[1];
  let buf = Buffer.from(m[3], 'base64');

  // Optimize: 1024px max + JPEG quality 78
  if (sharp) {
    try {
      const meta = await sharp(buf).metadata();
      let pipe = sharp(buf).rotate();
      if (meta.width && meta.width > 1024) pipe = pipe.resize({ width: 1024, withoutEnlargement: true });
      if (ext === 'png') pipe = pipe.png({ compressionLevel: 9, palette: true });
      else pipe = pipe.jpeg({ quality: 78, mozjpeg: true, progressive: true });
      buf = await pipe.toBuffer();
    } catch { /* optimize edilemediyse orijinal buf'i kullan */ }
  }

  const hash = crypto.createHash('md5').update(buf).digest('hex').slice(0, 12);
  const filename = `${Date.now()}-${hash}.${ext === 'png' ? 'png' : 'jpg'}`;
  const fp = path.join(UPLOADS_DIR, filename);
  fs.writeFileSync(fp, buf);
  return { path: `/uploads/${filename}`, size: buf.length };
}

(async () => {
  await sequelize.authenticate();
  console.log('DB baglantisi OK\n');

  let migrated = 0;
  let totalSavedBytes = 0;

  // --- Product ---
  const products = await Product.findAll();
  console.log(`Toplam urun: ${products.length}`);
  for (const p of products) {
    if (!p.image_url) continue;
    if (!p.image_url.startsWith('data:')) continue;
    const oldSize = Buffer.byteLength(p.image_url, 'utf8');
    try {
      const r = await base64ToFile(p.image_url);
      if (!r) continue;
      await p.update({ image_url: r.path });
      const saved = oldSize - r.size;
      totalSavedBytes += saved;
      migrated++;
      console.log(`  [OK] #${p.id} ${p.name}: ${(oldSize/1024).toFixed(0)}KB -> ${(r.size/1024).toFixed(0)}KB  (yeni: ${r.path})`);
    } catch (e) {
      console.error(`  [ERR] #${p.id}: ${e.message}`);
    }
  }

  // --- Setting (site_logo vs.) ---
  const settings = await Setting.findAll();
  for (const s of settings) {
    if (!s.value || !String(s.value).startsWith('data:')) continue;
    const oldSize = Buffer.byteLength(s.value, 'utf8');
    try {
      const r = await base64ToFile(s.value);
      if (!r) continue;
      await s.update({ value: r.path });
      const saved = oldSize - r.size;
      totalSavedBytes += saved;
      migrated++;
      console.log(`  [OK] setting "${s.key}": ${(oldSize/1024).toFixed(0)}KB -> ${(r.size/1024).toFixed(0)}KB`);
    } catch (e) {
      console.error(`  [ERR] setting ${s.key}: ${e.message}`);
    }
  }

  console.log(`\n========== OZET ==========`);
  console.log(`Donusturulen kayit: ${migrated}`);
  console.log(`Toplam kazanc: ${(totalSavedBytes/1024).toFixed(0)} KB (${(totalSavedBytes/1024/1024).toFixed(2)} MB)`);
  console.log(`Yeni resim dosyalari: ${UPLOADS_DIR}`);

  await sequelize.close();
})();
