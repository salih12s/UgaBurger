const { Category, Product, Extra, ProductExtra } = require('../models');

const getCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({ order: [['sort_order', 'ASC']] });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
};

const getProducts = async (req, res) => {
  try {
    const where = { is_available: true };
    if (req.query.category_id) where.category_id = req.query.category_id;

    const products = await Product.findAll({
      where,
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
        { model: Extra, as: 'extras', attributes: ['id', 'name', 'price', 'is_available'], through: { attributes: [] } },
      ],
      order: [['sort_order', 'ASC']],
    });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, {
      include: [
        { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
        { model: Extra, as: 'extras', attributes: ['id', 'name', 'price', 'is_available'], through: { attributes: [] } },
      ],
    });
    if (!product) return res.status(404).json({ error: 'Ürün bulunamadı' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
};

module.exports = { getCategories, getProducts, getProductById };
