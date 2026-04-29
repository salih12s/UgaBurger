/**
 * Demo VKN'yi sistemden çek + kontör/gönderim limitlerini gerçekten dene.
 *
 * 1) gibUserListAsJson zip'i indir, içindeki JSON'u parse et -> demo PK/VKN'ler.
 * 2) "Profile / customer info" tarzı GET endpoint var mı tara.
 * 3) (Opsiyonel) Belirsiz bir VKN ile sendDocumentModel'a 1 fatura gönderip
 *    server'in gerçek hata mesajini al (kontor / yetki / VKN dogrulama).
 *    --send flag verilmedikçe ÇAĞIRMAZ.
 */
const fs = require('fs');
const path = require('path');
const https = require('https');
const zlib = require('zlib');
const { URL } = require('url');

const USERNAME = process.env.EINVOICE_USERNAME || 'admin_008712';
const PASSWORD = process.env.EINVOICE_PASSWORD || 'Ohs&hi8d';
const ORIGIN = 'https://portaltest.aktifdonusum.com';
const BASE = ORIGIN + '/edonusum';

function req(method, p, body) {
  return new Promise((res) => {
    const u = new URL(BASE + p);
    const payload = body ? Buffer.from(JSON.stringify(body)) : null;
    const r = https.request({
      method, hostname: u.hostname, path: u.pathname + u.search,
      headers: {
        Accept: 'application/json',
        username: USERNAME, password: PASSWORD,
        ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': payload.length } : {}),
      }, timeout: 30000,
    }, (resp) => {
      const chunks = [];
      resp.on('data', (c) => chunks.push(c));
      resp.on('end', () => res({ status: resp.statusCode, buffer: Buffer.concat(chunks) }));
    });
    r.on('error', (e) => res({ error: e.message }));
    r.on('timeout', () => { r.destroy(); res({ error: 'TIMEOUT' }); });
    if (payload) r.write(payload);
    r.end();
  });
}

(async () => {
  // 1) gibUserListAsJson -> bu, Turkiye'deki tum e-fatura kayitlarinin global
  //    listesi (1.4MB zip). Demo hesap VKN'sini bulmaya yaramaz — atlandi.
  console.log('=== 1) gibUserListAsJson  (atlandi: global liste, demo VKN icin yararsiz) ===');

  // 2) Profile / customer GET endpoint taramasi
  console.log('\n=== 2) Profile taramasi ===');
  const candidates = [
    '/api/distributor/getCustomerList',
    '/api/distributor/customerList',
    '/api/document/customer',
    '/api/document/customerInfo',
    '/api/document/getCustomer',
    '/api/document/getProfile',
    '/api/document/profile',
    '/api/document/myInfo',
    '/api/document/whoami',
    '/api/user/me',
    '/api/account/info',
    '/api/account/me',
  ];
  for (const p of candidates) {
    const r = await req('GET', p);
    const txt = r.buffer ? r.buffer.toString('utf8').slice(0, 200) : r.error;
    console.log(`  ${r.status || r.error}  ${p}  -> ${txt.replace(/\s+/g, ' ').slice(0, 150)}`);
  }

  // 3) Kontör doludur ama -10 — minik fatura gönderim denemesi (--send)
  if (process.argv.includes('--send')) {
    console.log('\n=== 3) sendDocumentModel deneme (e-arsiv, dummy customer) ===');
    const { v4 } = require('uuid');
    const uuid = v4();
    const now = new Date();
    const issue = now.toISOString().slice(0, 19);
    const docId = `AEA${now.getFullYear()}${String(Date.now()).slice(-9)}`;
    const dummyVkn = process.env.TEST_DEMO_VKN || '1234567890';
    const model = {
      documentId: docId,
      documentUuid: uuid,
      issueDateTime: issue,
      documentCurrencyCode: 'TRY',
      documentTypeCode: 'SATIS',
      profileId: 'EARSIVFATURA',
      invoiceType: 'EARSIVFATURA',
      sendingType: 'KAGIT',
      sourceUrn: 'urn:mail:defaultgb@aktif.com.tr',
      destinationUrn: 'urn:mail:defaultpk@aktif.com.tr',
      deliveryType: 'CARRIER',
      okcSerialNumber: '',
      lineExtensionAmount: 100,
      allowanceTotalAmount: 0,
      taxExclusiveAmount: 100,
      taxInclusiveAmount: 110,
      payableAmount: 110,
      customer: {
        vknTckn: '11111111111',
        formattedName: 'TEST MUSTERI',
        givenName: 'TEST',
        familyName: 'MUSTERI',
        cityName: 'Mersin',
        citySubdivisionName: 'Yenisehir',
        countryName: 'Türkiye',
      },
      supplier: {
        vknTckn: dummyVkn,
        title: 'DEMO SATICI',
        cityName: 'Mersin',
        citySubdivisionName: 'Yenisehir',
        countryName: 'Türkiye',
      },
      sellerSupplier: {
        vknTckn: dummyVkn,
        cityName: 'Mersin',
        citySubdivisionName: 'Yenisehir',
        countryName: 'Türkiye',
      },
      lines: [{
        lineId: '1', lineNumber: '1', itemName: 'TEST ÜRÜN',
        quantity: 1, unit: 'C62', unitPrice: 100, lineExtensionAmount: 100,
        outstandingQuantity: 0, outstandingReason: '',
      }],
    };
    const r3 = await req('POST', '/api/document/sendDocumentModel', [model]);
    console.log('status:', r3.status);
    console.log('body  :', r3.buffer ? r3.buffer.toString('utf8').slice(0, 1500) : r3.error);
  } else {
    console.log('\n(Fatura denemesi icin: node ' + path.basename(__filename) + ' --send)');
  }
})();
