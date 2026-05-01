const { Op } = require('sequelize');
const sequelize = require('../config/db');
const { Order, OrderItem, Product, User, Table, Category, Extra, ProductExtra, Setting, PromoCode, OptionGroup, OptionGroupItem, ProductOptionGroup } = require('../models');
const { refundPaytrPayment, capturePaytrPayment } = require('./paytrController');
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
        { model: Table, as: 'table', attributes: ['id', 'table_number', 'table_name'] },
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

    const { status, table_id } = req.body;
    const prevStatus = order.status;

    // Online sipariş + online ödeme + henüz 'paid' değilse onay/preparing/ready/delivered/confirmed
    // statüsüne geçmesine izin verme. (PayTR akışında müşteri ödemeyi tamamlayınca paytr callback
    // payment_status='paid' yapar.) İptal her zaman serbest.
    const advanceStatuses = ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'];
    if (status && advanceStatuses.includes(status)
        && order.order_type === 'online'
        && order.payment_method === 'online'
        && order.payment_status !== 'paid') {
      return res.status(400).json({ error: 'Müşteri online ödemeyi tamamlamadan sipariş onaylanamaz.' });
    }

    if (status) order.status = status;
    if (table_id !== undefined) order.table_id = table_id || null;

    // Payment: charge on confirm, fail on cancel
    if (status === 'confirmed' && order.card_info) {
      order.payment_status = 'paid';
    }

    // Admin sipariş onayında (pending -> preparing/confirmed) online ödeme provizyonunu kapat
    // SADECE PayTR hesabı pre-auth modundaysa gerekli. Immediate capture (default) modunda
    // PayTR endpoint'i HTML/Cloudflare sayfası dönebiliyor; bu çağrıyı atlıyoruz.
    // Etkinleştirmek için: PAYTR_PREAUTH_MODE=true env'i ekleyin.
    const preauthEnabled = String(process.env.PAYTR_PREAUTH_MODE || 'false').toLowerCase() === 'true';
    let captureInfo = null;
    if (preauthEnabled
        && (status === 'preparing' || status === 'confirmed')
        && order.payment_method === 'online'
        && order.payment_status === 'paid'
        && order.merchant_oid) {
      try {
        await capturePaytrPayment(order.merchant_oid);
        captureInfo = { captured: true };
      } catch (captureErr) {
        // Provizyon kapatma başarısız olsa bile sipariş onayını engelleme (log et, devam et)
        const shortMsg = String(captureErr.message || '').slice(0, 200);
        console.warn(`PayTR capture uyarısı (sipariş #${order.id}): ${shortMsg}`);
        captureInfo = { captured: false, reason: shortMsg };
      }
    }

    // İptal ediliyorsa ve online ödeme alınmışsa otomatik PayTR iadesi
    let refundInfo = null;
    if (status === 'cancelled') {
      if (order.payment_method === 'online' && order.payment_status === 'paid' && order.merchant_oid) {
        try {
          await refundPaytrPayment(order.merchant_oid, parseFloat(order.total_amount));
          order.payment_status = 'refunded';
          order.refund_amount = parseFloat(order.total_amount);
          order.refunded_at = new Date();
          refundInfo = { refunded: true, amount: parseFloat(order.total_amount) };
        } catch (refundErr) {
          console.error('Otomatik iade hatası:', refundErr.message);
          await order.save();
          return res.status(502).json({
            error: 'Sipariş iptal edilemedi: iade başarısız - ' + refundErr.message,
            refund_failed: true,
          });
        }
      } else if (order.payment_status !== 'paid') {
        order.payment_status = 'failed';
      }
    }

    await order.save();

    // Admin sipariş onayında otomatik e-fatura/e-arşiv:
    //  - pending → onaylandı (preparing/confirmed/ready/out_for_delivery/delivered) geçişinde
    //  - online ödeme (paid) ise tetikle
    //  - hook kendi içinde dedupe yapar (zaten 'sent'/'delivered' ise atlar)
    const approvedStatuses = ['confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered'];
    if (status && status !== prevStatus
        && approvedStatuses.includes(status)
        && order.payment_status === 'paid') {
      try {
        const { autoSendInvoiceForOrder } = require('../services/einvoiceHooks');
        autoSendInvoiceForOrder(order);
      } catch (e) { console.warn('einvoice hook:', e.message); }
    }

    res.json({ ...order.toJSON(), refund: refundInfo, capture: captureInfo });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
  }
};

// --- QUICK TABLE ORDER (by admin) ---
const createQuickOrder = async (req, res) => {
  const t = await sequelize.transaction();
  try {
    const { items, table_id, order_note, payment_method, customer_name, customer_phone, delivery_address, cash_amount } = req.body;

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
        for (const extra of extras) { itemTotal += parseFloat(extra.price) * (extra.quantity || 1) * item.quantity; }
      }

      total_amount += itemTotal;
      orderItemsData.push({ product_id: item.product_id, quantity: item.quantity, unit_price: unitPrice, extras });
    }

    // --- Split payment (kısmi nakit) hesaplama ---
    // cash_amount: müşteriden alınan nakit tutar. 0 < cash_amount < total ise kalan kısmı kart sayılır.
    let parsedCash = (cash_amount === undefined || cash_amount === null || cash_amount === '') ? null : parseFloat(cash_amount);
    if (parsedCash !== null && (isNaN(parsedCash) || parsedCash < 0)) parsedCash = null;
    if (parsedCash !== null && parsedCash > total_amount) parsedCash = total_amount;

    let resolvedPaymentMethod;
    let resolvedPaymentStatus;
    let storedCashAmount = null;
    if (parsedCash !== null && parsedCash > 0 && parsedCash < total_amount) {
      // Split: nakit + kart
      resolvedPaymentMethod = 'card';
      resolvedPaymentStatus = 'paid';
      storedCashAmount = parsedCash;
    } else if (parsedCash !== null && parsedCash >= total_amount && total_amount > 0) {
      // Tamamı nakit (split kutusu doldurulmuş ama tüm tutar)
      resolvedPaymentMethod = 'door';
      resolvedPaymentStatus = 'pending';
      storedCashAmount = null;
    } else {
      // cash_amount yok veya 0 → seçili payment_method'u kullan
      resolvedPaymentMethod = payment_method === 'card' ? 'card' : 'door';
      resolvedPaymentStatus = payment_method === 'card' ? 'paid' : 'pending';
      storedCashAmount = null;
    }

    const order = await Order.create({
      user_id: null,
      order_type: 'table',
      table_id: table_id || null,
      delivery_address: delivery_address || null,
      total_amount,
      order_note: order_note || '',
      status: 'preparing',
      payment_status: resolvedPaymentStatus,
      payment_method: resolvedPaymentMethod,
      cash_amount: storedCashAmount,
      customer_name: customer_name || null,
      customer_phone: customer_phone || null,
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
    const table = await Table.create({ table_number: req.body.table_number, table_name: req.body.table_name || null });
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
        {
          model: OptionGroup,
          as: 'optionGroups',
          through: { attributes: [] },
          include: [{ model: OptionGroupItem, as: 'items', include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'price', 'image_url'] }] }],
        },
      ],
      order: [
        ['category_id', 'ASC'],
        ['sort_order', 'ASC'],
        [{ model: OptionGroup, as: 'optionGroups' }, 'sort_order', 'ASC'],
      ],
    });
    res.json(products);
  } catch (err) { res.status(500).json({ error: 'Sunucu hatası: ' + err.message }); }
};

const createProduct = async (req, res) => {
  try {
    const { name, description, price, category_id, image_url, is_available, is_suggested, is_online_sale, is_quick_order, sort_order, extra_ids, option_group_ids } = req.body;
    const product = await Product.create({
      name, description, price, category_id,
      image_url: image_url || '',
      is_available: is_available !== false,
      is_suggested: !!is_suggested,
      is_online_sale: is_online_sale !== false,
      is_quick_order: is_quick_order !== false,
      sort_order: sort_order || 0,
    });

    if (extra_ids && extra_ids.length > 0) {
      for (const eid of extra_ids) { await ProductExtra.create({ product_id: product.id, extra_id: eid }); }
    }
    if (option_group_ids && option_group_ids.length > 0) {
      for (const ogid of option_group_ids) { await ProductOptionGroup.create({ product_id: product.id, option_group_id: ogid }); }
    }

    const full = await Product.findByPk(product.id, {
      include: [
        { model: Category, as: 'category' },
        { model: Extra, as: 'extras', through: { attributes: [] } },
        { model: OptionGroup, as: 'optionGroups', through: { attributes: [] } },
      ],
    });
    res.status(201).json(full);
  } catch (err) { res.status(500).json({ error: 'Sunucu hatası: ' + err.message }); }
};

const updateProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ error: 'Ürün bulunamadı' });

    const { name, description, price, category_id, image_url, is_available, is_suggested, is_online_sale, is_quick_order, sort_order, extra_ids, option_group_ids } = req.body;
    const patch = { name, description, price, category_id, image_url, is_available, sort_order };
    if (is_suggested !== undefined) patch.is_suggested = !!is_suggested;
    if (is_online_sale !== undefined) patch.is_online_sale = !!is_online_sale;
    if (is_quick_order !== undefined) patch.is_quick_order = !!is_quick_order;
    await product.update(patch);

    if (extra_ids !== undefined) {
      await ProductExtra.destroy({ where: { product_id: product.id } });
      for (const eid of extra_ids) { await ProductExtra.create({ product_id: product.id, extra_id: eid }); }
    }
    if (option_group_ids !== undefined) {
      await ProductOptionGroup.destroy({ where: { product_id: product.id } });
      for (const ogid of option_group_ids) { await ProductOptionGroup.create({ product_id: product.id, option_group_id: ogid }); }
    }

    const full = await Product.findByPk(product.id, {
      include: [
        { model: Category, as: 'category' },
        { model: Extra, as: 'extras', through: { attributes: [] } },
        { model: OptionGroup, as: 'optionGroups', through: { attributes: [] } },
      ],
    });
    res.json(full);
  } catch (err) { res.status(500).json({ error: 'Sunucu hatası: ' + err.message }); }
};

const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id);
    if (!product) return res.status(404).json({ error: 'Ürün bulunamadı' });
    await ProductExtra.destroy({ where: { product_id: product.id } });
    await ProductOptionGroup.destroy({ where: { product_id: product.id } });
    await OptionGroupItem.destroy({ where: { product_id: product.id } });
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

const deleteCategory = async (req, res) => {
  try {
    const cat = await Category.findByPk(req.params.id);
    if (!cat) return res.status(404).json({ error: 'Kategori bulunamadı' });
    const productCount = await Product.count({ where: { category_id: cat.id } });
    if (productCount > 0) return res.status(400).json({ error: `Bu kategoride ${productCount} ürün var. Önce ürünleri silin veya başka kategoriye taşıyın.` });
    await cat.destroy();
    res.json({ message: 'Kategori silindi' });
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
// NOT: Önceden multer.diskStorage ile resimler server/uploads/ klasörüne kaydediliyordu.
// Railway / Plesk Node container gibi ephemeral filesystem'lerde bu klasör her
// yeniden başlatma / deploy sonrası siliniyor ve menüdeki resimler bozuluyordu.
// Artık dosyayı bellekte tutup base64 data URL olarak DB'ye kaydediyoruz; böylece
// resim ürünle birlikte kalıcı oluyor.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 8 * 1024 * 1024 }, // 8MB (hero/arkaplan fotoğrafları için)
  fileFilter: (req, file, cb) => {
    const allowed = /jpeg|jpg|png|gif|webp/;
    const ext = allowed.test(path.extname(file.originalname).toLowerCase());
    const mime = allowed.test(file.mimetype);
    if (ext && mime) cb(null, true);
    else cb(new Error('Sadece resim dosyaları yüklenebilir'));
  },
});

const uploadImage = (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'Dosya bulunamadı' });
  const mime = req.file.mimetype || 'image/jpeg';
  const base64 = req.file.buffer.toString('base64');
  const dataUrl = `data:${mime};base64,${base64}`;
  res.json({ url: dataUrl });
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
        { model: Table, as: 'table', attributes: ['id', 'table_number', 'table_name'] },
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

    // Nakit/Kart kırılımı (split ödemeler dahil)
    let cashRevenue = 0;
    let cardRevenue = 0;
    for (const o of orders) {
      const tot = parseFloat(o.total_amount) || 0;
      const ca = (o.cash_amount === null || o.cash_amount === undefined) ? null : parseFloat(o.cash_amount);
      if (ca !== null && ca > 0 && ca < tot) {
        cashRevenue += ca;
        cardRevenue += tot - ca;
      } else if (o.payment_method === 'card' || o.payment_method === 'online') {
        cardRevenue += tot;
      } else {
        cashRevenue += tot;
      }
    }

    // Product stats - indirim oranına göre düzeltilmiş
    const productStats = {};
    for (const order of orders) {
      const discountAmount = parseFloat(order.discount_amount) || 0;
      const totalAmount = parseFloat(order.total_amount);
      const originalTotal = totalAmount + discountAmount;
      const paidRatio = originalTotal > 0 ? totalAmount / originalTotal : 1;

      for (const item of order.items) {
        const name = item.product?.name || 'Bilinmeyen';
        if (!productStats[name]) productStats[name] = { name, quantity: 0, revenue: 0 };
        productStats[name].quantity += item.quantity;
        let itemRevenue = parseFloat(item.unit_price) * item.quantity;
        // Ekstra fiyatlarını da ekle
        if (item.extras && Array.isArray(item.extras)) {
          for (const ex of item.extras) {
            itemRevenue += parseFloat(ex.price || 0) * (ex.quantity || 1) * item.quantity;
          }
        }
        productStats[name].revenue += itemRevenue * paidRatio;
      }
    }

    // Order details for listing
    const orderDetails = orders.map(o => ({
      id: o.id,
      order_type: o.order_type,
      total_amount: o.total_amount,
      status: o.status,
      payment_method: o.payment_method,
      cash_amount: o.cash_amount,
      created_at: o.createdAt,
      user: o.user,
      table: o.table,
      delivery_address: o.delivery_address,
      customer_name: o.customer_name,
      customer_phone: o.customer_phone,
      promo_code: o.promo_code,
      discount_amount: o.discount_amount,
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
      cashRevenue,
      cardRevenue,
      avgOrderAmount: totalOrders > 0 ? (totalRevenue / totalOrders).toFixed(2) : 0,
      productStats: Object.values(productStats).sort((a, b) => b.quantity - a.quantity),
      orderDetails,
    });
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
  }
};

// --- USER MANAGEMENT ---
const getAllUsers = async (req, res) => {
  try {
    const users = await User.findAll({
      attributes: ['id', 'first_name', 'last_name', 'email', 'phone', 'role', 'addresses', 'created_at'],
      order: [['created_at', 'DESC']],
    });
    // Count orders per user
    const usersWithStats = await Promise.all(users.map(async (u) => {
      const orderCount = await Order.count({ where: { user_id: u.id } });
      const totalSpent = await Order.sum('total_amount', { where: { user_id: u.id, status: { [Op.notIn]: ['cancelled'] } } }) || 0;
      return {
        ...u.toJSON(),
        addresses: u.addresses ? (typeof u.addresses === 'string' ? JSON.parse(u.addresses) : u.addresses) : [],
        order_count: orderCount,
        total_spent: totalSpent,
      };
    }));
    res.json(usersWithStats);
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

// --- PROMO CODE MANAGEMENT ---
const getPromoCodes = async (req, res) => {
  try {
    const codes = await PromoCode.findAll({ order: [['created_at', 'DESC']] });
    res.json(codes);
  } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); }
};

const createPromoCode = async (req, res) => {
  try {
    const { code, discount_type, discount_value, min_order_amount, max_uses, is_active, expires_at } = req.body;
    if (!code || !discount_value) return res.status(400).json({ error: 'Kod ve indirim değeri gerekli' });
    const existing = await PromoCode.findOne({ where: { code: code.toUpperCase() } });
    if (existing) return res.status(400).json({ error: 'Bu kod zaten mevcut' });
    const promo = await PromoCode.create({
      code: code.toUpperCase(), discount_type: discount_type || 'percentage',
      discount_value, min_order_amount: min_order_amount || 0,
      max_uses: max_uses || null, is_active: is_active !== false,
      expires_at: expires_at || null,
    });
    res.status(201).json(promo);
  } catch (err) { res.status(500).json({ error: 'Sunucu hatası: ' + err.message }); }
};

const updatePromoCode = async (req, res) => {
  try {
    const promo = await PromoCode.findByPk(req.params.id);
    if (!promo) return res.status(404).json({ error: 'Promosyon kodu bulunamadı' });
    await promo.update(req.body);
    res.json(promo);
  } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); }
};

const deletePromoCode = async (req, res) => {
  try {
    const promo = await PromoCode.findByPk(req.params.id);
    if (!promo) return res.status(404).json({ error: 'Promosyon kodu bulunamadı' });
    await promo.destroy();
    res.json({ message: 'Promosyon kodu silindi' });
  } catch (err) { res.status(500).json({ error: 'Sunucu hatası' }); }
};

// --- OPTION GROUPS (Opsiyonlar) ---
const includeFullOptionGroup = [
  {
    model: OptionGroupItem,
    as: 'items',
    include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'price', 'image_url'] }],
  },
];

const getOptionGroups = async (req, res) => {
  try {
    const groups = await OptionGroup.findAll({
      include: [
        ...includeFullOptionGroup,
        { model: Product, as: 'attachedProducts', attributes: ['id', 'name'], through: { attributes: [] } },
      ],
      order: [['sort_order', 'ASC'], ['id', 'ASC']],
    });
    res.json(groups);
  } catch (err) { res.status(500).json({ error: 'Sunucu hatası: ' + err.message }); }
};

const _saveOptionGroupItems = async (groupId, items = []) => {
  await OptionGroupItem.destroy({ where: { option_group_id: groupId } });
  let i = 0;
  for (const it of items) {
    if (!it || !it.product_id) continue;
    await OptionGroupItem.create({
      option_group_id: groupId,
      product_id: parseInt(it.product_id),
      additional_price: parseFloat(it.additional_price) || 0,
      sort_order: i++,
    });
  }
};

const _saveOptionGroupAttached = async (groupId, productIds = []) => {
  await ProductOptionGroup.destroy({ where: { option_group_id: groupId } });
  for (const pid of productIds) {
    if (!pid) continue;
    await ProductOptionGroup.create({ option_group_id: groupId, product_id: parseInt(pid) });
  }
};

const createOptionGroup = async (req, res) => {
  try {
    const { name, multi_select, min_select, max_select, is_available, sort_order, items, attached_product_ids } = req.body;
    if (!name) return res.status(400).json({ error: 'Opsiyon adı zorunlu' });
    const group = await OptionGroup.create({
      name,
      multi_select: !!multi_select,
      min_select: parseInt(min_select) || 1,
      max_select: parseInt(max_select) || 1,
      is_available: is_available !== false,
      sort_order: sort_order || 0,
    });
    if (Array.isArray(items)) await _saveOptionGroupItems(group.id, items);
    if (Array.isArray(attached_product_ids)) await _saveOptionGroupAttached(group.id, attached_product_ids);

    const full = await OptionGroup.findByPk(group.id, { include: includeFullOptionGroup });
    res.status(201).json(full);
  } catch (err) { res.status(500).json({ error: 'Sunucu hatası: ' + err.message }); }
};

const updateOptionGroup = async (req, res) => {
  try {
    const group = await OptionGroup.findByPk(req.params.id);
    if (!group) return res.status(404).json({ error: 'Opsiyon grubu bulunamadı' });
    const { name, multi_select, min_select, max_select, is_available, sort_order, items, attached_product_ids } = req.body;
    const patch = {};
    if (name !== undefined) patch.name = name;
    if (multi_select !== undefined) patch.multi_select = !!multi_select;
    if (min_select !== undefined) patch.min_select = parseInt(min_select) || 1;
    if (max_select !== undefined) patch.max_select = parseInt(max_select) || 1;
    if (is_available !== undefined) patch.is_available = !!is_available;
    if (sort_order !== undefined) patch.sort_order = sort_order;
    await group.update(patch);

    if (Array.isArray(items)) await _saveOptionGroupItems(group.id, items);
    if (Array.isArray(attached_product_ids)) await _saveOptionGroupAttached(group.id, attached_product_ids);

    const full = await OptionGroup.findByPk(group.id, { include: includeFullOptionGroup });
    res.json(full);
  } catch (err) { res.status(500).json({ error: 'Sunucu hatası: ' + err.message }); }
};

const deleteOptionGroup = async (req, res) => {
  try {
    const group = await OptionGroup.findByPk(req.params.id);
    if (!group) return res.status(404).json({ error: 'Opsiyon grubu bulunamadı' });
    await OptionGroupItem.destroy({ where: { option_group_id: group.id } });
    await ProductOptionGroup.destroy({ where: { option_group_id: group.id } });
    await group.destroy();
    res.json({ message: 'Opsiyon grubu silindi' });
  } catch (err) { res.status(500).json({ error: 'Sunucu hatası: ' + err.message }); }
};

module.exports = {
  getAllOrders, updateOrderStatus, createQuickOrder,
  getTables, createTable, updateTable, deleteTable,
  getAllProductsAdmin, createProduct, updateProduct, deleteProduct,
  createCategory, updateCategory, deleteCategory,
  getExtras, createExtra, updateExtra, deleteExtra,
  upload, uploadImage,
  getDailyReport,
  getAllUsers,
  getSettings, updateSetting,
  getPromoCodes, createPromoCode, updatePromoCode, deletePromoCode,
  getOptionGroups, createOptionGroup, updateOptionGroup, deleteOptionGroup,
};
