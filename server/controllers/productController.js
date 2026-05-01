const { Category, Product, Extra, ProductExtra, OptionGroup, OptionGroupItem } = require('../models');

const getCategories = async (req, res) => {
  try {
    const categories = await Category.findAll({ order: [['sort_order', 'ASC']] });
    res.json(categories);
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
};

const productInclude = [
  { model: Category, as: 'category', attributes: ['id', 'name', 'slug'] },
  { model: Extra, as: 'extras', attributes: ['id', 'name', 'price', 'is_available'], through: { attributes: [] } },
  {
    model: OptionGroup,
    as: 'optionGroups',
    through: { attributes: [] },
    where: { is_available: true },
    required: false,
    include: [{
      model: OptionGroupItem,
      as: 'items',
      include: [{ model: Product, as: 'product', attributes: ['id', 'name', 'price', 'image_url'] }],
    }],
  },
];

const getProducts = async (req, res) => {
  try {
    const where = { is_available: true, is_online_sale: true };
    if (req.query.category_id) where.category_id = req.query.category_id;

    const products = await Product.findAll({
      where,
      include: productInclude,
      order: [['sort_order', 'ASC']],
    });
    res.json(products);
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, { include: productInclude });
    if (!product) return res.status(404).json({ error: 'Ürün bulunamadı' });
    res.json(product);
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
};

module.exports = { getCategories, getProducts, getProductById };
