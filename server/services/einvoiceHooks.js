/**
 * Sipariş için otomatik e-fatura tetikleyici.
 * EINVOICE_AUTO_SEND=true ise çalışır. Hatalar log'lanır, akışı bozmaz.
 */
const { OrderItem, Product } = require('../models');
const { sendInvoiceForOrder } = require('./einvoiceService');

async function autoSendInvoiceForOrder(order) {
  try {
    if (String(process.env.EINVOICE_AUTO_SEND).toLowerCase() !== 'true') return;
    if (!order) return;
    if (order.einvoice_status === 'sent' || order.einvoice_status === 'delivered') return;

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
    const fallbackEnabled = String(process.env.EINVOICE_PREVIEW_EMAIL_FALLBACK || 'true').toLowerCase() === 'true';
    if (result.status === 'failed' && fallbackEnabled && order.billing_email) {
      try {
        const svc = require('./einvoiceService');
        if (typeof svc.sendDraftPreviewByEmail === 'function') {
          const mail = await svc.sendDraftPreviewByEmail(order, { addDraftWatermark: true });
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
    console.log(`[einvoice] Siparis #${order.id} fatura: ${einvoiceStatus} (${result.isEarchive ? 'e-arsiv' : 'e-fatura'})${mailInfo}${errInfo}`);
  } catch (err) {
    console.error(`[einvoice] Otomatik gönderim hatası (sipariş #${order?.id}):`, err.message);
  }
}

module.exports = { autoSendInvoiceForOrder };
