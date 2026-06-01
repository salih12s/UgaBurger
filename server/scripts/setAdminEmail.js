/**
 * Admin kullanıcısının e-posta adresini Ugaburger33@gmail.com olarak günceller.
 * Bu sayede /forgot-password akışıyla şifre sıfırlama e-postası bu adrese gider.
 *
 * Kullanım:
 *   cd server
 *   node scripts/setAdminEmail.js
 *   (opsiyonel olarak farklı mail vermek için)
 *   node scripts/setAdminEmail.js baska@mail.com
 */
require('dotenv').config();
const sequelize = require('../config/db');
const { User } = require('../models');

const TARGET_EMAIL = (process.argv[2] || 'Ugaburger33@gmail.com').trim();

(async () => {
  try {
    await sequelize.authenticate();

    // Tek admin varsa onu güncelle, birden fazla varsa ilk admini güncelle.
    const admin = await User.findOne({ where: { role: 'admin' }, order: [['id', 'ASC']] });
    if (!admin) {
      console.error('❌ Admin kullanıcı bulunamadı. Önce seed çalıştırın.');
      process.exit(1);
    }

    // Aynı e-posta başka bir kullanıcıya aitse engelle
    const conflict = await User.findOne({ where: { email: TARGET_EMAIL } });
    if (conflict && conflict.id !== admin.id) {
      // Çakışan kullanıcıyı admin yapmak yerine, çakışanı temizleyip admine ata
      console.log(`⚠️  ${TARGET_EMAIL} başka kullanıcıya kayıtlı (id=${conflict.id}). O kullanıcının e-postasına _old eklenecek.`);
      conflict.email = `${conflict.email}.old_${Date.now()}`;
      await conflict.save();
    }

    const oldEmail = admin.email;
    admin.email = TARGET_EMAIL;
    await admin.save();

    console.log(`✅ Admin e-postası güncellendi:`);
    console.log(`   Eski: ${oldEmail}`);
    console.log(`   Yeni: ${admin.email}`);
    console.log(`\nArtık /login ekranındaki "Şifremi Unuttum" ile bu adrese sıfırlama maili gelecek.`);
    process.exit(0);
  } catch (err) {
    console.error('❌ Hata:', err.message);
    process.exit(1);
  }
})();
