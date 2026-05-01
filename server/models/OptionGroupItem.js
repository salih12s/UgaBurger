const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Opsiyon Grubu içindeki seçilebilir ürün
const OptionGroupItem = sequelize.define('OptionGroupItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  option_group_id: { type: DataTypes.INTEGER, allowNull: false },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  // Ek fiyat (varsa). 0 ise sadece seçim, fiyatsız.
  additional_price: { type: DataTypes.DECIMAL(10, 2), defaultValue: 0 },
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'option_group_items', timestamps: false });

module.exports = OptionGroupItem;
