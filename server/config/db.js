const { Sequelize } = require('sequelize');
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

// DB_DIALECT: 'mysql' (cPanel/Plesk default) veya 'postgres' (Railway / eski kurulum).
// DATABASE_URL varsa otomatik olarak URL'den parse edilir; aksi halde DB_* değişkenleri.
const dialect = (process.env.DB_DIALECT || (process.env.DATABASE_URL && process.env.DATABASE_URL.startsWith('postgres') ? 'postgres' : 'mysql')).toLowerCase();
const defaultPort = dialect === 'postgres' ? 5432 : 3306;

const commonOptions = {
  dialect,
  logging: false,
  define: {
    underscored: true,
    timestamps: true,
  },
};

// MySQL/MariaDB icin utf8mb4 charset (Turkce karakter ve emoji destegi)
if (dialect === 'mysql' || dialect === 'mariadb') {
  commonOptions.dialectOptions = {
    charset: 'utf8mb4',
  };
  commonOptions.define.charset = 'utf8mb4';
  commonOptions.define.collate = 'utf8mb4_unicode_ci';
}

// SSL: postgres için varsayılan açık, mysql için varsayılan kapalı.
// DB_SSL=true/false ile zorlanabilir.
const sslEnv = (process.env.DB_SSL || '').toLowerCase();
const sslEnabled = sslEnv === 'true' ? true : sslEnv === 'false' ? false : (dialect === 'postgres');
if (sslEnabled) {
  commonOptions.dialectOptions = {
    ...(commonOptions.dialectOptions || {}),
    ssl: { require: true, rejectUnauthorized: false },
  };
}

let sequelize;
if (process.env.DATABASE_URL) {
  sequelize = new Sequelize(process.env.DATABASE_URL, commonOptions);
} else {
  sequelize = new Sequelize(
    process.env.DB_NAME,
    process.env.DB_USER,
    process.env.DB_PASSWORD,
    {
      host: process.env.DB_HOST || 'localhost',
      port: process.env.DB_PORT || defaultPort,
      ...commonOptions,
    }
  );
}

module.exports = sequelize;
