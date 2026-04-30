const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { sequelize } = require('./models');

const app = express();

// Middleware
const allowedOrigins = (process.env.CLIENT_URL || '*').split(',').map(s => s.trim());
app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes('*') || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(null, true); // Geliştirme kolaylığı için tüm originlere izin ver
    }
  },
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Static files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/images', express.static(path.join(__dirname, '../Images')));

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/paytr', require('./routes/paytr'));
app.use('/api/admin', require('./routes/admin'));

// Settings endpoint (public)
const { Setting } = require('./models');
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await Setting.findAll();
    const obj = {};
    settings.forEach(s => { obj[s.key] = s.value; });
    res.json(obj);
  } catch { res.json({}); }
});

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;

sequelize.sync({ alter: true }).then(() => {
  app.listen(PORT, () => {
    console.log(`Server ${PORT} portunda çalışıyor`);
  });
}).catch(err => {
  console.error('Veritabanı bağlantı hatası:', err);
});
