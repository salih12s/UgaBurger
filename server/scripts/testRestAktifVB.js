/**
 * UBL XML uretip /api/document/loadDocument ve /sendDocument'a gerçek
 * InputDocument body sekliyle yolla, hata mesajini incele.
 */
const https = require('https');
const { URL } = require('url');
const { v4 } = require('uuid');

process.env.EINVOICE_VAT_RATE = '18';
process.env.EINVOICE_SENDER_VKN = '1234567801';
process.env.EINVOICE_SENDER_TITLE = 'DEMO SATICI';
process.env.EINVOICE_SENDER_TAX_OFFICE = 'Test VD';
process.env.EINVOICE_SENDER_ADDRESS = 'Demo Adres';
process.env.EINVOICE_SENDER_CITY = 'Mersin';
process.env.EINVOICE_SENDER_DISTRICT = 'Yenisehir';
process.env.EINVOICE_SENDER_POSTCODE = '33000';
process.env.EINVOICE_SENDER_EMAIL = 'demo@example.com';
process.env.EINVOICE_SENDER_PHONE = '+905555555555';

const { buildInvoiceXML, buildInvoiceId } = require('../services/einvoiceService');

const BASE = 'https://portaltest.aktifdonusum.com/edonusum';

function call(method, p, body) {
  return new Promise((res) => {
    const u = new URL(BASE + p);
    const payload = body ? Buffer.from(JSON.stringify(body)) : null;
    const r = https.request({
      method, hostname: u.hostname, path: u.pathname + u.search,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        'Accept-Language': 'tr-TR',
        username: 'admin_008712',
        password: 'Ohs&hi8d',
        ...(payload ? { 'Content-Length': payload.length } : {}),
      },
      timeout: 30000,
    }, (resp) => {
      let buf = ''; resp.on('data', (c) => buf += c);
      resp.on('end', () => res({ status: resp.statusCode, body: buf }));
    });
    r.on('error', (e) => res({ error: e.message }));
    r.on('timeout', () => { r.destroy(); res({ error: 'TIMEOUT' }); });
    if (payload) r.write(payload);
    r.end();
  });
}

(async () => {
  const order = {
    id: 9999,
    invoice_type: 'bireysel',
    billing_first_name: 'Test',
    billing_last_name: 'Alici',
    billing_tckn: '11111111111',
    billing_email: 'test@example.com',
    billing_phone: '+905555555555',
    billing_address: { address: 'Demo Adres', district: 'Yenisehir', city: 'Mersin', postcode: '33000' },
    delivery_address: 'Demo Adres',
    items: [{ name: 'TEST URUN', quantity: 1, price: 100, product: { name: 'TEST URUN', price: 100 } }],
    total_amount: 100,
  };
  const uuid = v4();
  const invoiceId = buildInvoiceId(order.id);
  const xml = buildInvoiceXML({ order, invoiceId, uuid, isEarchive: true });

  console.log('=== Uretilen XML (ilk 1500 char) ===');
  console.log(xml.slice(0, 1500));
  console.log('...');
  console.log('Toplam uzunluk:', xml.length);

  const documentDate = (new Date()).toISOString().slice(0, 10);
  const inputDocument = {
    base64XmlContent: Buffer.from(xml, 'utf8').toString('base64'),
    documentType: 'EARSIVFATURA',
    documentUUID: uuid,
    documentId: invoiceId,
    documentDate,
    sourceUrn: 'urn:mail:defaultgb@aktif.com.tr',
    destinationUrn: 'urn:mail:defaultpk@aktif.com.tr',
    destinationIdentifier: '',
    documentNoPrefix: 'AEA',
    smmNote: 'TEST',
  };

  console.log('\n=== loadDocument (XML draft) ===');
  const r1 = await call('POST', '/api/document/loadDocument', [inputDocument]);
  console.log(r1.status, r1.body);

  console.log('\n=== sendDocument (XML) ===');
  const r2 = await call('POST', '/api/document/sendDocument', [inputDocument]);
  console.log(r2.status, r2.body);
})();
