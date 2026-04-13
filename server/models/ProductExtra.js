const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const ProductExtra = sequelize.define('ProductExtra', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  extra_id: { type: DataTypes.INTEGER, allowNull: false },
}, { tableName: 'product_extras', timestamps: false });

module.exports = ProductExtra;
