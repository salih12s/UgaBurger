const router = require('express').Router();
const { createOrder, getMyOrders, validatePromoCode } = require('../controllers/orderController');
const { authMiddleware } = require('../middleware/auth');

router.post('/', authMiddleware, createOrder);
router.get('/my', authMiddleware, getMyOrders);
router.post('/validate-promo', authMiddleware, validatePromoCode);

module.exports = router;
