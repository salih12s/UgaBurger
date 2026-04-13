const { Op } = require('sequelize');
const sequelize = require('../config/db');
const { Order, OrderItem, Product, User, Table, Category, Extra, ProductExtra, Setting } = require('../models');
const multer = require('multer');
const path = require('path');

// --- ORDER MANAGEMENT ---
const getAllOrders = async (req, res) => {
  try {
    const where = {};
    if (req.query.status) where.status = req.query.status;
    if (req.query.order_type) where.order_type = req.query.order_type;

    const orders = await Order.findAll({
      where,
      include: [
        { model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'phone'] },
        { model: Table, as: 'table', attributes: ['id', 'table_number'] },
        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'image_url'] }] },
      ],
      order: [['created_at', 'DESC']],
    });
    res.json(orders);
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
  }
};

const updateOrderStatus = async (req, res) => {
  try {
    const order = await Order.findByPk(req.params.id);
    if (!order) return res.status(404).json({ error: 'Sipariş bulunamadı' });

    const { status } = req.body;
    order.status = status;

    // Payment: charge on confirm, fail on cancel
    if (status === 'confirmed' && order.card_info) {
      order.payment_status = 'paid';
    }
    if (status === 'cancelled') {
      order.payment_status = 'failed';
    }

    await order.save();
    res.json(order);
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
};

// --- QUICK TABLE ORDER (by admin) ---
const createQuickOrder = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { items, table_id, order_note, payment_method } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ error: 'Ürün seçiniz' });
    }

    let total_amount = 0;
    const orderItemsData = [];

    for (const item of items) {
      const product = await Product.findByPk(item.product_id);
      if (!product) { await t.rollback(); return res.status(400).json({ error: `Ürün bulunamadı` }); }

      const unitPrice = item.unit_price_override !== undefined ? parseFloat(item.unit_price_override) : parseFloat(product.price);
      let itemTotal = unitPrice * item.quantity;
      const extras = item.extras || [];
      if (unitPrice > 0) {
        for (const extra of extras) { itemTotal += parseFloat(extra.price) * item.quantity; }
      }

      total_amount += itemTotal;
      orderItemsData.push({ product_id: item.product_id, quantity: item.quantity, unit_price: unitPrice, extras });
    }

    const order = await Order.create({
      user_id: null,
      order_type: 'table',
      table_id: table_id || null,
      total_amount,
      order_note: order_note || '',
      status: 'preparing',
      payment_status: payment_method === 'card' ? 'paid' : 'pending',
      payment_method: payment_method === 'card' ? 'online' : 'door',
    }, { transaction: t });

    for (const itemData of orderItemsData) {
      await OrderItem.create({ ...itemData, order_id: order.id }, { transaction: t });
    }

    await t.commit();

    const fullOrder = await Order.findByPk(order.id, {
      include: [
        { model: Table, as: 'table' },
        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'image_url'] }] },
      ],
    });

    res.status(201).json(fullOrder);
  } catch (err) {
    await t.rollback();
    res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
  }
};

// --- TABLE MANAGEMENT ---
const getTables = async (req, res) => {
  try {
    const tables = await Table.findAll({ order: [['table_number', 'ASC']] });
    res.json(tables);
  } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); }
};

const createTable = async (req, res) => {
  try {
    const table = await Table.create({ table_number: req.body.table_number });
    res.status(201).json(table);
  } catch (err) { res.status(500).json({ error: 'Sunucu hatası: ' + err.message }); }
};

const updateTable = async (req, res) => {
  try {
    const table = await Table.findByPk(req.params.id);
    if (!table) return res.status(404).json({ error: 'Masa bulunamadı' });
    await table.update(req.body);
    res.json(table);
  } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); }
};

const deleteTable = async (req, res) => {
  try {
    const table = await Table.findByPk(req.params.id);
    if (!table) return res.status(404).json({ error: 'Masa bulunamadı' });
    await table.destroy();
    res.json({ message: 'Masa silindi' });
  } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); }
};

// --- PRODUCT MANAGEMENT ---
const getAllProductsAdmin = async (req, res) => {
  try {
    const products = await Product.findAll({
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name'] },
        { model: Extra, as: 'extras', through: { attributes: [] } },
      ],
      order: [['category_id', 'ASC'], ['sort_order', 'ASC']],
    });
    res.json(products);
  } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); }
};

const createProduct = async (req, res) => {
  try {
    const { name, description, price, category_id, image_url, is_available, sort_order, extra_ids } = req.body;
    const product = await Product.create({ name, description, price, category_id, image_url: image_url || '', is_available: is_available !== false, sort_order: sort_order || 0 });

    if (extra_ids && extra_ids.length > 0) {
      for (const eid of extra_ids) { await ProductExtra.create({ product_id: product.id, extra_id: eid }); }
    }

    const full = await Product.findByPk(product.id, { include: [{ model: Category, as: 'category' }, { model: Extra, as: 'extras', through: { attributes: [] } }] });
    res.status(201).json(full);
  } catch (err) { res.status(500).json({ error: 'Sunucu hatası: ' + err.message }); }
};

const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ error: 'Ürün bulunamadı' });

    const { name, description, price, category_id, image_url, is_available, sort_order, extra_ids } = req.body;
    await product.update({ name, description, price, category_id, image_url, is_available, sort_order });

    if (extra_ids !== undefined) {
      await ProductExtra.destroy({ where: { product_id: product.id } });
      for (const eid of extra_ids) { await ProductExtra.create({ product_id: product.id, extra_id: eid }); }
    }

    const full = await Product.findByPk(product.id, { include: [{ model: Category, as: 'category' }, { model: Extra, as: 'extras', through: { attributes: [] } }] });
    res.json(full);
  } catch (err) { res.status(500).json({ error: 'Sunucu hatası: ' + err.message }); }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ error: 'Ürün bulunamadı' });
    await ProductExtra.destroy({ where: { product_id: product.id } });
    await product.destroy();
    res.json({ message: 'Ürün silindi' });
  } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); }
};

// --- CATEGORY MANAGEMENT ---
const createCategory = async (req, res) => {
  try {
    const cat = await Category.create(req.body);
    res.status(201).json(cat);
  } catch (err) { res.status(500).json({ error: 'Sunucu hatası: ' + err.message }); }
};

const updateCategory = async (req, res) => {
  try {
    const cat = await Category.findByPk(req.params.id);
    if (!cat) return res.status(404).json({ error: 'Kategori bulunamadı' });
    await cat.update(req.body);
    res.json(cat);
  } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); }
};

// --- EXTRA MANAGEMENT ---
const getExtras = async (req, res) => {
  try {
    const extras = await Extra.findAll({ order: [['name', 'ASC']] });
    res.json(extras);
  } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); }
};

const createExtra = async (req, res) => {
  try {
    const extra = await Extra.create(req.body);
    res.status(201).json(extra);
  } catch (err) { res.status(500).json({ error: 'Sunucu hatası: ' + err.message }); }
};

const updateExtra = async (req, res) => {
  try {
    const extra = await Extra.findByPk(req.params.id);
    if (!extra) return res.status(404).json({ error: 'Ekstra bulunamadı' });
    await extra.update(req.body);
    res.json(extra);
  } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); }
};

const deleteExtra = async (req, res) => {
  try {
    const extra = await Extra.findByPk(req.params.id);
    if (!extra) return res.status(404).json({ error: 'Ekstra bulunamadı' });
    await ProductExtra.destroy({ where: { extra_id: extra.id } });
    await extra.destroy();
    res.json({ message: 'Ekstra silindi' });
  } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); }
};

// --- IMAGE UPLOAD ---
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../uploads')),
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});
const upload = multer({ storage, limits: { fileSize: 5 * 1024 * 1024 }, fileFilter: (req, file, cb) => {
  const allowed = /jpeg|jpg|png|gif|webp/;
  const ext = allowed.test(path.extname(file.originalname).toLowerCase());
  const mime = allowed.test(file.mimetype);
  if (ext && mime) cb(null, true);
  else cb(new Error('Sadece resim dosyaları yüklenebilir'));
}});

const uploadImage = (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Dosya bulunamadı' });
  res.json({ url: `/uploads/${req.file.filename}` });
};

// --- REPORTS ---
const getDailyReport = async (req, res) => {
  try {
    const startDate = req.query.startDate || req.query.date || new Date().toISOString().split('T')[0];
    const endDate = req.query.endDate || startDate;
    const startOfDay = new Date(startDate + 'T00:00:00');
    const endOfDay = new Date(endDate + 'T23:59:59');

    const orders = await Order.findAll({
      where: {
        created_at: { [Op.between]: [startOfDay, endOfDay] },
        status: { [Op.notIn]: ['cancelled'] },
      },
      include: [
        { model: OrderItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id', 'name'] }] },
        { model: User, as: 'user', attributes: ['id', 'first_name', 'last_name', 'phone'] },
        { model: Table, as: 'table', attributes: ['id', 'table_number'] },
      ],
      order: [['created_at', 'DESC']],
    });

    const totalOrders = orders.length;
    const totalRevenue = orders.reduce((sum, o) => sum + parseFloat(o.total_amount), 0);
    const onlineOrdersList = orders.filter(o => o.order_type === 'online');
    const tableOrdersList = orders.filter(o => o.order_type === 'table');
    const onlineOrders = onlineOrdersList.length;
    const tableOrders = tableOrdersList.length;
    const onlineRevenue = onlineOrdersList.reduce((sum, o) => sum + parseFloat(o.total_amount), 0);
    const tableRevenue = tableOrdersList.reduce((sum, o) => sum + parseFloat(o.total_amount), 0);

    // Product stats
    const productStats = {};
    for (const order of orders) {
      for (const item of order.items) {
        const name = item.product?.name || 'Bilinmeyen';
        if (!productStats[name]) productStats[name] = { name, quantity: 0, revenue: 0 };
        productStats[name].quantity += item.quantity;
        productStats[name].revenue += parseFloat(item.unit_price) * item.quantity;
      }
    }

    // Order details for listing
    const orderDetails = orders.map(o => ({
      id: o.id,
      order_type: o.order_type,
      total_amount: o.total_amount,
      status: o.status,
      payment_method: o.payment_method,
      created_at: o.createdAt,
      user: o.user,
      table: o.table,
      delivery_address: o.delivery_address,
      items: o.items.map(it => ({
        name: it.product?.name || 'Bilinmeyen',
        quantity: it.quantity,
        unit_price: it.unit_price,
        extras: it.extras,
      })),
    }));

    res.json({
      startDate,
      endDate,
      totalOrders,
      totalRevenue,
      onlineOrders,
      tableOrders,
      onlineRevenue,
      tableRevenue,
      avgOrderAmount: totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0,
      productStats: Object.values(productStats).sort((a, b) => b.quantity - a.quantity),
      orderDetails,
    });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
  }
};

// --- SETTINGS ---
const getSettings = async (req, res) => {
  try {
    const settings = await Setting.findAll();
    const obj = {};
    settings.forEach(s => { obj[s.key] = s.value; });
    res.json(obj);
  } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); }
};

const updateSetting = async (req, res) => {
  try {
    const { key, value } = req.body;
    const [setting] = await Setting.upsert({ key, value });
    res.json(setting);
  } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); }
};

module.exports = {
  getAllOrders, updateOrderStatus, createQuickOrder,
  getTables, createTable, updateTable, deleteTable,
  getAllProductsAdmin, createProduct, updateProduct, deleteProduct,
  createCategory, updateCategory,
  getExtras, createExtra, updateExtra, deleteExtra,
  upload, uploadImage,
  getDailyReport,
  getSettings, updateSetting,
};
