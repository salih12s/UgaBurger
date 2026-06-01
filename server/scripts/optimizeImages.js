/*
 * Gorsel optimize script'i.
 *
 * Ne yapar:
 *  - ../../Images   ve   ../uploads   klasorlerini tarar
 *  - 200 KB'tan buyuk JPEG/PNG dosyalari icin:
 *      * en fazla 1024px genislige indirir (orani korur)
 *      * JPEG quality 78 + mozjpeg ile yeniden kaydeder
 *      * Ayni isimle USTUNE YAZAR (DB'deki path'ler degismez)
 *  - Once orijinali ".bak" olarak yedekler (geri donus icin)
 *
 * Calistirma:
 *   cd server
 *   npm install --save-dev sharp
 *   node scripts/optimizeImages.js
 *
 * Idempotent: kucuk olanlara dokunmaz. Tekrar calistirilirsa "skip" der.
 */

const fs = require('fs');
const path = require('path');

let sharp;
try {
  sharp = require('sharp');
} catch (e) {
  console.error('\n[HATA] "sharp" paketi yuklu degil. Yuklemek icin:');
  console.error('   cd server && npm install --save-dev sharp\n');
  process.exit(1);
}

const TARGETS = [
  path.join(__dirname, '..', '..', 'Images'),
  path.join(__dirname, '..', 'uploads'),
];

const MAX_WIDTH = 1024;
const QUALITY = 78;
const MIN_SIZE_BYTES = 200 * 1024; // 200 KB altini atla
const EXT_RE = /\.(jpe?g|png)$/i;

async function optimizeFile(filePath) {
  const stat = fs.statSync(filePath);
  if (stat.size < MIN_SIZE_BYTES) return { skipped: true, reason: 'small' };

  const ext = path.extname(filePath).toLowerCase();
  const backup = filePath + '.bak';

  // Onceden optimize edilmis mi? (.bak varsa atla)
  if (fs.existsSync(backup)) return { skipped: true, reason: 'already-optimized' };

  const buf = fs.readFileSync(filePath);
  const img = sharp(buf, { failOn: 'none' });
  const meta = await img.metadata();

  let pipeline = img.rotate(); // EXIF orientation
  if (meta.width && meta.width > MAX_WIDTH) {
    pipeline = pipeline.resize({ width: MAX_WIDTH, withoutEnlargement: true });
  }

  if (ext === '.png') {
    pipeline = pipeline.png({ quality: QUALITY, compressionLevel: 9, palette: true });
  } else {
    pipeline = pipeline.jpeg({ quality: QUALITY, mozjpeg: true, progressive: true });
  }

  const out = await pipeline.toBuffer();

  if (out.length >= stat.size) {
    return { skipped: true, reason: 'no-gain', oldSize: stat.size, newSize: out.length };
  }

  // Yedek + uzerine yaz
  fs.renameSync(filePath, backup);
  fs.writeFileSync(filePath, out);

  return { ok: true, oldSize: stat.size, newSize: out.length };
}

function fmtKB(b) { return (b / 1024).toFixed(1) + ' KB'; }

(async () => {
  let totalOld = 0, totalNew = 0, done = 0, skipped = 0;

  for (const dir of TARGETS) {
    if (!fs.existsSync(dir)) {
      console.log(`[atla] Klasor yok: ${dir}`);
      continue;
    }
    console.log(`\n=== ${dir} ===`);
    const files = fs.readdirSync(dir).filter(f => EXT_RE.test(f));

    for (const f of files) {
      const fp = path.join(dir, f);
      try {
        const r = await optimizeFile(fp);
        if (r.ok) {
          totalOld += r.oldSize;
          totalNew += r.newSize;
          done++;
          const saved = (((r.oldSize - r.newSize) / r.oldSize) * 100).toFixed(0);
          console.log(`  [OK]   ${f.padEnd(45)} ${fmtKB(r.oldSize)} -> ${fmtKB(r.newSize)}  (-${saved}%)`);
        } else {
          skipped++;
          console.log(`  [skip] ${f.padEnd(45)} (${r.reason})`);
        }
      } catch (e) {
        console.error(`  [ERR]  ${f}: ${e.message}`);
      }
    }
  }

  console.log('\n========== OZET ==========');
  console.log(`Optimize: ${done} dosya | Atlanan: ${skipped}`);
  if (done > 0) {
    const savedPct = (((totalOld - totalNew) / totalOld) * 100).toFixed(1);
    console.log(`Toplam:   ${fmtKB(totalOld)} -> ${fmtKB(totalNew)}  (-${savedPct}%)`);
    console.log('Yedekler ".bak" uzantisiyla ayni klasorde duruyor.');
    console.log('Sorun yoksa silebilirsin:  Get-ChildItem -Recurse -Filter *.bak | Remove-Item');
  }
})();
