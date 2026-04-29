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
const fs = require('fs');
const path = require('path');
const { URL: NodeURL } = require('url');

const order = {
  id: 999001,
  invoice_type: 'bireysel',
  billing_first_name: 'Test', billing_last_name: 'Alici', billing_tckn: '11111111111',
  billing_email: 'test@example.com', billing_phone: '+905555555555',
  billing_address: { address: 'Demo', district: 'Yenisehir', city: 'Mersin', postcode: '33000' },
  delivery_address: 'Demo',
  items: [{ name: 'TEST URUN', quantity: 1, price: 120, product: { name: 'TEST URUN', price: 120 } }],
  total_amount: 120,
};
const uuid = v4();
const invoiceId = buildInvoiceId(order.id);
const xml = buildInvoiceXML({ order, invoiceId, uuid, isEarchive: true });

function call(method, p, body) {
  return new Promise((res) => {
    const u = new NodeURL('https://portaltest.aktifdonusum.com/edonusum' + p);
    const payload = body ? Buffer.from(JSON.stringify(body)) : null;
    const r = https.request({
      method, hostname: u.hostname, path: u.pathname + u.search,
      headers: {
        Accept: '*/*', 'Content-Type': 'application/json',
        username: 'admin_008712', password: 'Ohs&hi8d',
        ...(payload ? { 'Content-Length': payload.length } : {}),
      },
    }, (resp) => {
      let chunks = [];
      resp.on('data', (c) => chunks.push(c));
      resp.on('end', () => res({ status: resp.statusCode, body: Buffer.concat(chunks).toString('utf8') }));
    });
    r.on('error', (e) => res({ error: e.message }));
    if (payload) r.write(payload);
    r.end();
  });
}

(async () => {
  console.log('UUID:', uuid, 'InvoiceId:', invoiceId);

  // 1) HTML preview
  const htmlReq = { addDraftWatermark: false, previewType: 'HTML', xmlContent: xml };
  const htmlR = await call('POST', '/api/document/getDraftDocumentPreview?documentType=EARSIVFATURA', htmlReq);
  console.log('\n[HTML preview] status=', htmlR.status, 'len=', htmlR.body?.length);
  try {
    const j = JSON.parse(htmlR.body);
    console.log('isOk:', j.isOk, 'message:', j.message, 'contentLen:', j.content?.length);
    if (j.content) {
      const html = Buffer.from(j.content, 'base64').toString('utf8');
      const out = path.join(__dirname, 'preview.html');
      fs.writeFileSync(out, html);
      console.log('-> kaydedildi:', out, 'first300:', html.slice(0, 300).replace(/\s+/g, ' '));
    }
  } catch (e) { console.log('parse err, body[0..400]:', htmlR.body.slice(0, 400)); }

  // 2) PDF preview
  const pdfReq = { addDraftWatermark: false, previewType: 'PDF', xmlContent: xml };
  const pdfR = await call('POST', '/api/document/getDraftDocumentPreview?documentType=EARSIVFATURA', pdfReq);
  console.log('\n[PDF preview] status=', pdfR.status, 'len=', pdfR.body?.length);
  try {
    const j = JSON.parse(pdfR.body);
    console.log('isOk:', j.isOk, 'message:', j.message, 'contentLen:', j.content?.length);
    if (j.content) {
      const out = path.join(__dirname, 'preview.pdf');
      fs.writeFileSync(out, Buffer.from(j.content, 'base64'));
      console.log('-> kaydedildi:', out, 'bytes:', fs.statSync(out).size);
    }
  } catch (e) { console.log('parse err, body[0..400]:', pdfR.body.slice(0, 400)); }
})();
