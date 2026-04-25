/**
 * MOCK e-fatura modu. Aktif Dönüşüm'e gitmeden:
 *  - UBL-TR XML üretir
 *  - HTML fatura görüntüsü oluşturur
 *  - Müşterinin e-posta adresine SMTP ile gönderir (HTML + XML eki)
 *
 * EINVOICE_MOCK_MODE=true olduğunda devreye girer.
 * Gerçek bir fatura DEĞİLDİR, sadece demo gösterimdir.
 */
const nodemailer = require('nodemailer');
const { v4: uuidv4 } = require('uuid');
const { buildInvoiceXML, buildInvoiceId } = require('./einvoiceService');

const fmt = (n) => Number(n || 0).toFixed(2);
const esc = (s = '') => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

function buildInvoiceHTML({ order, invoiceId, uuid, isEarchive }) {
  const isKurumsal = order.invoice_type === 'kurumsal';
  const now = new Date();
  const issueDate = now.toLocaleDateString('tr-TR');
  const items = Array.isArray(order.items) ? order.items : [];
  const vatRate = parseFloat(process.env.EINVOICE_VAT_RATE || '10');

  const rows = items.map((it, i) => {
    const qty = Number(it.quantity || 1);
    const unitPrice = Number(it.unit_price || 0);
    const extrasTotal = (it.extras || []).reduce((s, ex) => s + Number(ex.price || 0) * Number(ex.quantity || 1), 0);
    const lineWithTax = (unitPrice + extrasTotal) * qty;
    const net = lineWithTax / (1 + vatRate / 100);
    const tax = lineWithTax - net;
    const name = esc(it.product?.name || `Urun ${it.product_id}`);
    const extras = (it.extras || []).map(e => e.name).filter(Boolean).join(', ');
    return `<tr>
      <td style="padding:6px;border:1px solid #ddd">${i + 1}</td>
      <td style="padding:6px;border:1px solid #ddd">${name}${extras ? ` <small style="color:#888">(${esc(extras)})</small>` : ''}</td>
      <td style="padding:6px;border:1px solid #ddd;text-align:center">${qty}</td>
      <td style="padding:6px;border:1px solid #ddd;text-align:right">${fmt(net / qty)} TL</td>
      <td style="padding:6px;border:1px solid #ddd;text-align:right">${fmt(net)} TL</td>
      <td style="padding:6px;border:1px solid #ddd;text-align:right">%${vatRate}</td>
      <td style="padding:6px;border:1px solid #ddd;text-align:right">${fmt(tax)} TL</td>
      <td style="padding:6px;border:1px solid #ddd;text-align:right">${fmt(lineWithTax)} TL</td>
    </tr>`;
  }).join('');

  const subtotal = items.reduce((s, it) => {
    const qty = Number(it.quantity || 1);
    const unitPrice = Number(it.unit_price || 0);
    const extrasTotal = (it.extras || []).reduce((a, ex) => a + Number(ex.price || 0) * Number(ex.quantity || 1), 0);
    return s + (unitPrice + extrasTotal) * qty;
  }, 0);
  const net = subtotal / (1 + vatRate / 100);
  const tax = subtotal - net;
  const discount = Number(order.discount_amount || 0);
  const grandTotal = Number(order.total_amount);

  const customerName = isKurumsal
    ? (order.billing_company_title || '-')
    : `${order.billing_first_name || ''} ${order.billing_last_name || ''}`.trim() || '-';
  const customerId = isKurumsal ? order.billing_tax_number : order.billing_tckn;
  const addr = order.billing_address || {};
  const addrStr = addr.address || addr.street || order.delivery_address || '-';

  return `<!DOCTYPE html>
<html lang="tr"><head><meta charset="UTF-8"><title>Fatura ${invoiceId}</title></head>
<body style="font-family:Arial,sans-serif;max-width:800px;margin:20px auto;color:#222;">
  <div style="background:#ff6b35;color:#fff;padding:20px;border-radius:8px 8px 0 0;">
    <h1 style="margin:0;">UGA BURGER</h1>
    <div style="font-size:12px;opacity:.9;margin-top:5px">${isEarchive ? 'E-ARŞİV FATURA' : 'E-FATURA'} ${process.env.EINVOICE_MOCK_MODE === 'true' ? '(DEMO / TEST)' : ''}</div>
  </div>

  <div style="border:1px solid #ddd;border-top:none;padding:20px;border-radius:0 0 8px 8px;">
    ${process.env.EINVOICE_MOCK_MODE === 'true' ? `
    <div style="background:#fff3cd;border:1px solid #ffc107;padding:10px;border-radius:4px;margin-bottom:20px;font-size:13px;">
      ⚠️ <strong>Bu bir TEST faturasıdır.</strong> Resmi bir mali belge değildir, GİB'e iletilmemiştir.
    </div>` : ''}

    <table style="width:100%;margin-bottom:20px;">
      <tr>
        <td style="vertical-align:top;width:50%;">
          <h3 style="margin:0 0 8px;color:#ff6b35;">SATICI</h3>
          <strong>${esc(process.env.EINVOICE_SENDER_TITLE || 'UGA BURGER')}</strong><br>
          VKN: ${esc(process.env.EINVOICE_SENDER_VKN || '-')}<br>
          Vergi Dairesi: ${esc(process.env.EINVOICE_SENDER_TAX_OFFICE || '-')}<br>
          ${esc(process.env.EINVOICE_SENDER_ADDRESS || '-')}
        </td>
        <td style="vertical-align:top;width:50%;">
          <h3 style="margin:0 0 8px;color:#ff6b35;">ALICI</h3>
          <strong>${esc(customerName)}</strong><br>
          ${isKurumsal ? 'VKN' : 'TCKN'}: ${esc(customerId || '-')}<br>
          ${isKurumsal && order.billing_tax_office ? `Vergi Dairesi: ${esc(order.billing_tax_office)}<br>` : ''}
          ${esc(addrStr)}<br>
          ${esc(order.billing_email || '')} ${order.billing_phone ? `· ${esc(order.billing_phone)}` : ''}
        </td>
      </tr>
    </table>

    <table style="width:100%;border-collapse:collapse;background:#f7f7f7;margin-bottom:20px;">
      <tr>
        <td style="padding:8px;"><strong>Fatura No:</strong> ${invoiceId}</td>
        <td style="padding:8px;"><strong>Tarih:</strong> ${issueDate}</td>
        <td style="padding:8px;"><strong>ETTN/UUID:</strong> ${uuid.slice(0, 13)}...</td>
      </tr>
    </table>

    <table style="width:100%;border-collapse:collapse;font-size:13px;">
      <thead>
        <tr style="background:#ff6b35;color:#fff;">
          <th style="padding:6px;border:1px solid #ddd">#</th>
          <th style="padding:6px;border:1px solid #ddd;text-align:left">Ürün</th>
          <th style="padding:6px;border:1px solid #ddd">Adet</th>
          <th style="padding:6px;border:1px solid #ddd">Birim (Net)</th>
          <th style="padding:6px;border:1px solid #ddd">Tutar (Net)</th>
          <th style="padding:6px;border:1px solid #ddd">KDV %</th>
          <th style="padding:6px;border:1px solid #ddd">KDV</th>
          <th style="padding:6px;border:1px solid #ddd">Toplam</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
    </table>

    <table style="width:100%;margin-top:20px;">
      <tr><td style="text-align:right;padding:4px;">Mal Hizmet Toplam:</td><td style="text-align:right;width:120px;padding:4px;">${fmt(net)} TL</td></tr>
      <tr><td style="text-align:right;padding:4px;">Hesaplanan KDV (%${vatRate}):</td><td style="text-align:right;padding:4px;">${fmt(tax)} TL</td></tr>
      ${discount > 0 ? `<tr><td style="text-align:right;padding:4px;color:#e91e63;">İndirim:</td><td style="text-align:right;padding:4px;color:#e91e63;">-${fmt(discount)} TL</td></tr>` : ''}
      <tr style="font-size:16px;font-weight:bold;background:#ff6b35;color:#fff;">
        <td style="text-align:right;padding:10px;">GENEL TOPLAM:</td>
        <td style="text-align:right;padding:10px;">${fmt(grandTotal)} TL</td>
      </tr>
    </table>

    <div style="margin-top:30px;padding-top:15px;border-top:1px solid #eee;font-size:11px;color:#888;text-align:center;">
      Bu belge e-posta ile gönderilmiştir. Teşekkür ederiz!
    </div>
  </div>
</body></html>`;
}

async function sendMockInvoice(order) {
  const uuid = uuidv4();
  const invoiceId = buildInvoiceId(order.id);
  const isKurumsal = order.invoice_type === 'kurumsal';
  const isEarchive = !isKurumsal; // mock'ta hepsi e-arşiv gibi davranır

  // XML ve HTML üret
  const xml = buildInvoiceXML({ order, invoiceId, uuid, isEarchive });
  const html = buildInvoiceHTML({ order, invoiceId, uuid, isEarchive });

  const email = order.billing_email;
  if (!email) {
    return {
      uuid, invoiceId, isEarchive,
      status: 'failed',
      error: 'Müşterinin billing_email alanı boş. E-posta gönderilemedi.',
      mock: true,
    };
  }

  // SMTP ile gönder
  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT) || 587,
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });

  const subject = `${isEarchive ? 'E-Arşiv' : 'E-Fatura'} Faturanız - ${invoiceId} [TEST]`;

  await transporter.sendMail({
    from: `"UGA BURGER" <${process.env.SMTP_USER}>`,
    to: email,
    subject,
    html,
    attachments: [
      { filename: `${invoiceId}.xml`, content: xml, contentType: 'application/xml' },
      { filename: `${invoiceId}.html`, content: html, contentType: 'text/html' },
    ],
  });

  return {
    uuid, invoiceId, isEarchive,
    status: 'sent',
    mock: true,
    pdfUrl: null,
    explanation: `MOCK modunda ${email} adresine gönderildi.`,
  };
}

module.exports = { sendMockInvoice, buildInvoiceHTML };
