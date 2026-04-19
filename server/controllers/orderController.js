const { Order, OrderItem, Product, User, Table, Setting, PromoCode } = require('../models');
const sequelize = require('../config/db');

const createOrder = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { items, order_type, table_id, delivery_address, order_note, payment_method, card_info, address_lat, address_lng } = req.body;

    // Online sipariş kapalıysa engelle
    const onlineSetting = await Setting.findOne({ where: { key: 'online_order_active' } });
    if (onlineSetting && onlineSetting.value !== 'true') {
      await t.rollback();
      return res.status(403).json({ error: 'Online sipariş şu anda kapalıdır.' });
    }

    // Teslimat bölgesi kontrolü
    if (address_lat && address_lng) {
      const [zoneSetting, latSetting, lngSetting] = await Promise.all([
        Setting.findOne({ where: { key: 'delivery_zones' } }),
        Setting.findOne({ where: { key: 'contact_lat' } }),
        Setting.findOne({ where: { key: 'contact_lng' } }),
      ]);
      const zones = zoneSetting ? JSON.parse(zoneSetting.value) : [];
      if (zones.length > 0 && latSetting && lngSetting) {
        const storeLat = parseFloat(latSetting.value);
        const storeLng = parseFloat(lngSetting.value);
        const R = 6371;
        const dLat = (storeLat - address_lat) * Math.PI / 180;
        const dLon = (storeLng - address_lng) * Math.PI / 180;
        const a = Math.sin(dLat / 2) ** 2 + Math.cos(address_lat * Math.PI / 180) * Math.cos(storeLat * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
        const dist = R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        const sortedZones = [...zones].sort((a, b) => a.radius - b.radius);
        const matchedZone = sortedZones.find(z => dist <= z.radius);
        if (!matchedZone) {
          await t.rollback();
          return res.status(400).json({ error: 'Teslimat adresiniz teslimat bölgemizin dışında kalmaktadır.' });
        }
      }
    }

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Sepetiniz boş' });
    }

    // Calculate total
    let total_amount = 0;
    const orderItemsData = [];

    for (const item of items) {
      const product = await Product.findByPk(item.product_id);
      if (!product) {
        await t.rollback();
        return res.status(400).json({ error: `Ürün bulunamadı: ${item.product_id}` });
      }

      let itemTotal = parseFloat(product.price) * item.quantity;
      const extras = item.extras || [];
      for (const extra of extras) {
        itemTotal += parseFloat(extra.price) * (extra.quantity || 1) * item.quantity;
      }

      total_amount += itemTotal;
      orderItemsData.push({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: product.price,
        extras: extras,
      });
    }

    const order = await Order.create({
      user_id: req.user.id,
      order_type: order_type || 'online',
      table_id: table_id || null,
      delivery_address: delivery_address || null,
      total_amount,
      order_note: order_note || '',
      payment_method: payment_method || 'online',
      status: 'pending',
      payment_status: 'pending',
      card_info: card_info || null,
      promo_code: null,
      discount_amount: 0,
    }, { transaction: t });

    // Apply promo code if provided
    const { promo_code } = req.body;
    if (promo_code) {
      const promo = await PromoCode.findOne({ where: { code: promo_code.toUpperCase(), is_active: true } });
      if (promo) {
        // Kullanıcı bu kodu daha önce kullandı mı kontrol et
        const alreadyUsed = await Order.findOne({
          where: { user_id: req.user.id, promo_code: promo.code },
          transaction: t,
        });
        if (alreadyUsed) {
          // Promo uygulamadan devam et
        } else {
          const now = new Date();
          const notExpired = !promo.expires_at || new Date(promo.expires_at) > now;
          const notMaxed = !promo.max_uses || promo.used_count < promo.max_uses;
          const meetsMin = total_amount >= parseFloat(promo.min_order_amount || 0);
          if (notExpired && notMaxed && meetsMin) {
            let discount = 0;
            if (promo.discount_type === 'percentage') {
              discount = total_amount * parseFloat(promo.discount_value) / 100;
            } else {
              discount = parseFloat(promo.discount_value);
            }
            discount = Math.min(discount, total_amount);
            total_amount = total_amount - discount;
            order.total_amount = total_amount;
            order.promo_code = promo.code;
            order.discount_amount = discount;
            await order.save({ transaction: t });
            promo.used_count += 1;
            await promo.save({ transaction: t });
          }
        }
      }
    }

    for (const itemData of orderItemsData) {
      await OrderItem.create({ ...itemData, order_id: order.id }, { transaction: t });
    }

    await t.commit();

    const fullOrder = await Order.findByPk(order.id, {
      include: [
        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'image_url'] }] },
      ],
    });

    res.status(201).json(fullOrder);
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
  }
};

const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.findAll({
      where: { user_id: req.user.id },
      include: [
        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'image_url'] }] },
      ],
      order: [['created_at', 'DESC']],
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
};

const validatePromoCode = async (req, res) => {
  try {
    const { code, order_total } = req.body;
    if (!code) return res.status(400).json({ error: 'Promosyon kodu gerekli' });

    const promo = await PromoCode.findOne({ where: { code: code.toUpperCase(), is_active: true } });
    if (!promo) return res.status(404).json({ error: 'Geçersiz promosyon kodu' });

    // Kullanıcı bu kodu daha önce kullandı mı?
    if (req.user) {
      const alreadyUsed = await Order.findOne({ where: { user_id: req.user.id, promo_code: promo.code } });
      if (alreadyUsed) return res.status(400).json({ error: 'Bu promosyon kodunu daha önce kullandınız' });
    }

    const now = new Date();
    if (promo.expires_at && new Date(promo.expires_at) <= now) {
      return res.status(400).json({ error: 'Bu promosyon kodunun süresi dolmuş' });
    }
    if (promo.max_uses && promo.used_count >= promo.max_uses) {
      return res.status(400).json({ error: 'Bu promosyon kodu kullanım limitine ulaşmış' });
    }
    const total = parseFloat(order_total || 0);
    if (total < parseFloat(promo.min_order_amount || 0)) {
      return res.status(400).json({ error: `Minimum sipariş tutarı: ${parseFloat(promo.min_order_amount).toFixed(2)} TL` });
    }

    let discount = 0;
    if (promo.discount_type === 'percentage') {
      discount = total * parseFloat(promo.discount_value) / 100;
    } else {
      discount = parseFloat(promo.discount_value);
    }
    discount = Math.min(discount, total);

    res.json({
      valid: true,
      code: promo.code,
      discount_type: promo.discount_type,
      discount_value: parseFloat(promo.discount_value),
      discount_amount: parseFloat(discount.toFixed(2)),
      new_total: parseFloat((total - discount).toFixed(2)),
    });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
};

module.exports = { createOrder, getMyOrders, validatePromoCode };
