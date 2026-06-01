/**
 * Railway PostgreSQL -> cPanel MySQL veri taşıma scripti.
 *
 * Kullanım:
 *   1) `.env.migrate` benzeri bir dosya hazırla VEYA aşağıdaki ortam değişkenlerini ver:
 *        SOURCE_DATABASE_URL=postgresql://...railway...
 *        TARGET_DB_HOST=...           (cPanel sunucu IP veya host)
 *        TARGET_DB_PORT=3306
 *        TARGET_DB_NAME=uga28rge_ugaburger
 *        TARGET_DB_USER=uga28rge_ugauser
 *        TARGET_DB_PASSWORD=...
 *   2) cPanel > Remote MySQL panelinden lokal IP'ni geçici olarak whitelist'e ekle.
 *   3) `cd server && node scripts/migrateRailwayToCpanel.js`
 *   4) İşlem bitince Remote MySQL whitelist'inden IP'ni kaldır.
 *
 * Not: Hedef tablolar otomatik oluşturulur (sequelize.sync). FK sırasına göre veriler
 * kopyalanır. ID değerleri korunur.
 */

const path = require('path');
const { Sequelize, DataTypes } = require('sequelize');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

// ---- Bağlantılar ----------------------------------------------------------

const SOURCE_URL = process.env.SOURCE_DATABASE_URL || process.env.DATABASE_URL;
if (!SOURCE_URL) {
  console.error('HATA: SOURCE_DATABASE_URL (veya DATABASE_URL) tanımlı değil.');
  process.exit(1);
}

const sourceSeq = new Sequelize(SOURCE_URL, {
  dialect: 'postgres',
  logging: false,
  dialectOptions: { ssl: { require: true, rejectUnauthorized: false } },
  define: { underscored: true, timestamps: true },
});

const targetSeq = new Sequelize(
  process.env.TARGET_DB_NAME,
  process.env.TARGET_DB_USER,
  process.env.TARGET_DB_PASSWORD,
  {
    host: process.env.TARGET_DB_HOST || 'localhost',
    port: process.env.TARGET_DB_PORT || 3306,
    dialect: 'mysql',
    logging: false,
    define: { underscored: true, timestamps: true },
  }
);

// ---- Modelleri her iki bağlantıda yükle ----------------------------------

function loadModels(sequelize) {
  const orig = require('../config/db');
  // Bu hile: models/*.js dosyaları '../config/db' modülünü require ediyor.
  // require cache'i tek bir sequelize'a bağlı; bu yüzden modelleri manuel
  // tanımlamak yerine, geçici olarak require cache'i temizleyip yeni
  // bağlantı ile yeniden yükleyeceğiz.
  const dbPath = require.resolve('../config/db');
  const modelDir = path.join(__dirname, '../models');
  const modelFiles = [
    'User', 'Category', 'Product', 'Extra', 'ProductExtra',
    'Table', 'Order', 'OrderItem', 'Setting', 'PromoCode',
    'OptionGroup', 'OptionGroupItem', 'ProductOptionGroup',
  ];
  // db modülünü override et
  require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: sequelize };
  // Model cache'lerini temizle
  for (const f of modelFiles) {
    const p = path.join(modelDir, `${f}.js`);
    if (require.cache[p]) delete require.cache[p];
  }
  const indexPath = path.join(modelDir, 'index.js');
  if (require.cache[indexPath]) delete require.cache[indexPath];
  const models = require('../models');
  // Cache'i geri yüklemek migration sonrası gerekirse:
  models.__restoreOriginalDb = () => {
    require.cache[dbPath] = { id: dbPath, filename: dbPath, loaded: true, exports: orig };
  };
  return models;
}

// ---- Kopyalama sırası (FK güvenli) ---------------------------------------

const ORDER = [
  'User',
  'Category',
  'Extra',
  'Product',
  'OptionGroup',
  'OptionGroupItem',
  'ProductExtra',
  'ProductOptionGroup',
  'Setting',
  'PromoCode',
  'Table',
  'Order',
  'OrderItem',
];

async function copyTable(name, sourceModels, targetModels) {
  const Source = sourceModels[name];
  const Target = targetModels[name];
  if (!Source || !Target) {
    console.warn(`  - ${name}: model bulunamadı, atlanıyor.`);
    return;
  }
  const rows = await Source.findAll({ raw: true });
  if (rows.length === 0) {
    console.log(`  · ${name}: 0 kayıt`);
    return;
  }
  // bulkCreate: id'ler dahil
  await Target.bulkCreate(rows, { validate: false, individualHooks: false, ignoreDuplicates: false });
  // MySQL auto_increment'i en yüksek id'ye ayarla
  const tableName = Target.getTableName();
  const maxId = rows.reduce((m, r) => (typeof r.id === 'number' && r.id > m ? r.id : m), 0);
  if (maxId > 0) {
    try {
      await targetSeq.query(`ALTER TABLE \`${tableName}\` AUTO_INCREMENT = ${maxId + 1}`);
    } catch (e) {
      console.warn(`    (auto_increment ayarı atlandı: ${e.message})`);
    }
  }
  console.log(`  ✓ ${name}: ${rows.length} kayıt kopyalandı`);
}

async function main() {
  console.log('→ Kaynak (Postgres) bağlantısı test ediliyor...');
  await sourceSeq.authenticate();
  console.log('✓ Kaynak bağlandı.');

  console.log('→ Hedef (MySQL) bağlantısı test ediliyor...');
  await targetSeq.authenticate();
  console.log('✓ Hedef bağlandı.');

  console.log('→ Kaynak modelleri yükleniyor...');
  const sourceModels = loadModels(sourceSeq);

  console.log('→ Hedef modelleri yükleniyor ve şema oluşturuluyor (sync)...');
  const targetModels = loadModels(targetSeq);
  await targetSeq.sync({ alter: false }); // İlk kez: tabloları oluştur
  console.log('✓ Hedef şema hazır.');

  console.log('→ Veriler kopyalanıyor (FK sırası):');
  // FK kısıtlarını geçici kapat (MySQL)
  await targetSeq.query('SET FOREIGN_KEY_CHECKS=0');
  try {
    for (const name of ORDER) {
      await copyTable(name, sourceModels, targetModels);
    }
  } finally {
    await targetSeq.query('SET FOREIGN_KEY_CHECKS=1');
  }

  console.log('\n→ Sayım kontrolü:');
  for (const name of ORDER) {
    const S = sourceModels[name];
    const T = targetModels[name];
    if (!S || !T) continue;
    const [sc, tc] = await Promise.all([S.count(), T.count()]);
    const flag = sc === tc ? '✓' : '✗';
    console.log(`  ${flag} ${name}: kaynak=${sc}, hedef=${tc}`);
  }

  await sourceSeq.close();
  await targetSeq.close();
  console.log('\n✔ Migration tamamlandı.');
}

main().catch(err => {
  console.error('✖ Migration hatası:', err);
  process.exit(1);
});
