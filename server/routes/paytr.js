const router = require('express').Router();
const { getPaytrToken, paytrCallback, refundOrder } = require('../controllers/paytrController');
const { authMiddleware, adminMiddleware } = require('../middleware/auth');

// Token almak için auth gerekli
router.post('/token', authMiddleware, getPaytrToken);

// PayTR callback - auth YOK (PayTR sunucusu çağırıyor)
router.post('/callback', paytrCallback);

// İade - sadece admin
router.post('/refund', authMiddleware, adminMiddleware, refundOrder);

module.exports = router;
