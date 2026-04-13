const router = require('express').Router();
const { createOrder, getMyOrders } = require('../controllers/orderController');
const { authMiddleware } = require('../middleware/auth');

router.post('/', authMiddleware, createOrder);
router.get('/my', authMiddleware, getMyOrders);

module.exports = router;
