/**
 * Aktif Donusum REST API kesif (discovery) scripti.
 *
 * Yukaridaki test /api/document/* yollarinin 404 dondugunu gosterdi.
 * Bu script:
 *  1) Olasi ReDoc / Swagger / OpenAPI URL'lerini tarar -> dokumandan gercek
 *     base path'i ortaya cikartir.
 *  2) Bulunan host'larda alternatif REST prefix'lerini dener.
 *
 * Hicbir fatura olusturmaz / gondermez.
 */

const https = require('https');
const { URL } = require('url');

const HOSTS = [
  'https://portaltest.aktifdonusum.com',
  'https://portal.aktifdonusum.com',
  'https://apitest.aktifdonusum.com',
  'https://api.aktifdonusum.com',
  'https://servistest.aktifdonusum.com',
  'https://servis.aktifdonusum.com',
  'https://service.aktifdonusum.com',
  'https://eintegrator.aktifdonusum.com',
  'https://efatura.aktifdonusum.com',
  'https://efaturatest.aktifdonusum.com',
];

const DOC_PATHS = [
  '/redoc',
  '/api/redoc',
  '/docs',
  '/api/docs',
  '/swagger',
  '/swagger-ui',
  '/swagger-ui.html',
  '/swagger/index.html',
  '/api-docs',
  '/openapi.json',
  '/swagger/v1/swagger.json',
  '/api/swagger.json',
  '/v3/api-docs',
  '/accounting/redoc',
  '/accounting/docs',
  '/accounting/api-docs',
  '/accounting/swagger',
  '/accounting/swagger-ui',
  '/accounting/swagger/index.html',
  '/accounting/openapi.json',
  '/accounting/api/redoc',
  '/accounting/api/docs',
  '/integration/redoc',
  '/integration/docs',
  '/integration/swagger',
];

const REST_PATHS = [
  '/api/document/getPrefixCodeList',
  '/rest/document/getPrefixCodeList',
  '/api/v1/document/getPrefixCodeList',
  '/v1/document/getPrefixCodeList',
  '/InvoiceService/api/document/getPrefixCodeList',
  '/accounting/api/document/getPrefixCodeList',
  '/accounting/rest/document/getPrefixCodeList',
  '/accounting/api/v1/document/getPrefixCodeList',
  '/accounting/document/getPrefixCodeList',
  '/integration/api/document/getPrefixCodeList',
  '/integration/document/getPrefixCodeList',
];

function head(urlStr) {
  return new Promise((resolve) => {
    let u;
    try { u = new URL(urlStr); } catch (e) { return resolve({ error: 'INVALID_URL' }); }
    const opts = {
      method: 'GET',
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      headers: {
        Accept: 'text/html,application/json',
        'User-Agent': 'MusattiBurger-Discovery/1.0',
      },
      timeout: 10000,
    };
    const req = https.request(opts, (res) => {
      let body = '';
      res.on('data', (c) => { body += c; if (body.length > 4096) req.destroy(); });
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', (err) => resolve({ error: err.code || err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ error: 'TIMEOUT' }); });
    req.end();
  });
}

function snippet(b) {
  if (!b) return '';
  const t = b.trim();
  const title = t.match(/<title>([^<]*)<\/title>/i);
  if (title) return `title="${title[1].trim()}"`;
  if (t.startsWith('{') || t.startsWith('[')) return t.slice(0, 200);
  return t.slice(0, 120).replace(/\s+/g, ' ');
}

(async () => {
  console.log('=== HOST canliik / DNS testi ===');
  const liveHosts = [];
  for (const h of HOSTS) {
    const r = await head(h + '/');
    if (r.error) {
      console.log('  X', h, '->', r.error);
    } else {
      console.log('  V', h, '->', r.status, snippet(r.body));
      liveHosts.push(h);
    }
  }

  console.log('\n=== ReDoc / Swagger / OpenAPI taramasi ===');
  for (const h of liveHosts) {
    for (const p of DOC_PATHS) {
      const r = await head(h + p);
      if (r.error) continue;
      if (r.status >= 200 && r.status < 400) {
        console.log('  V', r.status, h + p, '->', snippet(r.body));
      }
    }
  }

  console.log('\n=== Alternatif REST path taramasi (header yok) ===');
  for (const h of liveHosts) {
    for (const p of REST_PATHS) {
      const r = await head(h + p);
      if (r.error) continue;
      // 404 disinda her sey ilginc
      if (r.status !== 404) {
        console.log('  *', r.status, h + p, '->', snippet(r.body));
      } else {
        // body 404 ama belki "not authorized" / json icerebilir -> kontrol et
        const s = snippet(r.body);
        if (s && !s.includes('title="Error"') && !s.includes('title="404')) {
          console.log('  ?', r.status, h + p, '->', s);
        }
      }
    }
  }

  console.log('\n=== Bitti ===');
})();
