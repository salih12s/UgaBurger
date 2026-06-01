const router = require('express').Router();
const { getCategories, getProducts, getProductById } = require('../controllers/productController');

// Kisa sureli public cache (menu sayfasi acilis hizi icin onemli)
const publicCache = (req, res, next) => {
  res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
  next();
};

router.get('/categories', publicCache, getCategories);
router.get('/products', publicCache, getProducts);
router.get('/products/:id', publicCache, getProductById);

module.exports = router;
