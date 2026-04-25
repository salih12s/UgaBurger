// Production DB enum'una yeni degerleri ekler.
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const sequelize = require('../config/db');

(async () => {
  try {
    await sequelize.query("ALTER TYPE enum_orders_einvoice_status ADD VALUE IF NOT EXISTS 'draft'");
    console.log('+draft');
    await sequelize.query("ALTER TYPE enum_orders_einvoice_status ADD VALUE IF NOT EXISTS 'preview_sent'");
    console.log('+preview_sent');
    const [rows] = await sequelize.query("SELECT enum_range(NULL::enum_orders_einvoice_status) AS vals");
    console.log('vals:', rows[0].vals);
    await sequelize.close();
  } catch (e) {
    console.error('ERR:', e.message);
    process.exit(1);
  }
})();
