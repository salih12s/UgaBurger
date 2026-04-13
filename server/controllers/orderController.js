const { Order, OrderItem, Product, User, Table, Setting } = require('../models');
const sequelize = require('../config/db');

const createOrder = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { items, order_type, table_id, delivery_address, order_note, payment_method, card_info } = req.body;

    // Online sipariş kapalıysa engelle
    const onlineSetting = await Setting.findOne({ where: { key: 'online_order_active' } });
    if (onlineSetting && onlineSetting.value !== 'true') {
      await t.rollback();
      return res.status(403).json({ error: 'Online sipariş şu anda kapalıdır.' });
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
        itemTotal += parseFloat(extra.price) * item.quantity;
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
    }, { transaction: t });

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

module.exports = { createOrder, getMyOrders };
