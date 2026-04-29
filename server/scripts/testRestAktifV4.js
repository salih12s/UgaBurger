/**
 * Aktif Donusum REST — demo hesaba atanmis VKN / PK kesfi
 *
 * Spec'ten yardimci endpointleri tarayip GET olanlari "guvenli" parametrelerle
 * cagiriyoruz. Amac: header username/password ile hangi VKN'nin / PK'nin
 * sistemde tanimli oldugunu, sourceUrn / kontorr bilgisini ortaya cikarmak.
 *
 * Hicbir POST yok, fatura olusturulmaz.
 */

const https = require('https');
const { URL } = require('url');

const USERNAME = process.env.EINVOICE_USERNAME || 'admin_008712';
const PASSWORD = process.env.EINVOICE_PASSWORD || 'Ohs&hi8d';
const ORIGIN = 'https://portaltest.aktifdonusum.com';
const SPEC_URL = ORIGIN + '/edonusum/v2/api-docs';

function fetch(urlStr) {
  return new Promise((resolve) => {
    let u;
    try { u = new URL(urlStr); } catch { return resolve({ error: 'INVALID_URL' }); }
    const req = https.request({
      method: 'GET',
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'MusattiBurger-RestTest/4.0',
        username: USERNAME,
        password: PASSWORD,
      },
      timeout: 20000,
    }, (res) => {
      let body = '';
      res.on('data', (c) => body += c);
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', (err) => resolve({ error: err.code || err.message }));
    req.on('timeout', () => { req.destroy(); resolve({ error: 'TIMEOUT' }); });
    req.end();
  });
}

function shorten(b, max = 600) {
  if (!b) return '(empty)';
  const t = b.trim();
  return t.length > max ? t.slice(0, max) + '...' : t;
}

(async () => {
  const r = await fetch(SPEC_URL);
  const spec = JSON.parse(r.body);
  const baseUrl = ORIGIN + (spec.basePath || '');

  // Bilgi/keşif amaçlı GET endpointlerini topla
  const interesting = [];
  for (const [p, methods] of Object.entries(spec.paths || {})) {
    for (const [method, op] of Object.entries(methods)) {
      if (method.toUpperCase() !== 'GET') continue;
      if (!op || typeof op !== 'object') continue;
      const opId = (op.operationId || '').toLowerCase();
      const path = p.toLowerCase();
      // "kullanici", "user", "credit", "customer", "mukellef", "kontor"
      if (
        opId.includes('user') || opId.includes('credit') || opId.includes('customer') ||
        path.includes('user') || path.includes('credit') || path.includes('customer') ||
        opId.includes('mukellef') || path.includes('mukellef') ||
        opId.includes('kontor') || path.includes('kontor') ||
        opId.includes('gib') || opId.includes('prefix')
      ) {
        interesting.push({ path: p, op: op.operationId, params: op.parameters || [] });
      }
    }
  }

  console.log('=== Bilgi/keşif GET endpointleri ===');
  for (const t of interesting) {
    console.log(`\n* ${t.op}  ${t.path}`);
    for (const p of t.params) {
      console.log(`  - [${p.in}] ${p.name} required=${!!p.required} type=${p.type || ''} enum=${JSON.stringify(p.enum || [])}`);
    }
  }

  // Yalnizca zorunlu parametresi olmayan / kolay doldurulabilenleri cagir
  console.log('\n=== Cagrilar ===');
  for (const t of interesting) {
    const required = t.params.filter((p) => p.in === 'query' && p.required);

    // Zor (identifier vs.) parametre varsa atla; bos veya documentType yetiyorsa cagir
    const tooHard = required.some((p) => {
      const n = p.name.toLowerCase();
      return n === 'identifier' || n === 'vkn' || n === 'vkn_tckn';
    });
    if (tooHard) {
      console.log(`\n-- ${t.op}: identifier/vkn istiyor, atlandi`);
      continue;
    }

    const q = [];
    for (const p of required) {
      if (p.in !== 'query') continue;
      let v;
      const n = p.name.toLowerCase();
      if (n === 'documenttype') v = 'EFATURA';
      else if (n === 'documentidprefix') v = 'AEA';
      else if (p.enum && p.enum.length) v = p.enum[0];
      else if ((p.type || '') === 'integer' || (p.type || '') === 'number') v = '1';
      else if ((p.type || '') === 'boolean') v = 'false';
      else v = '';
      q.push(`${encodeURIComponent(p.name)}=${encodeURIComponent(v)}`);
    }

    const url = baseUrl + t.path + (q.length ? '?' + q.join('&') : '');
    console.log(`\n-> GET ${url}`);
    const resp = await fetch(url);
    if (resp.error) console.log('   X', resp.error);
    else {
      console.log('   status:', resp.status);
      console.log('   body  :', shorten(resp.body));
    }
  }

  console.log('\n=== Bitti ===');
})();
