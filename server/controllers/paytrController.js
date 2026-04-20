const crypto = require('crypto');
const { Order, OrderItem, Product, Setting } = require('../models');
const sequelize = require('../config/db');

const PAYTR_API_URL = 'https://www.paytr.com/odeme/api/get-token';

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

module.exports = { getPaytrToken, paytrCallback };
