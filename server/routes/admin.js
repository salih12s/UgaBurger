const router = require('express').Router();
const { authMiddleware, adminMiddleware } = require('../middleware/auth');
const ctrl = require('../controllers/adminController');

router.use(authMiddleware, adminMiddleware);

// Orders
router.get('/orders', ctrl.getAllOrders);
router.put('/orders/:id/status', ctrl.updateOrderStatus);

// Quick order (table)
router.post('/quick-order', ctrl.createQuickOrder);

// Tables
router.get('/tables', ctrl.getTables);
router.post('/tables', ctrl.createTable);
router.put('/tables/:id', ctrl.updateTable);
router.delete('/tables/:id', ctrl.deleteTable);

// Products
router.get('/products', ctrl.getAllProductsAdmin);
router.post('/products', ctrl.createProduct);
router.put('/products/:id', ctrl.updateProduct);
router.delete('/products/:id', ctrl.deleteProduct);

// Categories
router.post('/categories', ctrl.createCategory);
router.put('/categories/:id', ctrl.updateCategory);
router.delete('/categories/:id', ctrl.deleteCategory);

// Extras
router.get('/extras', ctrl.getExtras);
router.post('/extras', ctrl.createExtra);
router.put('/extras/:id', ctrl.updateExtra);
router.delete('/extras/:id', ctrl.deleteExtra);

// Image upload (multer hatalarını anlamlı mesajla döndür)
router.post('/upload', (req, res, next) => {
  ctrl.upload.single('image')(req, res, (err) => {
    if (err) {
      if (err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'Dosya boyutu çok büyük (maks. 8 MB). Lütfen daha küçük bir görsel seçin.' });
      }
      return res.status(400).json({ error: err.message || 'Yükleme hatası' });
    }
    next();
  });
}, ctrl.uploadImage);

// Reports
router.get('/reports/daily', ctrl.getDailyReport);

// Users
router.get('/users', ctrl.getAllUsers);

// Settings
router.get('/settings', ctrl.getSettings);
router.put('/settings', ctrl.updateSetting);

// Promo Codes
router.get('/promo-codes', ctrl.getPromoCodes);
router.post('/promo-codes', ctrl.createPromoCode);
router.put('/promo-codes/:id', ctrl.updatePromoCode);
router.delete('/promo-codes/:id', ctrl.deletePromoCode);

// Option Groups (Opsiyonlar)
router.get('/option-groups', ctrl.getOptionGroups);
router.post('/option-groups', ctrl.createOptionGroup);
router.put('/option-groups/:id', ctrl.updateOptionGroup);
router.delete('/option-groups/:id', ctrl.deleteOptionGroup);

// E-Fatura / E-Arsiv
const einvoiceCtrl = require('../controllers/einvoiceController');
router.post('/einvoice/orders/:id/send', einvoiceCtrl.sendForOrder);
router.get('/einvoice/orders/:id', einvoiceCtrl.getInvoiceInfo);
router.get('/einvoice/check/:identifier', einvoiceCtrl.checkPayer);
router.get('/einvoice/credit', einvoiceCtrl.credit);

module.exports = router;
