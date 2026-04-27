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

// Tek seferlik tani: sunucunun cikis IP'sini ve Aktif Donusum'a ulasip ulasamadigini gosterir.
// Aktif Donusum'a whitelist icin bildirilecek IP buradan alinir.
app.get('/api/_diag/outbound-ip', async (req, res) => {
  const https = require('https');
  const net = require('net');
  const dns = require('dns').promises;

  const httpGet = (host, path, opts = {}) => new Promise((resolve) => {
    const start = Date.now();
    const r = https.request({ hostname: host, path, method: 'GET', timeout: 8000, ...opts }, (resp) => {
      let b = ''; resp.on('data', c => b += c); resp.on('end', () => resolve({ ok: true, status: resp.statusCode, ms: Date.now() - start, body: b.slice(0, 200) }));
    });
    r.on('error', e => resolve({ ok: false, error: e.code || e.message, ms: Date.now() - start }));
    r.on('timeout', () => { r.destroy(); resolve({ ok: false, error: 'TIMEOUT', ms: Date.now() - start }); });
    r.end();
  });

  const tcpTest = (host, port) => new Promise((resolve) => {
    const start = Date.now();
    const sock = new net.Socket();
    sock.setTimeout(5000);
    sock.once('connect', () => { sock.destroy(); resolve({ ok: true, ms: Date.now() - start }); });
    sock.once('timeout', () => { sock.destroy(); resolve({ ok: false, error: 'TIMEOUT', ms: Date.now() - start }); });
    sock.once('error', (e) => resolve({ ok: false, error: e.code || e.message, ms: Date.now() - start }));
    sock.connect(port, host);
  });

  const httpAuthGet = (host, path) => new Promise((resolve) => {
    const start = Date.now();
    const r = https.request({
      hostname: host, path, method: 'GET', timeout: 12000,
      headers: {
        Accept: 'application/json',
        username: process.env.EINVOICE_USERNAME || '',
        password: process.env.EINVOICE_PASSWORD || '',
      },
    }, (resp) => {
      let b = ''; resp.on('data', c => b += c); resp.on('end', () => resolve({ ok: true, status: resp.statusCode, ms: Date.now() - start, body: b.slice(0, 300) }));
    });
    r.on('error', e => resolve({ ok: false, error: e.code || e.message, ms: Date.now() - start }));
    r.on('timeout', () => { r.destroy(); resolve({ ok: false, error: 'TIMEOUT', ms: Date.now() - start }); });
    r.end();
  });

  let dnsResult = null;
  try { dnsResult = await dns.lookup('portaltest.aktifdonusum.com', { all: true }); } catch (e) { dnsResult = { error: e.code || e.message }; }

  const [ip4, ip6, tcp443, tcp443p, httpRoot, apiCall] = await Promise.all([
    httpGet('api.ipify.org', '/'),
    httpGet('api64.ipify.org', '/'),
    tcpTest('portaltest.aktifdonusum.com', 443),
    tcpTest('portal.aktifdonusum.com', 443),
    httpGet('portaltest.aktifdonusum.com', '/edonusum/'),
    httpAuthGet('portaltest.aktifdonusum.com', '/edonusum/api/document/customerCredit?creditType=KONTOR'),
  ]);

  res.json({
    outbound_ipv4: ip4.body,
    outbound_ipv6: ip6.body,
    aktifdonusum_dns: dnsResult,
    aktifdonusum_tcp_443_TEST: tcp443,
    aktifdonusum_tcp_443_CANLI: tcp443p,
    aktifdonusum_http_root: httpRoot,
    aktifdonusum_api_customerCredit: apiCall,
  });
});

const PORT = process.env.PORT || 3000;

sequelize.sync({ alter: true }).then(() => {
  app.listen(PORT, () => {
    console.log(`Server ${PORT} portunda çalışıyor`);
  });
}).catch(err => {
  console.error('Veritabanı bağlantı hatası:', err);
});
