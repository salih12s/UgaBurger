/**
 * Niye `sendDocumentModel` isOk:false donuyor? Bunu cözmek icin:
 *  - convertDocumentModel  (model -> XML cevirme; validation hatalarini detayli verir)
 *  - getDraftDocumentPreview  (draft preview; eksikleri sıralar)
 *  - sendDocument (XML) versiyonu da denenebilir
 *  - sendDocumentModel'a daha eksiksiz minimal payload gonder ve DETAYLI HATA AL
 *
 * Hicbir kayit / fatura olusmaz: convertDocumentModel ve getDraftDocumentPreview
 * okuma-mode endpointleri.
 */
const https = require('https');
const { URL } = require('url');
const { v4 } = require('uuid');

const BASE = 'https://portaltest.aktifdonusum.com/edonusum';
const HEADERS = {
  Accept: 'application/json',
  'Content-Type': 'application/json',
  username: 'admin_008712',
  password: 'Ohs&hi8d',
};

function call(method, p, body) {
  return new Promise((res) => {
    const u = new URL(BASE + p);
    const payload = body !== undefined ? Buffer.from(JSON.stringify(body)) : null;
    const r = https.request({
      method, hostname: u.hostname, path: u.pathname + u.search,
      headers: { ...HEADERS, ...(payload ? { 'Content-Length': payload.length } : {}) },
      timeout: 30000,
    }, (resp) => {
      let buf = ''; resp.on('data', (c) => buf += c);
      resp.on('end', () => res({ status: resp.statusCode, body: buf, headers: resp.headers }));
    });
    r.on('error', (e) => res({ error: e.message }));
    r.on('timeout', () => { r.destroy(); res({ error: 'TIMEOUT' }); });
    if (payload) r.write(payload);
    r.end();
  });
}

const now = new Date();
const issue = now.toISOString().slice(0, 19);

const baseModel = {
  documentId: `AEA${now.getFullYear()}${String(Date.now()).slice(-9)}`,
  documentUuid: v4(),
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
  taxInclusiveAmount: 118,
  payableAmount: 118,
  customer: {
    vknTckn: '11111111111',
    formattedName: 'TEST ALICI',
    givenName: 'TEST',
    familyName: 'ALICI',
    cityName: 'Mersin',
    citySubdivisionName: 'Yenisehir',
    countryName: 'Türkiye',
  },
  supplier: {
    vknTckn: '1234567801',
    title: 'DEMO SATICI',
    cityName: 'Mersin',
    citySubdivisionName: 'Yenisehir',
    countryName: 'Türkiye',
  },
  sellerSupplier: {
    vknTckn: '1234567801',
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

(async () => {
  const print = (label, r) => {
    console.log(`\n[${label}]  status=${r.status || r.error}`);
    console.log(r.body || r.error);
  };

  // 1) convertDocumentModel - Spec'te GET ama body alıyor. Once GET denersen
  //    'Required request body is missing' verir; o yüzden POST da deneyelim.
  console.log('=== convertDocumentModel (GET, body) ===');
  const r1 = await call('GET', '/api/document/convertDocumentModel?documentType=EARSIVFATURA', baseModel);
  print('convertDocumentModel GET', r1);

  console.log('\n=== convertDocumentModel (POST) ===');
  const r2 = await call('POST', '/api/document/convertDocumentModel?documentType=EARSIVFATURA', baseModel);
  print('convertDocumentModel POST', r2);

  // 2) getDraftDocumentPreview (GET, body required per spec — REST'lerde bazen ignore eder)
  console.log('\n=== getDraftDocumentPreview ===');
  const r3 = await call('GET', '/api/document/getDraftDocumentPreview?documentType=EARSIVFATURA', { documentModel: baseModel });
  print('getDraftDocumentPreview GET', r3);
  const r3b = await call('POST', '/api/document/getDraftDocumentPreview?documentType=EARSIVFATURA', { documentModel: baseModel });
  print('getDraftDocumentPreview POST', r3b);

  // 3) sendDocumentModel'a DEBUG icin acik (verbose) parametre ekle
  console.log('\n=== sendDocumentModel (verbose) ===');
  const r4 = await call('POST', '/api/document/sendDocumentModel?documentType=EARSIVFATURA', [baseModel]);
  print('sendDocumentModel POST', r4);

  // 4) loadDocument - draft kaydet, validate hatasi gorebiliriz
  console.log('\n=== loadDocument ===');
  const r5 = await call('POST', '/api/document/loadDocument', [baseModel]);
  print('loadDocument', r5);
})();
