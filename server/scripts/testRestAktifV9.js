/**
 * sendDocumentModel'a DOGRU body sekliyle (InputDocumentModel wrapper) test gonderim.
 */
const https = require('https');
const { URL } = require('url');
const { v4 } = require('uuid');

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
  const now = new Date();
  const issue = now.toISOString().slice(0, 19);
  const docDate = now.toISOString().slice(0, 10);
  const uuid = v4();
  const docId = `AEA${now.getFullYear()}${String(Date.now()).slice(-9)}`;

  // Spec gereği saticinin VKN'si supplier'da olmali. Demo hesap icin bilinen
  // ortak test VKN'leri varsayalim — supplier alanini bos da denedik, hatasi:
  // "isOk:false, message:null". Şimdi wrapper ile farklı VKN denemeleri.
  const candidates = [
    process.env.TEST_DEMO_VKN,           // env'den
    '1234567801',                         // klasik test VKN
    '0102365158',                         // canlı firmaya ait (TEST'te kabul etmeyebilir)
    '1111111111',
    '9999999999',
  ].filter(Boolean);

  for (const vkn of candidates) {
    const documentModel = {
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
        vknTckn: vkn,
        title: 'DEMO SATICI',
        cityName: 'Mersin',
        citySubdivisionName: 'Yenisehir',
        countryName: 'Türkiye',
      },
      sellerSupplier: {
        vknTckn: vkn,
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

    const wrapper = {
      documentType: 'EARSIVFATURA',
      documentUuid: uuid,
      documentId: docId,
      documentDate: docDate,
      sourceUrn: documentModel.sourceUrn,
      destinationUrn: documentModel.destinationUrn,
      destinationIdentifier: '',
      documentModel,
    };

    const r = await call('POST', '/api/document/sendDocumentModel', [wrapper]);
    console.log(`\n[supplier VKN=${vkn}]  status=${r.status}`);
    console.log(r.body);
  }
})();
