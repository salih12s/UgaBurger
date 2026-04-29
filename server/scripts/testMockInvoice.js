/**
 * MOCK fatura gönderim testi.
 * Kullanım: node server/scripts/testMockInvoice.js [ORDER_ID] [EMAIL_OVERRIDE]
 * ORDER_ID verilmezse son sipariş seçilir.
 * EMAIL_OVERRIDE verilirse o adrese gönderir (test için).
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { sequelize, Order, OrderItem, Product } = require('../models');
const { sendInvoiceForOrder } = require('../services/einvoiceService');

(async () => {
  try {
    let orderId = parseInt(process.argv[2], 10);
    const emailOverride = process.argv[3];

    let order;
    if (orderId) {
      order = await Order.findByPk(orderId, {
        include: [{ model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] }],
      });
    } else {
      order = await Order.findOne({
        order: [['created_at', 'DESC']],
        include: [{ model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] }],
      });
      orderId = order?.id;
    }

    if (!order) {
      console.error('Sipariş bulunamadı. Önce bir sipariş oluştur.');
      process.exit(1);
    }

    console.log(`\n📋 Sipariş #${order.id}`);
    console.log(`   Toplam       : ${order.total_amount} TL`);
    console.log(`   Fatura türü  : ${order.invoice_type || '-'}`);
    console.log(`   E-posta      : ${order.billing_email || '(BOŞ)'}`);
    console.log(`   Ürün sayısı  : ${order.items?.length || 0}`);

    if (emailOverride) {
      console.log(`\n✏️  E-posta geçersiz kılındı: ${emailOverride}`);
      order.billing_email = emailOverride;
    }

    if (!order.billing_email) {
      console.error('\n❌ billing_email boş. EMAIL_OVERRIDE parametresi ver veya siparişte faturayı doldurulmuş şekilde oluştur.');
      console.error('   Örnek: node server/scripts/testMockInvoice.js ' + order.id + ' senin-mailin@gmail.com');
      process.exit(1);
    }

    console.log('\n📤 Fatura gönderiliyor (MOCK mode)...');
    const result = await sendInvoiceForOrder(order);
    console.log('\n=== SONUÇ ===');
    console.log(JSON.stringify(result, null, 2));

    if (result.status === 'sent') {
      console.log(`\n✅ BAŞARILI! ${order.billing_email} adresine test faturası gönderildi.`);
      console.log('   Gelen kutusunu kontrol et (spam klasörünü de).');

      await order.update({
        einvoice_uuid: result.uuid,
        einvoice_status: 'sent',
        einvoice_sent_at: new Date(),
      });
    } else {
      console.log('\n❌ BAŞARISIZ:', result.error);
    }
  } catch (err) {
    console.error('\n💥 HATA:', err.message);
    console.error(err.stack);
  } finally {
    try { await sequelize.close(); } catch {}
    process.exit(0);
  }
})();
