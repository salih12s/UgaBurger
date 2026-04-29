/**
 * Son denemeler: Accept-Language header, alternatif endpointler.
 */
const https = require('https');
const { URL } = require('url');
const { v4 } = require('uuid');

const BASE = 'https://portaltest.aktifdonusum.com/edonusum';

function call(method, p, body, extraHeaders = {}) {
  return new Promise((res) => {
    const u = new URL(BASE + p);
    const payload = body ? Buffer.from(JSON.stringify(body)) : null;
    const r = https.request({
      method, hostname: u.hostname, path: u.pathname + u.search,
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
        username: 'admin_008712',
        password: 'Ohs&hi8d',
        ...extraHeaders,
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
  const now = new Date();
  const issueDateTime = now.toISOString().slice(0, 19);
  const documentDate = now.toISOString().slice(0, 10);
  const uuid = v4();
  const documentId = `AEA${now.getFullYear()}${String(Date.now()).slice(-9)}`;

  // Tam dolu DocumentModel
  const documentModel = {
    documentId,
    documentUuid: uuid,
    issueDateTime,
    documentCurrencyCode: 'TRY',
    documentTypeCode: 'SATIS',
    profileId: 'EARSIVFATURA',
    invoiceType: 'EARSIVFATURA',
    sendingType: 'KAGIT',
    sourceUrn: 'urn:mail:defaultgb@aktif.com.tr',
    destinationUrn: 'urn:mail:defaultpk@aktif.com.tr',
    deliveryType: 'CARRIER',
    okcSerialNumber: 'TEST',
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
      cityName: 'Mersin', citySubdivisionName: 'Yenisehir', countryName: 'Türkiye',
    },
    supplier: {
      vknTckn: '1234567801',
      title: 'DEMO SATICI',
      cityName: 'Mersin', citySubdivisionName: 'Yenisehir', countryName: 'Türkiye',
    },
    sellerSupplier: {
      vknTckn: '1234567801',
      cityName: 'Mersin', citySubdivisionName: 'Yenisehir', countryName: 'Türkiye',
    },
    lines: [{
      lineId: '1', lineNumber: '1', itemName: 'TEST',
      quantity: 1, unit: 'C62', unitPrice: 100, lineExtensionAmount: 100,
      outstandingQuantity: 0, outstandingReason: '',
    }],
  };

  const inputDocumentModel = {
    documentType: 'EARSIVFATURA',
    documentUuid: uuid,
    documentId,
    documentDate,
    sourceUrn: documentModel.sourceUrn,
    destinationUrn: documentModel.destinationUrn,
    destinationIdentifier: '',
    documentModel,
  };

  // 1) Accept-Language tr-TR
  console.log('\n=== 1) Accept-Language: tr-TR ===');
  const r1 = await call('POST', '/api/document/sendDocumentModel', [inputDocumentModel], { 'Accept-Language': 'tr-TR' });
  console.log(r1.status, r1.body);

  // 2) Accept-Language en
  console.log('\n=== 2) Accept-Language: en ===');
  const r2 = await call('POST', '/api/document/sendDocumentModel', [inputDocumentModel], { 'Accept-Language': 'en' });
  console.log(r2.status, r2.body);

  // 3) sendDocumentWithoutId
  console.log('\n=== 3) sendDocumentWithoutId ===');
  const wrapperWithout = { ...inputDocumentModel };
  delete wrapperWithout.documentId;
  delete wrapperWithout.documentModel.documentId;
  const r3 = await call('POST', '/api/document/sendDocumentWithoutId', [wrapperWithout]);
  console.log(r3.status, r3.body);

  // 4) loadDocument once -> sonra queryLoadDocument
  console.log('\n=== 4) loadDocument ===');
  const r4 = await call('POST', '/api/document/loadDocument', [inputDocumentModel]);
  console.log(r4.status, r4.body);

  // 5) queryLoadDocument with documentUuid
  console.log('\n=== 5) queryLoadDocument ===');
  const r5 = await call('GET', `/api/document/queryLoadDocument?documentUuid=${uuid}&documentType=EARSIVFATURA`);
  console.log(r5.status, r5.body);

  // 6) phoneNumberVerification (yan endpoint, REST tarafinda gercekten yetki var mi?)
  console.log('\n=== 6) Acik bir RW endpoint testi: phoneNumberVerification ===');
  const r6 = await call('POST', '/api/document/phoneNumberVerification', { phoneNumber: '+905555555555' });
  console.log(r6.status, r6.body);

  // 7) Yetki testi: 401 vs 200 farki -> yanlis sifre dene
  console.log('\n=== 7) Yanlis sifre ile sendDocumentModel (auth ayrimi) ===');
  const r7 = await call('POST', '/api/document/sendDocumentModel', [inputDocumentModel], { password: 'WRONG' });
  console.log(r7.status, r7.body);
})();
