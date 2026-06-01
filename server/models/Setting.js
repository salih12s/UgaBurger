const { DataTypes } = require('sequelize');
const sequelize = require('../config/db');

const Setting = sequelize.define('Setting', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  key: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  // LONGTEXT (4GB) — base64 image gibi buyuk degerler icin
  value: { type: DataTypes.TEXT('long'), defaultValue: '' },
}, { tableName: 'settings' });

module.exports = Setting;
