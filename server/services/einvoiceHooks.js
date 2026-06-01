/**
 * Sipariş için otomatik e-fatura tetikleyici.
 * EINVOICE_AUTO_SEND=true ise çalışır. Hatalar log'lanır, akışı bozmaz.
 */
const fs = require('fs');
const path = require('path');
const { OrderItem, Product } = require('../models');
const { sendInvoiceForOrder } = require('./einvoiceService');

const LOG_FILE = path.join(__dirname, '..', 'einvoice.log');
function flog(msg) {
  try {
    const line = `[${new Date().toISOString()}] ${msg}\n`;
    fs.appendFileSync(LOG_FILE, line);
    console.log(msg);
  } catch {}
}

async function autoSendInvoiceForOrder(order) {
  try {
    flog(`[einvoice] HOOK CAGRILDI - siparis #${order?.id} status=${order?.status} payment=${order?.payment_status} einv=${order?.einvoice_status} email=${order?.billing_email}`);
    if (String(process.env.EINVOICE_AUTO_SEND).toLowerCase() !== 'true') {
      flog(`[einvoice] EINVOICE_AUTO_SEND=${process.env.EINVOICE_AUTO_SEND} -> ATLANDI`);
      return;
    }
    if (!order) return;
    // Dedupe: zaten gonderilmis / onizleme maili gitmis siparislerde tekrar gonderme.
    // 'draft' (kontor/gonderim hatasi) ve 'failed' yeniden denenir.
    const alreadyHandled = ['sent', 'delivered', 'preview_sent'];
    if (order.einvoice_status && alreadyHandled.includes(order.einvoice_status)) {
      flog(`[einvoice] ZATEN ${order.einvoice_status} -> ATLANDI`);
      return;
    }

    // items yüklü değilse yükle
    if (!order.items) {
      order.items = await OrderItem.findAll({
        where: { order_id: order.id },
        include: [{ model: Product, as: 'product' }],
      });
    }

    const result = await sendInvoiceForOrder(order);

    // Durum eslemesi:
    //  - sent  : GIB'e iletildi -> 'sent'
    //  - draft : portala taslak yuklendi (kontor yetersiz vs.)
    //            mail.status === 'sent' ise musteri PDF'i aldi -> 'preview_sent'
    //            yoksa -> 'draft'
    //  - diger : 'failed'
    // Eger ana akis 'failed' dondu ama fallback aktifse, draft preview email'i son care olarak deneyelim.
    const fallbackEnabled = String(process.env.EINVOICE_PREVIEW_EMAIL_FALLBACK || 'false').toLowerCase() === 'true';
    if (result.status === 'failed' && fallbackEnabled && order.billing_email) {
      try {
        const svc = require('./einvoiceService');
        if (typeof svc.sendDraftPreviewByEmail === 'function') {
          const mail = await svc.sendDraftPreviewByEmail(order, { addDraftWatermark: false });
          result.mail = mail;
          if (mail && mail.status === 'sent') {
            result.status = 'draft';
          }
        }
      } catch (mailErr) {
        console.warn(`[einvoice] Fallback mail hatasi (siparis #${order.id}):`, mailErr.message);
      }
    }

    let einvoiceStatus;
    let sentAt = null;
    if (result.status === 'sent') {
      einvoiceStatus = 'sent';
      sentAt = new Date();
    } else if (result.status === 'draft') {
      einvoiceStatus = (result.mail && result.mail.status === 'sent') ? 'preview_sent' : 'draft';
      if (result.mail && result.mail.status === 'sent') sentAt = new Date();
    } else {
      einvoiceStatus = 'failed';
    }

    await order.update({
      einvoice_uuid: result.uuid,
      einvoice_status: einvoiceStatus,
      einvoice_error: (einvoiceStatus === 'failed' || einvoiceStatus === 'draft') ? (result.error || null) : null,
      einvoice_pdf_url: result.pdfUrl || null,
      einvoice_sent_at: sentAt,
    });
    const mailInfo = result.mail ? ` mail=${result.mail.status}` : '';
    const errInfo = (einvoiceStatus === 'failed' || einvoiceStatus === 'draft') && result.error ? ` err="${result.error}"` : '';
    flog(`[einvoice] Siparis #${order.id} fatura: ${einvoiceStatus} (${result.isEarchive ? 'e-arsiv' : 'e-fatura'})${mailInfo}${errInfo}`);
  } catch (err) {
    flog(`[einvoice] HATA siparis #${order?.id}: ${err.message}\n${err.stack || ''}`);
  }
}

module.exports = { autoSendInvoiceForOrder };
