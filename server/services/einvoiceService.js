/**
 * E-Fatura / E-Arşiv entegrasyon servisi (Aktif Dönüşüm - SOAP)
 *
 * WSDL yapısına göre:
 *  - isEFaturaUser({ vkn_tckn })
 *  - getCustomerCreditCount({ vkn_tckn })
 *  - E-Fatura sendInvoice({ inputDocumentList: [InputDocument] })
 *  - E-Arşiv sendInvoice({ invoiceXMLList: [InputDocument] })
 *  - InputDocument: { documentUUID, xmlContent, sourceUrn, destinationUrn, documentDate, documentId?, localId?, note? }
 *  - Response: return[0] = { documentUUID, documentID, code, explanation, cause }
 *    code "AE00000" veya "0" veya "SUCCESS" → başarı
 */

const soap = require('soap');
const { v4: uuidv4 } = require('uuid');

const cfg = () => ({
  username: process.env.EINVOICE_USERNAME,
  password: process.env.EINVOICE_PASSWORD,
  invoiceWsdl: process.env.EINVOICE_WSDL_URL,
  earchiveWsdl: process.env.EARCHIVE_WSDL_URL,
  testMode: String(process.env.EINVOICE_TEST_MODE).toLowerCase() === 'true',
  vatRate: parseFloat(process.env.EINVOICE_VAT_RATE || '10'),
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

const pad = (n, len = 2) => String(n).padStart(len, '0');
const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;')
  .replace(/</g, '&lt;')
  .replace(/>/g, '&gt;')
  .replace(/"/g, '&quot;')
  .replace(/'/g, '&apos;');
const fmt = (n) => Number(n || 0).toFixed(2);

const buildInvoiceId = (orderId, date = new Date()) => {
  const year = date.getFullYear();
  return `GIB${year}${String(orderId).padStart(9, '0')}`;
};

function buildInvoiceXML({ order, invoiceId, uuid, isEarchive }) {
  const { sender, vatRate } = cfg();
  const now = new Date();
  const issueDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const issueTime = `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;

  const isKurumsal = order.invoice_type === 'kurumsal';
  const partyIdScheme = isKurumsal ? 'VKN' : 'TCKN';
  const partyId = isKurumsal ? (order.billing_tax_number || '') : (order.billing_tckn || '11111111111');
  const partyName = isKurumsal
    ? (order.billing_company_title || '')
    : `${order.billing_first_name || ''} ${order.billing_last_name || ''}`.trim();
  const firstName = order.billing_first_name || (partyName.split(' ')[0] || 'Musteri');
  const lastName = order.billing_last_name || (partyName.split(' ').slice(1).join(' ') || '.');

  const billAddr = order.billing_address || {};
  const street = esc(billAddr.address || billAddr.street || order.delivery_address || '-');
  const district = esc(billAddr.district || sender.district);
  const city = esc(billAddr.city || sender.city);
  const postcode = esc(billAddr.postcode || sender.postcode);
  const buyerEmail = esc(order.billing_email || '');
  const buyerPhone = esc(order.billing_phone || '');

  // E-Arşiv gönderim şekli: 5 = Elektronik (e-posta), 1 = Kağıt
  const sendingType = isEarchive ? (order.billing_email ? '5' : '1') : null;

  const items = Array.isArray(order.items) ? order.items : [];

  let lineExtensionTotal = 0;
  let taxTotal = 0;

  const invoiceLines = items.map((it, idx) => {
    const qty = Number(it.quantity || 1);
    const unitPrice = Number(it.unit_price || 0);
    const extrasTotal = (it.extras || []).reduce((s, ex) => s + Number(ex.price || 0) * Number(ex.quantity || 1), 0);
    const lineTotalWithTax = (unitPrice + extrasTotal) * qty;
    const lineTotal = lineTotalWithTax / (1 + vatRate / 100);
    const lineTax = lineTotalWithTax - lineTotal;
    const lineUnitPrice = lineTotal / qty;
    lineExtensionTotal += lineTotal;
    taxTotal += lineTax;

    const productName = esc(it.product?.name || `Urun ${it.product_id}`);
    const extrasList = (it.extras || []).map(e => e.name).filter(Boolean).join(', ');
    const itemName = extrasList ? `${productName} (${esc(extrasList)})` : productName;

    return `  <cac:InvoiceLine>
    <cbc:ID>${idx + 1}</cbc:ID>
    <cbc:InvoicedQuantity unitCode="C62">${fmt(qty)}</cbc:InvoicedQuantity>
    <cbc:LineExtensionAmount currencyID="TRY">${fmt(lineTotal)}</cbc:LineExtensionAmount>
    <cac:TaxTotal>
      <cbc:TaxAmount currencyID="TRY">${fmt(lineTax)}</cbc:TaxAmount>
      <cac:TaxSubtotal>
        <cbc:TaxableAmount currencyID="TRY">${fmt(lineTotal)}</cbc:TaxableAmount>
        <cbc:TaxAmount currencyID="TRY">${fmt(lineTax)}</cbc:TaxAmount>
        <cbc:Percent>${vatRate}</cbc:Percent>
        <cac:TaxCategory>
          <cac:TaxScheme>
            <cbc:Name>KDV</cbc:Name>
            <cbc:TaxTypeCode>0015</cbc:TaxTypeCode>
          </cac:TaxScheme>
        </cac:TaxCategory>
      </cac:TaxSubtotal>
    </cac:TaxTotal>
    <cac:Item>
      <cbc:Name>${itemName}</cbc:Name>
    </cac:Item>
    <cac:Price>
      <cbc:PriceAmount currencyID="TRY">${fmt(lineUnitPrice)}</cbc:PriceAmount>
    </cac:Price>
  </cac:InvoiceLine>`;
  }).join('\n');

  const discount = Number(order.discount_amount || 0);
  const discountNet = discount / (1 + vatRate / 100);
  const discountTax = discount - discountNet;
  if (discount > 0) {
    lineExtensionTotal -= discountNet;
    taxTotal -= discountTax;
  }

  const taxExclusive = lineExtensionTotal;
  const taxInclusiveValue = taxExclusive + taxTotal;
  const payableAmount = Number(order.total_amount);

  const profileId = isEarchive ? 'EARSIVFATURA' : 'TEMELFATURA';
  const invoiceTypeCode = 'SATIS';

  const earchiveNotes = sendingType ? `
  <cbc:Note>Gonderim Sekli: ${sendingType}</cbc:Note>` : '';

  return `<?xml version="1.0" encoding="UTF-8"?>
<Invoice xmlns="urn:oasis:names:specification:ubl:schema:xsd:Invoice-2"
  xmlns:cac="urn:oasis:names:specification:ubl:schema:xsd:CommonAggregateComponents-2"
  xmlns:cbc="urn:oasis:names:specification:ubl:schema:xsd:CommonBasicComponents-2"
  xmlns:ext="urn:oasis:names:specification:ubl:schema:xsd:CommonExtensionComponents-2"
  xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">
  <cbc:UBLVersionID>2.1</cbc:UBLVersionID>
  <cbc:CustomizationID>TR1.2</cbc:CustomizationID>
  <cbc:ProfileID>${profileId}</cbc:ProfileID>
  <cbc:ID>${invoiceId}</cbc:ID>
  <cbc:CopyIndicator>false</cbc:CopyIndicator>
  <cbc:UUID>${uuid}</cbc:UUID>
  <cbc:IssueDate>${issueDate}</cbc:IssueDate>
  <cbc:IssueTime>${issueTime}</cbc:IssueTime>
  <cbc:InvoiceTypeCode>${invoiceTypeCode}</cbc:InvoiceTypeCode>
  <cbc:DocumentCurrencyCode>TRY</cbc:DocumentCurrencyCode>
  <cbc:LineCountNumeric>${items.length}</cbc:LineCountNumeric>${earchiveNotes}
  <cac:OrderReference>
    <cbc:ID>SIP-${order.id}</cbc:ID>
    <cbc:IssueDate>${issueDate}</cbc:IssueDate>
  </cac:OrderReference>
  <cac:AccountingSupplierParty>
    <cac:Party>
      <cbc:WebsiteURI>https://ugaburger.com</cbc:WebsiteURI>
      <cac:PartyIdentification>
        <cbc:ID schemeID="VKN">${esc(sender.vkn)}</cbc:ID>
      </cac:PartyIdentification>
      <cac:PartyName>
        <cbc:Name>${esc(sender.title)}</cbc:Name>
      </cac:PartyName>
      <cac:PostalAddress>
        <cbc:StreetName>${esc(sender.address)}</cbc:StreetName>
        <cbc:CitySubdivisionName>${esc(sender.district)}</cbc:CitySubdivisionName>
        <cbc:CityName>${esc(sender.city)}</cbc:CityName>
        <cbc:PostalZone>${esc(sender.postcode)}</cbc:PostalZone>
        <cac:Country><cbc:Name>Turkiye</cbc:Name></cac:Country>
      </cac:PostalAddress>
      <cac:PartyTaxScheme>
        <cac:TaxScheme><cbc:Name>${esc(sender.taxOffice)}</cbc:Name></cac:TaxScheme>
      </cac:PartyTaxScheme>
      <cac:Contact>
        <cbc:Telephone>${esc(sender.phone)}</cbc:Telephone>
        <cbc:ElectronicMail>${esc(sender.email)}</cbc:ElectronicMail>
      </cac:Contact>
    </cac:Party>
  </cac:AccountingSupplierParty>
  <cac:AccountingCustomerParty>
    <cac:Party>
      <cac:PartyIdentification>
        <cbc:ID schemeID="${partyIdScheme}">${esc(partyId)}</cbc:ID>
      </cac:PartyIdentification>
      ${isKurumsal ? `<cac:PartyName><cbc:Name>${esc(partyName)}</cbc:Name></cac:PartyName>` : ''}
      <cac:PostalAddress>
        <cbc:StreetName>${street}</cbc:StreetName>
        <cbc:CitySubdivisionName>${district}</cbc:CitySubdivisionName>
        <cbc:CityName>${city}</cbc:CityName>
        <cbc:PostalZone>${postcode}</cbc:PostalZone>
        <cac:Country><cbc:Name>Turkiye</cbc:Name></cac:Country>
      </cac:PostalAddress>
      ${isKurumsal ? `<cac:PartyTaxScheme><cac:TaxScheme><cbc:Name>${esc(order.billing_tax_office || '')}</cbc:Name></cac:TaxScheme></cac:PartyTaxScheme>` : ''}
      ${!isKurumsal ? `<cac:Person><cbc:FirstName>${esc(firstName)}</cbc:FirstName><cbc:FamilyName>${esc(lastName)}</cbc:FamilyName></cac:Person>` : ''}
      <cac:Contact>
        <cbc:Telephone>${buyerPhone}</cbc:Telephone>
        <cbc:ElectronicMail>${buyerEmail}</cbc:ElectronicMail>
      </cac:Contact>
    </cac:Party>
  </cac:AccountingCustomerParty>
  ${discount > 0 ? `<cac:AllowanceCharge>
    <cbc:ChargeIndicator>false</cbc:ChargeIndicator>
    <cbc:AllowanceChargeReason>Promosyon</cbc:AllowanceChargeReason>
    <cbc:Amount currencyID="TRY">${fmt(discountNet)}</cbc:Amount>
  </cac:AllowanceCharge>` : ''}
  <cac:TaxTotal>
    <cbc:TaxAmount currencyID="TRY">${fmt(taxTotal)}</cbc:TaxAmount>
    <cac:TaxSubtotal>
      <cbc:TaxableAmount currencyID="TRY">${fmt(taxExclusive)}</cbc:TaxableAmount>
      <cbc:TaxAmount currencyID="TRY">${fmt(taxTotal)}</cbc:TaxAmount>
      <cbc:Percent>${vatRate}</cbc:Percent>
      <cac:TaxCategory>
        <cac:TaxScheme><cbc:Name>KDV</cbc:Name><cbc:TaxTypeCode>0015</cbc:TaxTypeCode></cac:TaxScheme>
      </cac:TaxCategory>
    </cac:TaxSubtotal>
  </cac:TaxTotal>
  <cac:LegalMonetaryTotal>
    <cbc:LineExtensionAmount currencyID="TRY">${fmt(taxExclusive + discountNet)}</cbc:LineExtensionAmount>
    <cbc:TaxExclusiveAmount currencyID="TRY">${fmt(taxExclusive)}</cbc:TaxExclusiveAmount>
    <cbc:TaxInclusiveAmount currencyID="TRY">${fmt(taxInclusiveValue)}</cbc:TaxInclusiveAmount>
    <cbc:AllowanceTotalAmount currencyID="TRY">${fmt(discountNet)}</cbc:AllowanceTotalAmount>
    <cbc:PayableAmount currencyID="TRY">${fmt(payableAmount)}</cbc:PayableAmount>
  </cac:LegalMonetaryTotal>
${invoiceLines}
</Invoice>`;
}

async function createSoapClient(wsdlUrl) {
  const { username, password } = cfg();
  if (!wsdlUrl) throw new Error('WSDL URL tanımlı değil');
  const client = await soap.createClientAsync(wsdlUrl, { disableCache: false });
  client.setSecurity(new soap.WSSecurity(username, password, { passwordType: 'PasswordText' }));
  return client;
}

async function checkEFaturaPayer(identifier) {
  if (!identifier) return false;
  try {
    const client = await createSoapClient(cfg().earchiveWsdl);
    const [res] = await client.isEFaturaUserAsync({ vkn_tckn: identifier });
    const ret = res?.return ?? res;
    // UserQueryResponse: { queryState, stateExplanation, userCount, users[] }
    if (ret && typeof ret === 'object') {
      if (typeof ret.userCount !== 'undefined') {
        return Number(ret.userCount) > 0;
      }
      const v = ret.result ?? ret.isUser ?? ret.isEFaturaUser ?? ret.value;
      if (typeof v === 'boolean') return v;
      if (typeof v === 'string') return v.toLowerCase() === 'true';
    }
    if (typeof ret === 'boolean') return ret;
    return false;
  } catch (err) {
    console.warn('[einvoice] checkEFaturaPayer hata:', err.message);
    return false;
  }
}

async function getCreditBalance() {
  try {
    const client = await createSoapClient(cfg().earchiveWsdl);
    const [res] = await client.getCustomerCreditCountAsync({ vkn_tckn: cfg().sender.vkn });
    return res?.return ?? res;
  } catch (err) {
    return { error: err.message, body: err.body?.slice?.(0, 1000) };
  }
}

function isSuccessCode(code) {
  if (code === undefined || code === null) return false;
  const s = String(code).trim().toUpperCase();
  return s === '0' || s === 'AE00000' || s === 'SUCCESS' || s === 'OK' || s.startsWith('AE00000');
}

async function sendInvoiceForOrder(order) {
  const uuid = uuidv4();
  const invoiceId = buildInvoiceId(order.id);
  const now = new Date();
  const documentDate = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;

  // MOCK MOD: Sağlayıcıya gitmeden müşterinin e-postasına test faturası gönder
  if (String(process.env.EINVOICE_MOCK_MODE).toLowerCase() === 'true') {
    const { sendMockInvoice } = require('./einvoiceMock');
    try {
      const res = await sendMockInvoice(order);
      return { ...res, xml: null, raw: { mock: true } };
    } catch (err) {
      return {
        uuid, invoiceId, isEarchive: true,
        status: 'failed',
        error: 'MOCK e-posta gönderim hatası: ' + err.message,
        mock: true,
      };
    }
  }

  // GÜVENLİK KİLİDİ: Test modunda canlı firma VKN'si kullanılıyorsa engelle
  const liveVkn = '0102365158';
  if (cfg().testMode && cfg().sender.vkn === liveVkn) {
    return {
      uuid,
      invoiceId,
      isEarchive: true,
      status: 'failed',
      error: 'GÜVENLİK KİLİDİ: EINVOICE_TEST_MODE=true iken canlı firma VKN (0102365158) kullanılamaz. '
        + 'Aktif Dönüşüm\'den test VKN alıp EINVOICE_SENDER_VKN değerini güncelle veya '
        + 'EINVOICE_TEST_MODE=false yaparak gerçek gönderime geç.',
      raw: null,
    };
  }

  // SOAP kullanıcısı henüz atanmamış olabilir
  if (!cfg().sender.vkn || cfg().sender.vkn.startsWith('TEST_VKN_HENUZ')) {
    return {
      uuid,
      invoiceId,
      isEarchive: true,
      status: 'failed',
      error: 'EINVOICE_SENDER_VKN tanımlı değil. Aktif Dönüşüm\'den test/canlı VKN alındıktan sonra .env güncellenmelidir.',
      raw: null,
    };
  }

  const isKurumsal = order.invoice_type === 'kurumsal';
  const recipientId = isKurumsal ? order.billing_tax_number : order.billing_tckn;
  let isEarchive = true;
  if (isKurumsal && recipientId) {
    const isPayer = await checkEFaturaPayer(recipientId);
    isEarchive = !isPayer;
  }

  const xml = buildInvoiceXML({ order, invoiceId, uuid, isEarchive });

  const sourceUrn = `urn:mail:defaultgb@${cfg().sender.vkn}`;
  const destinationUrn = isEarchive
    ? `urn:mail:defaultpk@${cfg().sender.vkn}`
    : `urn:mail:defaultpk@${recipientId}`;

  const inputDoc = {
    documentUUID: uuid,
    xmlContent: xml,
    sourceUrn,
    destinationUrn,
    documentId: invoiceId,
    documentDate,
    submitForApproval: true,
    note: isEarchive ? 'E-Arsiv Fatura' : 'E-Fatura',
  };

  const wsdl = isEarchive ? cfg().earchiveWsdl : cfg().invoiceWsdl;
  const client = await createSoapClient(wsdl);

  const payload = isEarchive
    ? { invoiceXMLList: [inputDoc] }
    : { inputDocumentList: [inputDoc] };

  try {
    const [res] = await client.sendInvoiceAsync(payload);
    const returns = res?.return;
    const first = Array.isArray(returns) ? returns[0] : returns;
    const code = first?.code;
    const explanation = first?.explanation;
    const cause = first?.cause;
    const success = isSuccessCode(code);

    return {
      uuid: first?.documentUUID || uuid,
      invoiceId: first?.documentID || invoiceId,
      isEarchive,
      status: success ? 'sent' : 'failed',
      pdfUrl: null,
      code,
      explanation,
      cause,
      error: success ? null : `${code || ''} ${explanation || cause || ''}`.trim(),
      raw: first,
      xml,
    };
  } catch (err) {
    return {
      uuid,
      invoiceId,
      isEarchive,
      status: 'failed',
      error: err.message || String(err),
      raw: err.root || err.body?.slice?.(0, 2000) || null,
      xml,
    };
  }
}

module.exports = {
  sendInvoiceForOrder,
  checkEFaturaPayer,
  getCreditBalance,
  buildInvoiceXML,
  buildInvoiceId,
  isSuccessCode,
};

// REST moduna gecis: EINVOICE_API_MODE=rest ise REST modulunu delege et.
// Mevcut tum tuketiciler require('./einvoiceService') uzerinden geldigi icin
// bu sekilde tek noktadan toggle yapilabiliyor.
if ((process.env.EINVOICE_API_MODE || '').toLowerCase() === 'rest') {
  const rest = require('./einvoiceServiceRest');
  module.exports.sendInvoiceForOrder = rest.sendInvoiceForOrder;
  module.exports.checkEFaturaPayer = rest.checkEFaturaPayer;
  module.exports.getCreditBalance = rest.getCreditBalance;
  module.exports.buildInvoiceId = rest.buildInvoiceId;
  module.exports.getPrefixCodeList = rest.getPrefixCodeList;
  module.exports.getUserAliasList = rest.getUserAliasList;
  module.exports.buildDocumentModel = rest.buildDocumentModel;
  module.exports.queryLoadDocument = rest.queryLoadDocument;
  module.exports.getDraftPreview = rest.getDraftPreview;
  module.exports.getDraftPreviewForOrder = rest.getDraftPreviewForOrder;
  module.exports.sendDraftPreviewByEmail = rest.sendDraftPreviewByEmail;
}
