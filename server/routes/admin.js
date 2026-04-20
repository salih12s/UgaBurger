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

// Image upload
router.post('/upload', ctrl.upload.single('image'), ctrl.uploadImage);

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

module.exports = router;
