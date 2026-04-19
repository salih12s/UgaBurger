const router = require('express').Router();
const { getPaytrToken, paytrCallback } = require('../controllers/paytrController');
const { authMiddleware } = require('../middleware/auth');

// Token almak için auth gerekli
router.post('/token', authMiddleware, getPaytrToken);

// PayTR callback - auth YOK (PayTR sunucusu çağırıyor)
router.post('/callback', paytrCallback);

module.exports = router;
