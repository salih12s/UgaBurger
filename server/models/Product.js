const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Product = sequelize.define('Product', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  category_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(200), allowNull: false },
  description: { type: DataTypes.TEXT, defaultValue: '' },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  // TEXT: hem URL ('/uploads/...', '/images/...') hem de 'data:image/...;base64,...' içerebilir.
  // Base64 data URL'leri kalıcı olarak DB'de saklayarak Railway/Plesk gibi
  // ephemeral diskli ortamlarda restart/deploy sonrası resim kaybını önler.
  image_url: { type: DataTypes.TEXT('long'), defaultValue: '' },
  is_available: { type: DataTypes.BOOLEAN, defaultValue: true },
  is_suggested: { type: DataTypes.BOOLEAN, defaultValue: false },
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'products' });

module.exports = Product;
