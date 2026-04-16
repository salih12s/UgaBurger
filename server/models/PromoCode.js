const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const PromoCode = sequelize.define('PromoCode', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  discount_type: { type: DataTypes.ENUM('percentage', 'fixed'), allowNull: false, defaultValue: 'percentage' },
  discount_value: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  min_order_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: true, defaultValue: 0 },
  max_uses: { type: DataTypes.INTEGER, allowNull: true, defaultValue: null },
  used_count: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 0 },
  is_active: { type: DataTypes.BOOLEAN, allowNull: false, defaultValue: true },
  expires_at: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
}, { tableName: 'promo_codes' });

module.exports = PromoCode;
