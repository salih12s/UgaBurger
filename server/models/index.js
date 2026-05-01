const sequelize = require('../config/db');
const User = require('./User');
const Category = require('./Category');
const Product = require('./Product');
const Extra = require('./Extra');
const ProductExtra = require('./ProductExtra');
const Table = require('./Table');
const Order = require('./Order');
const OrderItem = require('./OrderItem');
const Setting = require('./Setting');
const PromoCode = require('./PromoCode');
const OptionGroup = require('./OptionGroup');
const OptionGroupItem = require('./OptionGroupItem');
const ProductOptionGroup = require('./ProductOptionGroup');

// Category <-> Product
Category.hasMany(Product, { foreignKey: 'category_id', as: 'products' });
Product.belongsTo(Category, { foreignKey: 'category_id', as: 'category' });

// Product <-> Extra (many-to-many through ProductExtra)
Product.belongsToMany(Extra, { through: ProductExtra, foreignKey: 'product_id', otherKey: 'extra_id', as: 'extras' });
Extra.belongsToMany(Product, { through: ProductExtra, foreignKey: 'extra_id', otherKey: 'product_id', as: 'products' });

// User <-> Order
User.hasMany(Order, { foreignKey: 'user_id', as: 'orders' });
Order.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

// Table <-> Order
Table.hasMany(Order, { foreignKey: 'table_id', as: 'orders' });
Order.belongsTo(Table, { foreignKey: 'table_id', as: 'table' });

// Order <-> OrderItem
Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

// Product <-> OrderItem
Product.hasMany(OrderItem, { foreignKey: 'product_id', as: 'orderItems' });
OrderItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });

// OptionGroup <-> OptionGroupItem (1-N)
OptionGroup.hasMany(OptionGroupItem, { foreignKey: 'option_group_id', as: 'items', onDelete: 'CASCADE' });
OptionGroupItem.belongsTo(OptionGroup, { foreignKey: 'option_group_id', as: 'group' });

// OptionGroupItem -> Product (her item bir ürünü temsil eder)
OptionGroupItem.belongsTo(Product, { foreignKey: 'product_id', as: 'product' });
Product.hasMany(OptionGroupItem, { foreignKey: 'product_id', as: 'optionGroupItems' });

// Product <-> OptionGroup (M-N: bir ürünün birden fazla opsiyon grubu olabilir)
Product.belongsToMany(OptionGroup, { through: ProductOptionGroup, foreignKey: 'product_id', otherKey: 'option_group_id', as: 'optionGroups' });
OptionGroup.belongsToMany(Product, { through: ProductOptionGroup, foreignKey: 'option_group_id', otherKey: 'product_id', as: 'attachedProducts' });

module.exports = {
  sequelize,
  User,
  Category,
  Product,
  Extra,
  ProductExtra,
  Table,
  Order,
  OrderItem,
  Setting,
  PromoCode,
  OptionGroup,
  OptionGroupItem,
  ProductOptionGroup,
};
