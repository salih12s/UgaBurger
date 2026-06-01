const express = require('express');
const cors = require('cors');
const path = require('path');
const compression = require('compression');
require('dotenv').config({ path: path.join(__dirname, '../.env') });

const { sequelize } = require('./models');

const app = express();

// Gzip/deflate sikistirma - JSON yanitlari (urunler, siparisler) cok daha hizli
// transfer edilir. Resimler zaten sikistirilmis (jpeg/webp) oldugu icin filter
// gereksiz CPU harcamayi onler.
app.use(compression({
  level: 6,
  threshold: 1024, // 1KB altini sikistirma
  filter: (req, res) => {
    if (req.headers['x-no-compression']) return false;
    return compression.filter(req, res);
  },
}));

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
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Static files
// cPanel Passenger uygulamayi /api altinda host ediyor; bu yuzden hem /uploads hem /api/uploads
// path'lerini destekliyoruz (lokal dev + Railway eski URL'ler de calismaya devam etsin diye).
const staticOpts = {
  maxAge: '365d',         // tarayici 1 yil cache'lesin
  immutable: true,        // dosya degismez (yeni upload yeni isim alir)
  etag: true,
  lastModified: true,
  setHeaders: (res) => {
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
  },
};
const _uploadsDir = express.static(path.join(__dirname, 'uploads'), staticOpts);
const _imagesDir = express.static(path.join(__dirname, '../Images'), staticOpts);
app.use('/uploads', _uploadsDir);
app.use('/images', _imagesDir);
app.use('/api/uploads', _uploadsDir);
app.use('/api/images', _imagesDir);

// Routes
app.use('/api/auth', require('./routes/auth'));
app.use('/api', require('./routes/products'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/paytr', require('./routes/paytr'));
app.use('/api/admin', require('./routes/admin'));

// Settings endpoint (public) - kisa sureli HTTP cache (60sn) + CDN cache
const { Setting } = require('./models');
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await Setting.findAll();
    const obj = {};
    settings.forEach(s => { obj[s.key] = s.value; });
    res.setHeader('Cache-Control', 'public, max-age=60, stale-while-revalidate=300');
    res.json(obj);
  } catch { res.json({}); }
});

// Health check
app.get('/api/health', (req, res) => res.json({ status: 'ok' }));

const PORT = process.env.PORT || 3000;

sequelize.sync().then(() => {
  app.listen(PORT, () => {
    console.log(`Server ${PORT} portunda çalışıyor`);
  });
}).catch(err => {
  console.error('Veritabanı bağlantı hatası:', err);
});
