/**
 * E-Fatura / E-Arşiv REST entegrasyonu (Aktif Dönüşüm).
 *
 * Spec : https://portaltest.aktifdonusum.com/edonusum/v2/api-docs (Swagger 2.0)
 * ReDoc: https://portaltest.aktifdonusum.com/edonusum/redoc.html
 *
 * Auth modeli: HTTP header'da plain `username` ve `password` (Basic değil).
 *
 * Bu modül SOAP modülüyle (`einvoiceService.js`) aynı public API'yi sunar:
 *   - sendInvoiceForOrder(order)
 *   - checkEFaturaPayer(vknTckn)
 *   - getCreditBalance()
 *   - getPrefixCodeList()  (yeni)
 *   - getUserAliasList()   (yeni)
 *
 * EINVOICE_API_MODE=rest ise einvoiceService.js bu modüle delege eder.
 */

const https = require('https');
const http = require('http');
const { URL } = require('url');
const { v4: uuidv4 } = require('uuid');
// XML uretimi mevcut SOAP modulundeki kanitlanmis fonksiyonu yeniden kullaniyoruz.
const { buildInvoiceXML } = require('./einvoiceService');

const cfg = () => ({
  baseUrl: (process.env.EINVOICE_REST_BASE_URL || 'https://portaltest.aktifdonusum.com/edonusum').replace(/\/$/, ''),
  username: process.env.EINVOICE_USERNAME,
  password: process.env.EINVOICE_PASSWORD,
  testMode: String(process.env.EINVOICE_TEST_MODE).toLowerCase() === 'true',
  vatRate: parseFloat(process.env.EINVOICE_VAT_RATE || '10'),
  prefix: process.env.EINVOICE_PREFIX || 'AEA',
  sourceUrn: process.env.EINVOICE_SOURCE_URN || 'urn:mail:defaultgb@aktif.com.tr',
  sender: {
    vkn: process.env.EINVOICE_SENDER_VKN,
    title: process.env.EINVOICE_SENDER_TITLE,
    taxOffice: process.env.EINVOICE_SENDER_TAX_OFFICE,
    address: process.env.EINVOICE_SENDER_ADDRESS,
    city: process.env.EINVOICE_SENDER_CITY || 'Mersin',
    district: process.env.EINVOICE_SENDER_DISTRICT || 'Yenisehir',
    postcode: process.env.EINVOICE_SENDER_POSTCODE || '33000',
    email: process.env.EINVOICE_SENDER_EMAIL || '',
    phone: process.env.EINVOICE_SENDER_PHONE || '',
  },
});

function request(method, path, { query, body } = {}) {
  const c = cfg();
  if (!c.username || !c.password) {
    return Promise.resolve({ status: 0, error: 'EINVOICE_USERNAME/PASSWORD tanımlı değil' });
  }
  const url = new URL(c.baseUrl + path);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined || v === null) continue;
      url.searchParams.append(k, String(v));
    }
  }
  const lib = url.protocol === 'http:' ? http : https;
  const payload = body !== undefined ? Buffer.from(JSON.stringify(body), 'utf8') : null;
  const opts = {
    method,
    hostname: url.hostname,
    port: url.port || (url.protocol === 'http:' ? 80 : 443),
    path: url.pathname + (url.search || ''),
    headers: {
      Accept: 'application/json',
      'User-Agent': 'MusattiBurger/1.0 (einvoice-rest)',
      username: c.username,
      password: c.password,
      ...(payload ? { 'Content-Type': 'application/json', 'Content-Length': payload.length } : {}),
    },
    timeout: parseInt(process.env.EINVOICE_HTTP_TIMEOUT_MS, 10) || 60000,
  };
  return new Promise((resolve) => {
    const req = lib.request(opts, (res) => {
      let buf = '';
      res.on('data', (chunk) => { buf += chunk; });
      res.on('end', () => {
        let data = null;
        try { data = buf ? JSON.parse(buf) : null; } catch { data = buf; }
        resolve({ status: res.statusCode, data, raw: buf });
      });
    });
    req.on('error', (err) => resolve({ status: 0, error: `${err.code || err.message} (${method} ${url.host}${url.pathname})` }));
    req.on('timeout', () => { req.destroy(); resolve({ status: 0, error: `TIMEOUT (${method} ${url.host}${url.pathname})` }); });
    if (payload) req.write(payload);
    req.end();
  });
}

const restGet = (path, query) => request('GET', path, { query });
const restPost = (path, body, query) => request('POST', path, { body, query });

const pad = (n, len = 2) => String(n).padStart(len, '0');
const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;

const buildInvoiceId = (orderId, date = new Date()) => {
  const year = date.getFullYear();
  return `${cfg().prefix}${year}${String(orderId).padStart(9, '0')}`;
};

// ----- Bilgi/keşif çağrıları (fatura göndermez) -----

async function getPrefixCodeList(documentType = 'EFATURA') {
  const r = await restGet('/api/document/getPrefixCodeList', { documentType });
  return r;
}

async function getUserAliasList() {
  return restGet('/api/document/queryUserAliasList');
}

async function getCreditBalance() {
  // KONTOR cinsinden bakiye
  const r = await restGet('/api/document/customerCredit', { creditType: 'KONTOR' });
  if (r.status === 200 && r.data && r.data.isOk) {
    return { ok: true, total: r.data.totalCredit, remain: r.data.remainCredit, raw: r.data };
  }
  return { ok: false, error: r.data?.message || r.error || `HTTP ${r.status}`, raw: r.data };
}

async function checkEFaturaPayer(vknTckn) {
  if (!vknTckn) return false;
  const r = await restGet('/api/document/getGibUser', {
    aliasType: 'PK',
    documentType: 'EFATURA',
    identifier: vknTckn,
  });
  if (r.status !== 200 || !r.data) return false;
  // isOk true ve gibUserList boş değilse e-fatura mükellefidir
  return Boolean(r.data.isOk && Array.isArray(r.data.gibUserList) && r.data.gibUserList.length > 0);
}

// ----- Sipariş -> DocumentModel dönüşümü -----

function buildDocumentModel({ order, invoiceId, uuid, isEarchive }) {
  const c = cfg();
  const now = new Date();
  const issueDateTime = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}T${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const isKurumsal = order.invoice_type === 'kurumsal';
  const recipientId = isKurumsal ? (order.billing_tax_number || '') : (order.billing_tckn || '11111111111');
  const billAddr = order.billing_address || {};

  const items = Array.isArray(order.items) ? order.items : [];
  const vatRate = c.vatRate;

  let lineExt = 0;
  const lines = items.map((it, idx) => {
    const product = it.product || {};
    const qty = Number(it.quantity || 1);
    // KDV dahil fiyat -> KDV hariç birim fiyat
    const unitPriceGross = Number(it.price || it.unit_price || product.price || 0);
    const unitPriceNet = round2(unitPriceGross / (1 + vatRate / 100));
    const extension = round2(unitPriceNet * qty);
    lineExt += extension;
    return {
      lineId: String(idx + 1),
      lineNumber: String(idx + 1),
      itemName: it.name || product.name || `Ürün #${idx + 1}`,
      quantity: qty,
      unit: 'C62', // adet
      unitPrice: unitPriceNet,
      lineExtensionAmount: extension,
      outstandingQuantity: 0,
      outstandingReason: '',
    };
  });
  lineExt = round2(lineExt);
  const taxAmount = round2(lineExt * vatRate / 100);
  const taxInclusive = round2(lineExt + taxAmount);

  const supplier = {
    vknTckn: c.sender.vkn,
    title: c.sender.title || '',
    taxOffice: c.sender.taxOffice || '',
    streetName: c.sender.address || '-',
    cityName: c.sender.city,
    citySubdivisionName: c.sender.district,
    countryName: 'Türkiye',
    postalZone: c.sender.postcode,
    email: c.sender.email,
    telephone: c.sender.phone,
  };

  const customer = {
    vknTckn: recipientId,
    formattedName: isKurumsal
      ? (order.billing_company_title || '')
      : `${order.billing_first_name || ''} ${order.billing_last_name || ''}`.trim(),
    givenName: order.billing_first_name || '',
    familyName: order.billing_last_name || '',
    title: isKurumsal ? (order.billing_company_title || '') : '',
    taxOffice: order.billing_tax_office || '',
    streetName: billAddr.address || billAddr.street || order.delivery_address || '-',
    cityName: billAddr.city || c.sender.city,
    citySubdivisionName: billAddr.district || c.sender.district,
    countryName: 'Türkiye',
    postalZone: billAddr.postcode || c.sender.postcode,
    email: order.billing_email || '',
    telephone: order.billing_phone || '',
  };

  const sourceUrn = c.sourceUrn;
  const destinationUrn = isEarchive
    ? sourceUrn // E-arşivde alıcı tarafı kullanılmaz; gönderen kendi PK'sıdır
    : `urn:mail:defaultpk@${recipientId}`;

  return {
    documentId: invoiceId,
    documentUuid: uuid,
    issueDateTime,
    documentCurrencyCode: 'TRY',
    documentTypeCode: 'SATIS',
    profileId: isEarchive ? 'EARSIVFATURA' : 'TICARIFATURA',
    invoiceType: isEarchive ? 'EARSIVFATURA' : 'EFATURA',
    sendingType: order.billing_email ? 'ELEKTRONIK' : 'KAGIT',
    sourceUrn,
    destinationUrn,
    deliveryType: 'CARRIER',
    okcSerialNumber: '',
    lineExtensionAmount: lineExt,
    allowanceTotalAmount: 0,
    taxExclusiveAmount: lineExt,
    taxInclusiveAmount: taxInclusive,
    payableAmount: taxInclusive,
    customer,
    supplier,
    sellerSupplier: supplier,
    lines,
  };
}

// ----- Public: fatura gönderimi -----

async function sendInvoiceForOrder(order) {
  const c = cfg();
  const uuid = uuidv4();
  const invoiceId = buildInvoiceId(order.id);

  // MOCK MOD: e-posta tabanlı sahte fatura
  if (String(process.env.EINVOICE_MOCK_MODE).toLowerCase() === 'true') {
    const { sendMockInvoice } = require('./einvoiceMock');
    try {
      const res = await sendMockInvoice(order);
      return { ...res, raw: { mock: true } };
    } catch (err) {
      return { uuid, invoiceId, isEarchive: true, status: 'failed', error: 'MOCK e-posta hatası: ' + err.message, mock: true };
    }
  }

  if (!c.username || !c.password) {
    return { uuid, invoiceId, isEarchive: true, status: 'failed', error: 'EINVOICE_USERNAME/PASSWORD tanımlı değil', raw: null };
  }
  if (!c.sender.vkn || c.sender.vkn.startsWith('TEST_VKN_HENUZ')) {
    return { uuid, invoiceId, isEarchive: true, status: 'failed', error: 'EINVOICE_SENDER_VKN tanımlı değil', raw: null };
  }
  // Güvenlik kilidi: test modunda canlı VKN engellensin
  const liveVkn = '0102365158';
  if (c.testMode && c.sender.vkn === liveVkn) {
    return {
      uuid, invoiceId, isEarchive: true, status: 'failed',
      error: 'GÜVENLİK KİLİDİ: EINVOICE_TEST_MODE=true iken canlı firma VKN (0102365158) kullanılamaz.',
      raw: null,
    };
  }

  // Alıcı tipini belirle (e-fatura mükellefi mi?)
  const isKurumsal = order.invoice_type === 'kurumsal';
  const recipientId = isKurumsal ? order.billing_tax_number : order.billing_tckn;
  let isEarchive = true;
  if (isKurumsal && recipientId) {
    try {
      const isPayer = await checkEFaturaPayer(recipientId);
      isEarchive = !isPayer;
    } catch {
      isEarchive = true;
    }
  }

  // REST modunda da UBL XML uretip /api/document/sendDocument'a base64 olarak
  // gonderiyoruz. (sendDocumentModel JSON yolu test ortaminda sessiz red
  // donduruyordu; XML yolu SOAP'taki ayni payload sekli oldugundan kanitlanmis.)
  const xml = buildInvoiceXML({ order, invoiceId, uuid, isEarchive });
  const documentDate = (new Date()).toISOString().slice(0, 10);
  const sourceUrn = c.sourceUrn;
  const destinationUrn = isEarchive
    ? sourceUrn
    : `urn:mail:defaultpk@${recipientId}`;

  const inputDocument = {
    base64XmlContent: Buffer.from(xml, 'utf8').toString('base64'),
    documentType: isEarchive ? 'EARSIVFATURA' : 'EFATURA',
    documentUUID: uuid,
    documentId: invoiceId,
    documentDate,
    sourceUrn,
    destinationUrn,
    destinationIdentifier: isKurumsal ? recipientId : '',
    documentNoPrefix: c.prefix,
    smmNote: isEarchive ? 'E-Arsiv Fatura' : 'E-Fatura',
  };

  // Aktif Donusum REST akisi:
  //  1) loadDocument -> XML'i validate edip taslak olarak portala kaydeder.
  //     Hata varsa Turkce mesaj doner ("Belge basariyla alindi" / vs).
  //  2) sendDocument -> taslagi imzalayip GIB'e gonderir; kontor harcanir.
  //     Demo/kontor yetersiz hesaplarda sessiz `isOk:false,message:null` doner;
  //     bu durumda taslak portalda kalir ve daha sonra reSendDocument ile
  //     gonderilebilir.
  const loadResp = await restPost('/api/document/loadDocument', [inputDocument]);
  const loadFirst = Array.isArray(loadResp.data) ? loadResp.data[0] : loadResp.data;
  const loadOk = loadResp.status === 200 && loadFirst && loadFirst.isOk === true;

  if (!loadOk) {
    return {
      uuid,
      invoiceId,
      isEarchive,
      status: 'failed',
      error: (loadFirst && (loadFirst.message || loadFirst.error)) || loadResp.error || `HTTP ${loadResp.status}`,
      raw: loadResp.data || loadResp.raw || null,
    };
  }

  // loadDocument basarili -> taslak portalda. Simdi gondermeyi dene.
  const sendResp = await restPost('/api/document/sendDocument', [inputDocument]);
  const sendFirst = Array.isArray(sendResp.data) ? sendResp.data[0] : sendResp.data;
  const sendOk = sendResp.status === 200 && sendFirst && sendFirst.isOk === true;

  if (sendOk) {
    return {
      uuid: sendFirst.documentUuid || uuid,
      invoiceId: sendFirst.documentId || invoiceId,
      isEarchive,
      status: 'sent',
      pdfUrl: sendFirst.pdfUrl || null,
      code: sendFirst.code || null,
      explanation: sendFirst.message || null,
      raw: { load: loadFirst, send: sendFirst },
    };
  }

  // Taslak yuklendi ama gonderim basarisiz (cogunlukla kontor sorunu).
  // Fallback: resmi sablonda PDF onizlemesi alip musterinin mailine ekleyelim.
  // Boylece kontorsuz demo/test akisinda da musteri faturasini gorebilir.
  const fallbackEmail = String(process.env.EINVOICE_PREVIEW_EMAIL_FALLBACK || 'true').toLowerCase() === 'true';
  let mailInfo = null;
  if (fallbackEmail && order.billing_email) {
    try {
      const m = await sendDraftPreviewByEmail(order, { addDraftWatermark: true });
      mailInfo = m;
    } catch (e) {
      mailInfo = { status: 'failed', error: 'Mail gonderim hatasi: ' + e.message };
    }
  }

  return {
    uuid: loadFirst.documentUuid || uuid,
    invoiceId,
    isEarchive,
    status: 'draft',
    error: (sendFirst && (sendFirst.message || sendFirst.error))
      || 'Taslak portala kaydedildi ancak gonderim basarisiz (muhtemelen kontor yetersiz).',
    mail: mailInfo,
    raw: { load: loadFirst, send: sendFirst || sendResp.data || null },
  };
}

async function queryLoadDocument({ documentType = 'EARSIVFATURA', uuid }) {
  const r = await request('GET', '/api/document/queryLoadDocument', { query: { documentType, uuid } });
  return { ok: r.status === 200 && r.data?.isOk === true, raw: r.data };
}

/**
 * Resmi Aktif Donusum sablonunda fatura onizlemesi alir (kontor harcamaz).
 * UBL XML gonderir, PDF veya HTML olarak base64 icerik alir.
 * @param {object} opts
 * @param {string} opts.xml - UBL-TR Invoice XML
 * @param {'EARSIVFATURA'|'EFATURA'} [opts.documentType]
 * @param {'PDF'|'HTML'} [opts.previewType]
 * @param {boolean} [opts.addDraftWatermark] - "TASLAK" filigrani ekle
 * @returns {Promise<{ok:boolean, content:Buffer|null, contentBase64:string|null, message:string|null, raw:any}>}
 */
async function getDraftPreview({ xml, documentType = 'EARSIVFATURA', previewType = 'PDF', addDraftWatermark = true }) {
  if (!xml) return { ok: false, content: null, contentBase64: null, message: 'xml bos olamaz', raw: null };
  const xmlBase64 = Buffer.from(xml, 'utf8').toString('base64');
  // ReDoc/Swagger spec'inde GET olarak tanimlanmis; body ile birlikte gonderiyoruz.
  const r = await request('GET', '/api/document/getDraftDocumentPreview', {
    query: { documentType },
    body: { addDraftWatermark, previewType, xmlContent: xmlBase64 },
  });
  const ok = r.status === 200 && r.data?.isOk === true && !!r.data?.content;
  if (!ok) {
    return {
      ok: false, content: null, contentBase64: null,
      message: r.data?.message || r.error || `HTTP ${r.status}`,
      raw: r.data,
    };
  }
  return {
    ok: true,
    contentBase64: r.data.content,
    content: Buffer.from(r.data.content, 'base64'),
    message: r.data.message || null,
    raw: r.data,
  };
}

/**
 * Order'dan UBL XML uretir ve resmi sablonda PDF/HTML onizleme dondurur.
 * Kontor harcamaz; demo/test/yedek senaryolarda kullanilabilir.
 */
async function getDraftPreviewForOrder(order, { previewType = 'PDF', addDraftWatermark = true } = {}) {
  const c = cfg();
  const uuid = uuidv4();
  const invoiceId = buildInvoiceId(order.id);
  const isKurumsal = order.invoice_type === 'kurumsal';
  const isEarchive = !isKurumsal;
  const xml = buildInvoiceXML({ order, invoiceId, uuid, isEarchive });
  const documentType = isEarchive ? 'EARSIVFATURA' : 'EFATURA';
  const preview = await getDraftPreview({ xml, documentType, previewType, addDraftWatermark });
  return { uuid, invoiceId, isEarchive, xml, ...preview };
}

/**
 * Resmi sablondaki PDF/HTML'i musterinin e-postasina gonderir.
 * GIB'e iletmez, kontor harcamaz - demo/test akisi icindir.
 */
async function sendDraftPreviewByEmail(order, { addDraftWatermark = true } = {}) {
  const email = order.billing_email;
  if (!email) {
    return { status: 'failed', error: 'Musterinin billing_email alani bos.', preview: false };
  }
  const pdf = await getDraftPreviewForOrder(order, { previewType: 'PDF', addDraftWatermark });
  if (!pdf.ok) {
    return {
      uuid: pdf.uuid, invoiceId: pdf.invoiceId, isEarchive: pdf.isEarchive,
      status: 'failed', error: pdf.message || 'Onizleme alinamadi.', preview: true,
    };
  }
  const html = await getDraftPreview({ xml: pdf.xml, documentType: pdf.isEarchive ? 'EARSIVFATURA' : 'EFATURA', previewType: 'HTML', addDraftWatermark });

  const nodemailer = require('nodemailer');
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  const watermarkLabel = addDraftWatermark ? ' [TASLAK / DEMO]' : '';
  const subject = `${pdf.isEarchive ? 'E-Arsiv' : 'E-Fatura'} Faturaniz - ${pdf.invoiceId}${watermarkLabel}`;
  const bodyHtml = (html.ok && html.content)
    ? html.content.toString('utf8')
    : `<p>Sayin musterimiz,</p><p>Fatura PDF'iniz ekte yer almaktadir.</p>`;

  await transporter.sendMail({
    from: `"UGA BURGER" <${process.env.SMTP_USER}>`,
    to: email,
    subject,
    html: bodyHtml,
    attachments: [
      { filename: `${pdf.invoiceId}.pdf`, content: pdf.content, contentType: 'application/pdf' },
      { filename: `${pdf.invoiceId}.xml`, content: pdf.xml, contentType: 'application/xml' },
    ],
  });

  return {
    uuid: pdf.uuid, invoiceId: pdf.invoiceId, isEarchive: pdf.isEarchive,
    status: 'sent',
    preview: true,
    explanation: `Resmi sablondaki PDF onizlemesi ${email} adresine gonderildi (kontor harcanmadi).`,
  };
}

module.exports = {
  sendInvoiceForOrder,
  checkEFaturaPayer,
  getCreditBalance,
  getPrefixCodeList,
  getUserAliasList,
  queryLoadDocument,
  getDraftPreview,
  getDraftPreviewForOrder,
  sendDraftPreviewByEmail,
  buildInvoiceId,
  buildDocumentModel,
  // dahili (script/test için)
  _request: request,
};
