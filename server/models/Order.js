const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Order = sequelize.define('Order', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, allowNull: true },
  order_type: { type: DataTypes.ENUM('online', 'table'), allowNull: false },
  table_id: { type: DataTypes.INTEGER, allowNull: true },
  delivery_address: { type: DataTypes.TEXT, allowNull: true },
  status: {
    type: DataTypes.ENUM('pending', 'confirmed', 'preparing', 'ready', 'delivered', 'cancelled'),
    defaultValue: 'pending',
  },
  payment_status: {
    type: DataTypes.ENUM('pending', 'paid', 'failed', 'refunded'),
    defaultValue: 'pending',
  },
  refund_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: true, defaultValue: null },
  refunded_at: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
  payment_method: {
    type: DataTypes.ENUM('door', 'online', 'card'),
    defaultValue: 'door',
  },
  total_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  order_note: { type: DataTypes.TEXT, defaultValue: '' },
  card_info: { type: DataTypes.JSON, defaultValue: null },
  customer_name: { type: DataTypes.STRING(100), allowNull: true, defaultValue: null },
  customer_phone: { type: DataTypes.STRING(20), allowNull: true, defaultValue: null },
  promo_code: { type: DataTypes.STRING(50), allowNull: true, defaultValue: null },
  discount_amount: { type: DataTypes.DECIMAL(10, 2), allowNull: true, defaultValue: 0 },
  merchant_oid: { type: DataTypes.STRING(100), allowNull: true, defaultValue: null },
}, { tableName: 'orders' });

module.exports = Order;
