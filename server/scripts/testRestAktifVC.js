process.env.EINVOICE_SENDER_VKN = '29357033844';
process.env.EINVOICE_SENDER_TITLE = 'DEMO_AKTF DEMO_AKTF';
process.env.EINVOICE_VAT_RATE = '20';
process.env.EINVOICE_SENDER_TAX_OFFICE = 'Test VD';
process.env.EINVOICE_SENDER_ADDRESS = 'Demo Adres';
process.env.EINVOICE_SENDER_CITY = 'Mersin';
process.env.EINVOICE_SENDER_DISTRICT = 'Yenisehir';
process.env.EINVOICE_SENDER_POSTCODE = '33000';
process.env.EINVOICE_SENDER_EMAIL = 'demo@example.com';
process.env.EINVOICE_SENDER_PHONE = '+905555555555';

const { buildInvoiceXML, buildInvoiceId } = require('../services/einvoiceService');
const { v4 } = require('uuid');
const https = require('https');
const { URL: NodeURL } = require('url');

const order = {
  id: Math.floor(Math.random() * 900000 + 100000),
  invoice_type: 'bireysel',
  billing_first_name: 'Test',
  billing_last_name: 'Alici',
  billing_tckn: '11111111111',
  billing_email: 'test@example.com',
  billing_phone: '+905555555555',
  billing_address: { address: 'Demo', district: 'Yenisehir', city: 'Mersin', postcode: '33000' },
  delivery_address: 'Demo',
  items: [{ name: 'TEST', quantity: 1, price: 120, product: { name: 'TEST', price: 120 } }],
  total_amount: 120,
};
const uuid = v4();
const invoiceId = buildInvoiceId(order.id);
const xml = buildInvoiceXML({ order, invoiceId, uuid, isEarchive: true });

console.log('UUID:', uuid);
console.log('InvoiceId:', invoiceId);

function call(p, body) {
  return new Promise((res) => {
    const u = new NodeURL('https://portaltest.aktifdonusum.com/edonusum' + p);
    const payload = Buffer.from(JSON.stringify(body));
    const r = https.request({
      method: 'POST', hostname: u.hostname, path: u.pathname,
      headers: {
        Accept: 'application/json', 'Content-Type': 'application/json',
        'Accept-Language': 'tr-TR',
        username: 'admin_008712', password: 'Ohs&hi8d',
        'Content-Length': payload.length,
      },
    }, (resp) => {
      let b = ''; resp.on('data', (c) => b += c);
      resp.on('end', () => res({ status: resp.statusCode, body: b }));
    });
    r.on('error', (e) => res({ error: e.message }));
    r.write(payload); r.end();
  });
}

(async () => {
  const today = new Date().toISOString().slice(0, 10);
  const inputDoc = {
    base64XmlContent: Buffer.from(xml, 'utf8').toString('base64'),
    documentType: 'EARSIVFATURA',
    documentUUID: uuid,
    documentId: invoiceId,
    documentDate: today,
    sourceUrn: 'urn:mail:defaultgb@aktif.com.tr',
    destinationUrn: 'urn:mail:defaultpk@aktif.com.tr',
    destinationIdentifier: '',
    documentNoPrefix: 'AEA',
  };
  console.log('\n--- loadDocument ---');
  console.log(await call('/api/document/loadDocument', [inputDoc]));
  console.log('\n--- sendDocument ---');
  console.log(await call('/api/document/sendDocument', [inputDoc]));
})();
