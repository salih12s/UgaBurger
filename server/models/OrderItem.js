const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const OrderItem = sequelize.define('OrderItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_id: { type: DataTypes.INTEGER, allowNull: false },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  quantity: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  unit_price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  extras: {
    type: DataTypes.JSON,
    defaultValue: [],
    get() {
      const v = this.getDataValue('extras');
      if (v == null) return [];
      if (Array.isArray(v) || typeof v === 'object') return v;
      try { return JSON.parse(v); } catch { return []; }
    },
  },
}, { tableName: 'order_items' });

module.exports = OrderItem;
