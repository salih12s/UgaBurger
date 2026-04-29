/**
 * XML üretim testi (SOAP'a gitmeden).
 * Mevcut veritabanındaki bir sipariş için UBL-TR fatura XML'i oluşturur
 * ve server/scripts/preview-invoice.xml dosyasına kaydeder.
 *
 * Kullanım:
 *   node server/scripts/previewInvoiceXml.js <ORDER_ID>
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { sequelize, Order, OrderItem, Product } = require('../models');
const { buildInvoiceXML, buildInvoiceId } = require('../services/einvoiceService');

(async () => {
  try {
    const orderId = parseInt(process.argv[2], 10);
    if (!orderId) {
      console.log('Kullanım: node server/scripts/previewInvoiceXml.js <ORDER_ID>');
      process.exit(1);
    }

    const order = await Order.findByPk(orderId, {
      include: [{ model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] }],
    });
    if (!order) {
      console.error(`Sipariş #${orderId} bulunamadı`);
      process.exit(1);
    }

    const orderJson = order.toJSON();
    orderJson.items = order.items.map(i => i.toJSON());

    const uuid = uuidv4();
    const invoiceId = buildInvoiceId(order.id);
    const isKurumsal = orderJson.invoice_type === 'kurumsal';
    const isEarchive = !isKurumsal; // E-arşiv varsay

    const xml = buildInvoiceXML({ order: orderJson, invoiceId, uuid, isEarchive });

    const outPath = path.join(__dirname, 'preview-invoice.xml');
    fs.writeFileSync(outPath, xml);

    console.log('\n✅ XML üretildi.');
    console.log(`   Fatura No   : ${invoiceId}`);
    console.log(`   UUID        : ${uuid}`);
    console.log(`   Fatura türü : ${isEarchive ? 'E-ARŞİV' : 'E-FATURA'}`);
    console.log(`   Müşteri     : ${orderJson.invoice_type} - ${isKurumsal ? orderJson.billing_company_title : (orderJson.billing_first_name + ' ' + orderJson.billing_last_name)}`);
    console.log(`   E-posta     : ${orderJson.billing_email || '(yok)'}`);
    console.log(`   Tutar       : ${orderJson.total_amount} TL`);
    console.log(`   Dosya       : ${outPath}`);
    console.log(`\nXML içeriği kontrolü için dosyayı VS Code'da aç:`);
    console.log(`   code "${outPath}"\n`);
  } catch (err) {
    console.error('Hata:', err.message);
  } finally {
    try { await sequelize.close(); } catch {}
    process.exit(0);
  }
})();
