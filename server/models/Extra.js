const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Extra = sequelize.define('Extra', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  price: { type: DataTypes.DECIMAL(10, 2), allowNull: false },
  is_available: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'extras' });

module.exports = Extra;
