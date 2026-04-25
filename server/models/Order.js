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
  // --- Fatura (E-Arşiv/E-Fatura) alanları ---
  invoice_type: {
    type: DataTypes.ENUM('bireysel', 'kurumsal'),
    allowNull: true,
    defaultValue: 'bireysel',
  },
  billing_same_as_delivery: { type: DataTypes.BOOLEAN, defaultValue: true },
  billing_address: { type: DataTypes.JSON, allowNull: true, defaultValue: null },
  // Bireysel
  billing_tckn: { type: DataTypes.STRING(11), allowNull: true, defaultValue: null },
  billing_first_name: { type: DataTypes.STRING(100), allowNull: true, defaultValue: null },
  billing_last_name: { type: DataTypes.STRING(100), allowNull: true, defaultValue: null },
  // Kurumsal
  billing_company_title: { type: DataTypes.STRING(255), allowNull: true, defaultValue: null },
  billing_tax_number: { type: DataTypes.STRING(10), allowNull: true, defaultValue: null },
  billing_tax_office: { type: DataTypes.STRING(150), allowNull: true, defaultValue: null },
  billing_is_einvoice_payer: { type: DataTypes.BOOLEAN, defaultValue: false },
  // Ortak
  billing_email: { type: DataTypes.STRING(255), allowNull: true, defaultValue: null },
  billing_phone: { type: DataTypes.STRING(20), allowNull: true, defaultValue: null },
  // --- E-Fatura entegrasyon çıktıları (Bölüm 2'de kullanılacak) ---
  einvoice_uuid: { type: DataTypes.STRING(64), allowNull: true, defaultValue: null },
  einvoice_status: {
    type: DataTypes.ENUM('none', 'pending', 'sent', 'failed', 'delivered'),
    defaultValue: 'none',
  },
  einvoice_error: { type: DataTypes.TEXT, allowNull: true, defaultValue: null },
  einvoice_pdf_url: { type: DataTypes.STRING(500), allowNull: true, defaultValue: null },
  einvoice_sent_at: { type: DataTypes.DATE, allowNull: true, defaultValue: null },
}, { tableName: 'orders' });

module.exports = Order;
