const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Bir ürünün hangi opsiyon gruplarına bağlı olduğunu tutan junction tablo
const ProductOptionGroup = sequelize.define('ProductOptionGroup', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  product_id: { type: DataTypes.INTEGER, allowNull: false },
  option_group_id: { type: DataTypes.INTEGER, allowNull: false },
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'product_option_groups', timestamps: false });

module.exports = ProductOptionGroup;
