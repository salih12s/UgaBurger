const router = require('express').Router();
const { getCategories, getProducts, getProductById } = require('../controllers/productController');

router.get('/categories', getCategories);
router.get('/products', getProducts);
router.get('/products/:id', getProductById);

module.exports = router;
