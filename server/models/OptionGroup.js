const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

// Opsiyon Grubu (örn: "Burger Seçiniz", "İçecek Seçiniz")
const OptionGroup = sequelize.define('OptionGroup', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  // Birden fazla ürün seçilebilir mi?
  multi_select: { type: DataTypes.BOOLEAN, defaultValue: false },
  min_select: { type: DataTypes.INTEGER, defaultValue: 1 },
  max_select: { type: DataTypes.INTEGER, defaultValue: 1 },
  is_available: { type: DataTypes.BOOLEAN, defaultValue: true },
  sort_order: { type: DataTypes.INTEGER, defaultValue: 0 },
}, { tableName: 'option_groups' });

module.exports = OptionGroup;
