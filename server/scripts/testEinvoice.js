/**
 * E-Fatura / E-Arşiv bağlantı ve canlı test script'i
 * Kullanım:
 *   node server/scripts/testEinvoice.js              -> bağlantı + kontör testi
 *   node server/scripts/testEinvoice.js send <ORDER_ID> -> gerçek sipariş için fatura gönder
 */
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { sequelize } = require('../models');
const { Order, OrderItem, Product } = require('../models');
const {
  getCreditBalance,
  checkEFaturaPayer,
  sendInvoiceForOrder,
  buildInvoiceXML,
  buildInvoiceId,
} = require('../services/einvoiceService');

const log = (label, obj) => {
  console.log(`\n=== ${label} ===`);
  console.log(typeof obj === 'string' ? obj : JSON.stringify(obj, null, 2));
};

async function testConnection() {
  log('ENV', {
    provider: process.env.EINVOICE_PROVIDER,
    username: process.env.EINVOICE_USERNAME,
    password: process.env.EINVOICE_PASSWORD ? '***' + process.env.EINVOICE_PASSWORD.slice(-2) : 'YOK',
    invoiceWsdl: process.env.EINVOICE_WSDL_URL,
    earchiveWsdl: process.env.EARCHIVE_WSDL_URL,
    testMode: process.env.EINVOICE_TEST_MODE,
    senderVkn: process.env.EINVOICE_SENDER_VKN,
  });

  // 1) Kontör bakiyesi
  console.log('\n[1/3] Kontör bakiyesi sorgulanıyor...');
  const bal = await getCreditBalance();
  log('KONTÖR', bal);

  // 2) Kendi VKN'ni e-fatura mükellefi olarak sorgula
  console.log('\n[2/3] E-Fatura mükellefi sorgusu (kendi VKN)...');
  const isPayer = await checkEFaturaPayer(process.env.EINVOICE_SENDER_VKN);
  log('isEFaturaUser (kendi VKN)', { identifier: process.env.EINVOICE_SENDER_VKN, isPayer });

  // 3) Rastgele bir VKN ile kontrol (örnek)
  console.log('\n[3/3] Bilinen büyük bir VKN ile test (Migros: 6140039410)...');
  const migros = await checkEFaturaPayer('6140039410');
  log('isEFaturaUser (Migros)', { identifier: '6140039410', isPayer: migros });
}

async function sendTest(orderId) {
  console.log(`\nSipariş #${orderId} için fatura gönderimi başlatılıyor...`);

  const order = await Order.findByPk(orderId, {
    include: [{ model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] }],
  });

  if (!order) {
    console.error('Sipariş bulunamadı!');
    return;
  }

  log('SİPARİŞ', {
    id: order.id,
    total: order.total_amount,
    invoice_type: order.invoice_type,
    billing_email: order.billing_email,
    billing_phone: order.billing_phone,
    billing_tckn: order.billing_tckn,
    billing_tax_number: order.billing_tax_number,
    billing_company_title: order.billing_company_title,
    billing_first_name: order.billing_first_name,
    billing_last_name: order.billing_last_name,
    items_count: order.items?.length,
  });

  if (!order.billing_email) {
    console.warn('\n⚠️  UYARI: billing_email boş! Fatura müşteri e-postasına gönderilemeyecek.');
    console.warn('   Fatura gönderilecek ama e-posta iletilmeyecek. Devam ediyorum...\n');
  }

  // XML preview
  const uuid = require('uuid').v4();
  const invoiceId = buildInvoiceId(order.id);
  const xml = buildInvoiceXML({ order: order.toJSON ? { ...order.toJSON(), items: order.items.map(i => i.toJSON()) } : order, invoiceId, uuid, isEarchive: true });
  require('fs').writeFileSync(path.join(__dirname, 'last-invoice.xml'), xml);
  console.log(`\n📄 XML önizleme kaydedildi: server/scripts/last-invoice.xml`);

  // Gerçek gönderim
  const result = await sendInvoiceForOrder(order);
  log('SONUÇ', result);

  if (result.status === 'sent') {
    console.log('\n✅ BAŞARILI! Fatura gönderildi.');
    console.log(`   UUID: ${result.uuid}`);
    console.log(`   Tür: ${result.isEarchive ? 'E-ARŞİV' : 'E-FATURA'}`);
    if (result.pdfUrl) console.log(`   PDF: ${result.pdfUrl}`);
    if (order.billing_email) {
      console.log(`   📧 Fatura ${order.billing_email} adresine sağlayıcı tarafından iletilecek.`);
    }

    await order.update({
      einvoice_uuid: result.uuid,
      einvoice_status: 'sent',
      einvoice_pdf_url: result.pdfUrl || null,
      einvoice_sent_at: new Date(),
    });
  } else {
    console.log('\n❌ BAŞARISIZ!');
    console.log(`   Hata: ${result.error || 'Bilinmiyor'}`);
    console.log('   Ham yanıt yukarıda. Lütfen bunu paylaş ki parser düzeltilebilsin.');
  }
}

(async () => {
  try {
    const [, , cmd, arg] = process.argv;
    if (cmd === 'send' && arg) {
      await sendTest(parseInt(arg, 10));
    } else {
      await testConnection();
    }
  } catch (err) {
    console.error('\n💥 HATA:', err.message);
    if (err.root) console.error('SOAP root:', JSON.stringify(err.root, null, 2));
    if (err.body) console.error('SOAP body:', err.body.slice(0, 2000));
  } finally {
    try { await sequelize.close(); } catch {}
    process.exit(0);
  }
})();
