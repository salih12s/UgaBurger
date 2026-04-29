/**
 * Aktif Donusum REST API baglanti testi.
 *
 * Amac: Fatura GONDERMEDEN, sadece "guvenli" GET endpointleri ile
 * username/password header'larinin REST tarafinda kabul edilip edilmedigini
 * dogrulamak. Birden fazla aday base URL ve birkac header varyantini deniyoruz
 * cunku ReDoc dokumaninda farkli alan isimleri (username/password vs
 * X-Username/X-Password vs Authorization Basic) gorulebiliyor.
 *
 * Kullanim:
 *   node server/scripts/testRestAktif.js
 *
 * NOT: Bu script SADECE okuma amacli endpointleri cagirir, hicbir fatura
 * olusturmaz / gondermez.
 */

const https = require('https');
const { URL } = require('url');

const USERNAME = process.env.EINVOICE_USERNAME || 'admin_008712';
const PASSWORD = process.env.EINVOICE_PASSWORD || 'Ohs&hi8d';

const BASE_URLS = [
  'https://portaltest.aktifdonusum.com',
  'https://portal.aktifdonusum.com',
  'https://servicetest.aktifdonusum.com',
  'https://service.aktifdonusum.com',
];

// Read-only / safe endpoints (fatura gondermez)
const ENDPOINTS = [
  '/api/document/getPrefixCodeList',
  '/api/document/getGibUser',
  '/api/document/lastDocumentNumber',
];

const HEADER_VARIANTS = [
  {
    name: 'username/password (lowercase)',
    headers: { username: USERNAME, password: PASSWORD },
  },
  {
    name: 'Username/Password (PascalCase)',
    headers: { Username: USERNAME, Password: PASSWORD },
  },
  {
    name: 'X-Username/X-Password',
    headers: { 'X-Username': USERNAME, 'X-Password': PASSWORD },
  },
  {
    name: 'Authorization: Basic',
    headers: {
      Authorization: 'Basic ' + Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64'),
    },
  },
];

function request(urlStr, headers) {
  return new Promise((resolve) => {
    let u;
    try { u = new URL(urlStr); } catch (e) { return resolve({ error: 'INVALID_URL' }); }
    const opts = {
      method: 'GET',
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'MusattiBurger-RestTest/1.0',
        ...headers,
      },
      timeout: 15000,
    };
    const req = https.request(opts, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; });
      res.on('end', () => resolve({ status: res.statusCode, headers: res.headers, body }));
    });
    req.on('error', (err) => resolve({ error: err.code || err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ error: 'TIMEOUT' }); });
    req.end();
  });
}

function summarize(body) {
  if (!body) return '(empty)';
  const trimmed = body.trim();
  // HTML => muhtemelen yanlis URL / login sayfasi
  if (trimmed.startsWith('<')) {
    const titleMatch = trimmed.match(/<title>([^<]*)<\/title>/i);
    return `[HTML${titleMatch ? ' title="' + titleMatch[1].trim() + '"' : ''}] ${trimmed.length}b`;
  }
  return trimmed.length > 400 ? trimmed.slice(0, 400) + '...' : trimmed;
}

(async () => {
  console.log('=== Aktif Donusum REST baglanti testi ===');
  console.log('Username:', USERNAME);
  console.log('Password:', PASSWORD ? '***' + PASSWORD.slice(-2) : '(yok)');
  console.log('');

  for (const base of BASE_URLS) {
    console.log('\n--- BASE:', base, '---');
    // Once root'a hit at: DNS / sunucu yasiyor mu?
    const root = await request(base + '/', {});
    if (root.error) {
      console.log('  [ROOT]', root.error, '-> bu base atlaniyor');
      continue;
    }
    console.log('  [ROOT]', root.status, '-', summarize(root.body).split('\n')[0].slice(0, 120));

    for (const ep of ENDPOINTS) {
      for (const variant of HEADER_VARIANTS) {
        const url = base + ep;
        const r = await request(url, variant.headers);
        const tag = `${ep}  [${variant.name}]`;
        if (r.error) {
          console.log(`  X ${tag} -> ${r.error}`);
        } else {
          console.log(`  ${r.status === 200 ? 'OK' : '  '} ${r.status} ${tag}`);
          if (r.status !== 404 || variant === HEADER_VARIANTS[0]) {
            console.log('     body:', summarize(r.body).replace(/\n/g, ' '));
          }
          // 200 bulunduysa diger header varyantlarini denemeye gerek yok
          if (r.status === 200) break;
        }
      }
    }
  }

  console.log('\n=== Test tamamlandi ===');
})();
