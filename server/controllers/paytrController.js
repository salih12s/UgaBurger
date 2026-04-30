const crypto = require('crypto');
const { Order, OrderItem, Product, Setting } = require('../models');
const sequelize = require('../config/db');

const PAYTR_API_URL = 'https://www.paytr.com/odeme/api/get-token';
const PAYTR_REFUND_URL = 'https://www.paytr.com/odeme/iade';
// Provizyon kapatma (capture) - pre-auth modunda alınmış ödemeleri finalize eder
const PAYTR_CAPTURE_URL = 'https://www.paytr.com/odeme/kapat';

// PayTR iFrame token oluştur
const getPaytrToken = async (req, res) => {
  try {
    const { order_id } = req.body;

    const order = await Order.findByPk(order_id, {
      include: [{ model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] }],
    });

    if (!order) return res.status(404).json({ error: 'Sipariş bulunamadı' });
    if (order.user_id !== req.user.id) return res.status(403).json({ error: 'Yetkisiz' });
    if (order.payment_status === 'paid') return res.status(400).json({ error: 'Bu sipariş zaten ödenmiş' });

    // ───────── DEV BYPASS ─────────
    // PAYTR_BYPASS=true ise PayTR'a hiç gitmeden ödemeyi "başarılı" say.
    // Sadece NODE_ENV=development için izinli. Canlıda yok sayılır.
    if (process.env.NODE_ENV !== 'production' && process.env.PAYTR_BYPASS === 'true') {
      const fakeMerchantOid = `BYPASS${order.id}T${Date.now()}`;
      await order.update({
        merchant_oid: fakeMerchantOid,
        payment_status: 'paid',
        status: 'pending',
      });
      console.log(`[BYPASS] Sipariş #${order.id} ödeme atlandı, paid olarak işaretlendi.`);
      // NOT: Otomatik e-fatura tetikleme buradan kaldırıldı; admin siparişi onayladığında gönderilecek.
      return res.json({ bypass: true, order_id: order.id, merchant_oid: fakeMerchantOid });
    }

    const merchantId = process.env.PAYTR_MERCHANT_ID;
    const merchantKey = process.env.PAYTR_MERCHANT_KEY;
    const merchantSalt = process.env.PAYTR_MERCHANT_SALT;

    if (!merchantId || !merchantKey || !merchantSalt) {
      return res.status(500).json({ error: 'PayTR yapılandırması eksik' });
    }

    // Kullanıcı bilgileri
    const userIp = req.headers['x-forwarded-for']?.split(',')[0]?.trim() || req.socket.remoteAddress || '127.0.0.1';
    const merchantOid = `SP${order.id}T${Date.now()}`;
    const email = req.user.email || 'musteri@ugaburger.com';
    const paymentAmount = Math.round(parseFloat(order.total_amount) * 100); // Kuruş cinsinden
    const userName = req.user.name || 'Müşteri';
    const userAddress = order.delivery_address || 'Adres bilgisi yok';
    const userPhone = req.user.phone || '05000000000';

    // Sepet
    const basketItems = order.items.map(item => [
      item.product?.name || 'Ürün',
      (parseFloat(item.unit_price) * item.quantity).toFixed(2),
      item.quantity
    ]);
    const userBasket = Buffer.from(JSON.stringify(basketItems)).toString('base64');

    // URL'ler
    const baseUrl = process.env.CLIENT_URL || 'https://www.ugaburger.com';
    const merchantOkUrl = `${baseUrl}/odeme-basarili?order=${order.id}`;
    const merchantFailUrl = `${baseUrl}/odeme-hatasi?order=${order.id}`;

    const noInstallment = 0;
    const maxInstallment = 0;
    const currency = 'TL';
    const testMode = process.env.PAYTR_TEST_MODE === '1' ? '1' : '0';
    const debugOn = 1;
    const timeoutLimit = 30;
    const lang = 'tr';

    // Hash oluştur
    const hashStr = `${merchantId}${userIp}${merchantOid}${email}${paymentAmount}${userBasket}${noInstallment}${maxInstallment}${currency}${testMode}`;
    const paytrToken = crypto.createHmac('sha256', merchantKey)
      .update(hashStr + merchantSalt)
      .digest('base64');

    // PayTR'a token isteği gönder
    const params = new URLSearchParams({
      merchant_id: merchantId,
      user_ip: userIp,
      merchant_oid: merchantOid,
      email,
      payment_amount: paymentAmount.toString(),
      paytr_token: paytrToken,
      user_basket: userBasket,
      debug_on: debugOn.toString(),
      no_installment: noInstallment.toString(),
      max_installment: maxInstallment.toString(),
      user_name: userName,
      user_address: userAddress,
      user_phone: userPhone,
      merchant_ok_url: merchantOkUrl,
      merchant_fail_url: merchantFailUrl,
      timeout_limit: timeoutLimit.toString(),
      currency,
      test_mode: testMode,
      lang,
    });

    const response = await fetch(PAYTR_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    });

    const result = await response.json();

    if (result.status === 'success') {
      // merchant_oid'i siparişe kaydet
      await order.update({ merchant_oid: merchantOid });
      res.json({ token: result.token, merchant_oid: merchantOid });
    } else {
      console.error('PayTR token hatası:', result.reason);
      res.status(400).json({ error: 'Ödeme başlatılamadı: ' + (result.reason || 'Bilinmeyen hata') });
    }
  } catch (err) {
    console.error('PayTR token hatası:', err);
    res.status(500).json({ error: 'Ödeme sistemi hatası' });
  }
};

// PayTR bildirim (callback) - 2. Adım
const paytrCallback = async (req, res) => {
  try {
    const { merchant_oid, status, total_amount, hash, failed_reason_code, failed_reason_msg, test_mode } = req.body;

    const merchantKey = process.env.PAYTR_MERCHANT_KEY;
    const merchantSalt = process.env.PAYTR_MERCHANT_SALT;

    // Hash doğrulama
    const expectedHash = crypto.createHmac('sha256', merchantKey)
      .update(merchant_oid + merchantSalt + status + total_amount)
      .digest('base64');

    if (hash !== expectedHash) {
      console.error('PayTR callback: hash doğrulama başarısız');
      return res.status(400).send('PAYTR notification failed: bad hash');
    }

    // Siparişi bul
    const order = await Order.findOne({ where: { merchant_oid } });
    if (!order) {
      console.error('PayTR callback: sipariş bulunamadı:', merchant_oid);
      return res.send('OK');
    }

    // Zaten işlenmiş mi?
    if (order.payment_status === 'paid' || order.payment_status === 'failed') {
      return res.send('OK');
    }

    if (status === 'success') {
      await order.update({
        payment_status: 'paid',
        status: 'pending',
      });
      console.log(`Sipariş #${order.id} ödeme başarılı (PayTR) - Bekleyene düştü`);
      // NOT: Otomatik e-fatura tetikleme buradan kaldırıldı; admin siparişi onayladığında gönderilecek.
    } else {
      await order.update({
        payment_status: 'failed',
        status: 'cancelled',
      });
      console.log(`Sipariş #${order.id} ödeme başarısız: ${failed_reason_msg || 'Bilinmiyor'}`);
    }

    // PayTR'a OK yanıtı döndür
    res.send('OK');
  } catch (err) {
    console.error('PayTR callback hatası:', err);
    res.send('OK');
  }
};

// PayTR iade işlemi (düşük seviyeli yardımcı)
// { merchant_oid, amount } -> PayTR API'sine iade isteği gönderir
const refundPaytrPayment = async (merchantOid, amount) => {
  const merchantId = process.env.PAYTR_MERCHANT_ID;
  const merchantKey = process.env.PAYTR_MERCHANT_KEY;
  const merchantSalt = process.env.PAYTR_MERCHANT_SALT;

  if (!merchantId || !merchantKey || !merchantSalt) {
    throw new Error('PayTR yapılandırması eksik');
  }
  if (!merchantOid) throw new Error('merchant_oid gerekli');
  if (!amount || amount <= 0) throw new Error('İade tutarı geçersiz');

  const returnAmount = parseFloat(amount).toFixed(2); // TL (PayTR iade endpointi TL bekler)
  const hashStr = `${merchantId}${merchantOid}${returnAmount}${merchantSalt}`;
  const paytrToken = crypto.createHmac('sha256', merchantKey).update(hashStr).digest('base64');

  const params = new URLSearchParams({
    merchant_id: merchantId,
    merchant_oid: merchantOid,
    return_amount: returnAmount,
    paytr_token: paytrToken,
  });

  const response = await fetch(PAYTR_REFUND_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const text = await response.text();
  let result;
  try { result = JSON.parse(text); } catch { result = { status: 'error', err_msg: text }; }

  if (result.status !== 'success') {
    throw new Error(result.err_msg || result.reason || 'PayTR iade başarısız');
  }
  return result;
};

// PayTR provizyon kapatma (capture) - pre-auth alınan ödemeyi tahsil eder
// Not: Sadece PayTR hesabınız "Ön Provizyon (pre-auth)" modunda ise gereklidir.
// Immediate capture modunda bu çağrı zararsızdır ve uyarı/fakat hata dönebilir.
const capturePaytrPayment = async (merchantOid) => {
  const merchantId = process.env.PAYTR_MERCHANT_ID;
  const merchantKey = process.env.PAYTR_MERCHANT_KEY;
  const merchantSalt = process.env.PAYTR_MERCHANT_SALT;

  if (!merchantId || !merchantKey || !merchantSalt) {
    throw new Error('PayTR yapılandırması eksik');
  }
  if (!merchantOid) throw new Error('merchant_oid gerekli');

  const hashStr = `${merchantId}${merchantOid}${merchantSalt}`;
  const paytrToken = crypto.createHmac('sha256', merchantKey).update(hashStr).digest('base64');

  const params = new URLSearchParams({
    merchant_id: merchantId,
    merchant_oid: merchantOid,
    paytr_token: paytrToken,
  });

  const response = await fetch(PAYTR_CAPTURE_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
  });

  const text = await response.text();
  let result;
  try { result = JSON.parse(text); } catch { result = { status: 'error', err_msg: text }; }

  if (result.status !== 'success') {
    throw new Error(result.err_msg || result.reason || 'PayTR provizyon kapatma başarısız');
  }
  return result;
};

// Admin: siparişin PayTR provizyonunu kapat (HTTP endpoint)
const captureOrder = async (req, res) => {
  try {
    const { order_id } = req.body;
    if (!order_id) return res.status(400).json({ error: 'order_id gerekli' });

    const order = await Order.findByPk(order_id);
    if (!order) return res.status(404).json({ error: 'Sipariş bulunamadı' });
    if (order.payment_method !== 'online') {
      return res.status(400).json({ error: 'Sadece online ödenen siparişler provizyondan kapatılabilir' });
    }
    if (!order.merchant_oid) {
      return res.status(400).json({ error: 'PayTR işlem referansı bulunamadı' });
    }
    if (order.payment_status === 'refunded') {
      return res.status(400).json({ error: 'Bu sipariş iade edilmiş' });
    }

    const result = await capturePaytrPayment(order.merchant_oid);
    res.json({ success: true, message: 'Provizyon kapatıldı (tahsil edildi)', result });
  } catch (err) {
    console.error('PayTR capture hatası:', err);
    res.status(500).json({ error: err.message || 'Provizyon kapatma başarısız' });
  }
};

// Admin: siparişi iade et (HTTP endpoint)
const refundOrder = async (req, res) => {
  try {
    const { order_id, amount } = req.body;
    if (!order_id) return res.status(400).json({ error: 'order_id gerekli' });

    const order = await Order.findByPk(order_id);
    if (!order) return res.status(404).json({ error: 'Sipariş bulunamadı' });

    if (order.payment_method !== 'online') {
      return res.status(400).json({ error: 'Sadece online ödenen siparişler iade edilebilir' });
    }
    if (order.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Bu sipariş ödenmemiş veya zaten iade edilmiş' });
    }
    if (!order.merchant_oid) {
      return res.status(400).json({ error: 'PayTR işlem referansı bulunamadı' });
    }

    const refundAmount = amount ? parseFloat(amount) : parseFloat(order.total_amount);
    if (refundAmount > parseFloat(order.total_amount)) {
      return res.status(400).json({ error: 'İade tutarı sipariş tutarını aşamaz' });
    }

    await refundPaytrPayment(order.merchant_oid, refundAmount);

    await order.update({
      payment_status: 'refunded',
      refund_amount: refundAmount,
      refunded_at: new Date(),
      status: 'cancelled',
    });

    res.json({ success: true, message: 'İade başarılı', refund_amount: refundAmount, order });
  } catch (err) {
    console.error('PayTR iade hatası:', err);
    res.status(500).json({ error: err.message || 'İade işlemi başarısız' });
  }
};

module.exports = { getPaytrToken, paytrCallback, refundOrder, refundPaytrPayment, capturePaytrPayment, captureOrder };
