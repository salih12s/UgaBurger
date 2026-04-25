const { Order, OrderItem, Product } = require('../models');
const { sendInvoiceForOrder, checkEFaturaPayer, getCreditBalance } = require('../services/einvoiceService');

// Ortak: order'ı items+product ile yükle
const loadOrderWithItems = async (id) => Order.findByPk(id, {
  include: [{ model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] }],
});

/**
 * Bir sipariş için fatura gönder (manuel/admin).
 * POST /api/admin/einvoice/orders/:id/send
 */
const sendForOrder = async (req, res) => {
  try {
    const order = await loadOrderWithItems(req.params.id);
    if (!order) return res.status(404).json({ error: 'Sipariş bulunamadı' });

    if (order.einvoice_status === 'sent' || order.einvoice_status === 'delivered') {
      return res.status(400).json({ error: 'Bu sipariş için fatura zaten gönderilmiş' });
    }

    // Fatura bilgileri eksikse reddet
    const isKurumsal = order.invoice_type === 'kurumsal';
    if (isKurumsal && !order.billing_tax_number) {
      return res.status(400).json({ error: 'Kurumsal fatura için VKN gerekli' });
    }
    if (!isKurumsal && !order.billing_tckn) {
      // TCKN olmadan da e-arşiv kesilebilir (11111111111 ile); uyarı olarak geç
    }

    const result = await sendInvoiceForOrder(order);

    await order.update({
      einvoice_uuid: result.uuid,
      einvoice_status: result.status === 'sent' ? 'sent' : 'failed',
      einvoice_error: result.error || null,
      einvoice_pdf_url: result.pdfUrl || null,
      einvoice_sent_at: result.status === 'sent' ? new Date() : null,
    });

    res.json({
      success: result.status === 'sent',
      uuid: result.uuid,
      invoiceId: result.invoiceId,
      isEarchive: result.isEarchive,
      pdfUrl: result.pdfUrl,
      error: result.error,
      raw: result.raw,
    });
  } catch (err) {
    console.error('[einvoice] sendForOrder hata:', err);
    res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
  }
};

/**
 * VKN/TCKN için e-fatura mükellefi sorgula.
 * GET /api/admin/einvoice/check/:identifier
 */
const checkPayer = async (req, res) => {
  try {
    const isPayer = await checkEFaturaPayer(req.params.identifier);
    res.json({ identifier: req.params.identifier, isEFaturaPayer: isPayer });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Kontör bakiyesi.
 * GET /api/admin/einvoice/credit
 */
const credit = async (req, res) => {
  try {
    const balance = await getCreditBalance();
    res.json({ balance });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

/**
 * Fatura durumu / PDF linki
 * GET /api/admin/einvoice/orders/:id
 */
const getInvoiceInfo = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id, {
      attributes: ['id', 'einvoice_uuid', 'einvoice_status', 'einvoice_error', 'einvoice_pdf_url', 'einvoice_sent_at',
        'invoice_type', 'billing_company_title', 'billing_tax_number', 'billing_tckn',
        'billing_first_name', 'billing_last_name', 'billing_email'],
    });
    if (!order) return res.status(404).json({ error: 'Sipariş bulunamadı' });
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

module.exports = { sendForOrder, checkPayer, credit, getInvoiceInfo };
