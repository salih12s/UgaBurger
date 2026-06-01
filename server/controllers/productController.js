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
      include: [{
        model: Product,
        as: 'product',
        attributes: ['id', 'name', 'price', 'image_url', 'category_id', 'is_available'],
      }],
    }],
  },
];

// Pasif (is_available=false) ürünlere bağlı opsiyon kalemlerini ve bu yüzden tamamen
// boşalan opsiyon gruplarını cevaptan çıkartır. Müşteri menüsünde stoğu biten ürün
// hem ana listeden hem de "ekstra opsiyon" seçeneklerinden gözükmesin.
function filterInactiveOptionItems(productJson) {
  if (!productJson || !Array.isArray(productJson.optionGroups)) return productJson;
  productJson.optionGroups = productJson.optionGroups
    .map(g => ({
      ...g,
      items: (g.items || []).filter(it => !it.product || it.product.is_available !== false),
    }))
    .filter(g => g.items && g.items.length > 0);
  return productJson;
}

const getProducts = async (req, res) => {
  try {
    const where = { is_available: true, is_online_sale: true };
    if (req.query.category_id) where.category_id = req.query.category_id;

    const products = await Product.findAll({
      where,
      include: productInclude,
      order: [
        ['sort_order', 'ASC'],
        [{ model: OptionGroup, as: 'optionGroups' }, 'sort_order', 'ASC'],
      ],
    });
    const cleaned = products.map(p => filterInactiveOptionItems(p.toJSON()));
    res.json(cleaned);
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası: ' + err.message });
  }
};

const getProductById = async (req, res) => {
  try {
    const product = await Product.findByPk(req.params.id, { include: productInclude });
    if (!product) return res.status(404).json({ error: 'Ürün bulunamadı' });
    res.json(filterInactiveOptionItems(product.toJSON()));
  } catch (err) {
    res.status(500).json({ error: 'Sunucu hatası' });
  }
};

module.exports = { getCategories, getProducts, getProductById };
