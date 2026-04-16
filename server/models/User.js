const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  first_name: { type: DataTypes.STRING(100), allowNull: false },
  last_name: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(255), allowNull: false },
  phone: { type: DataTypes.STRING(20), allowNull: false, unique: true },
  password_hash: { type: DataTypes.STRING(255), allowNull: false },
  role: { type: DataTypes.ENUM('customer', 'admin'), defaultValue: 'customer' },
  addresses: { type: DataTypes.TEXT, allowNull: true, defaultValue: '[]' },
  reset_code: { type: DataTypes.STRING(6), allowNull: true, defaultValue: null },
  reset_code_expires: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
}, { tableName: 'users' });

module.exports = User;
