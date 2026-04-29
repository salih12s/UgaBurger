/**
 * Aktif Donusum REST auth dogrulama (v3)
 *
 * v2 spec yukledi, endpointler 500 ile "documentType missing" donduruyor.
 * Bu, auth GECTI demektir — sadece zorunlu parametreyi gondermek lazim.
 *
 * Bu script:
 *  - Spec'ten her endpoint'in zorunlu parametrelerini cikarir.
 *  - documentType icin tipik 'EFATURA' degeriyle GET yapar.
 *  - Sonuclari yazdirir.
 *
 * Hicbir yazma / fatura olusturma cagrisi yapmaz.
 */

const https = require('https');
const { URL } = require('url');

const USERNAME = process.env.EINVOICE_USERNAME || 'admin_008712';
const PASSWORD = process.env.EINVOICE_PASSWORD || 'Ohs&hi8d';
const ORIGIN = 'https://portaltest.aktifdonusum.com';
const SPEC_URL = ORIGIN + '/edonusum/v2/api-docs';

function fetch(urlStr, headers = {}) {
  return new Promise((resolve) => {
    let u;
    try { u = new URL(urlStr); } catch { return resolve({ error: 'INVALID_URL' }); }
    const opts = {
      method: 'GET',
      hostname: u.hostname,
      port: u.port || 443,
      path: u.pathname + u.search,
      headers: {
        Accept: 'application/json',
        'User-Agent': 'MusattiBurger-RestTest/3.0',
        username: USERNAME,
        password: PASSWORD,
        ...headers,
      },
      timeout: 20000,
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

function shorten(b, max = 400) {
  if (!b) return '(empty)';
  const t = b.trim();
  return t.length > max ? t.slice(0, max) + '...' : t;
}

(async () => {
  const r = await fetch(SPEC_URL);
  const spec = JSON.parse(r.body);
  const basePath = spec.basePath || '';
  const baseUrl = ORIGIN + basePath;

  const wanted = ['getPrefixCodeList', 'getGibUser', 'lastDocumentNumber'];
  const targets = [];

  for (const [p, methods] of Object.entries(spec.paths || {})) {
    for (const [method, op] of Object.entries(methods)) {
      if (method.toUpperCase() !== 'GET') continue;
      if (!op || typeof op !== 'object') continue;
      const opId = op.operationId || '';
      const matchedKey = wanted.find((w) => p.toLowerCase().includes(w.toLowerCase()) || opId.toLowerCase().includes(w.toLowerCase()));
      if (!matchedKey) continue;
      targets.push({ path: p, op: opId, parameters: op.parameters || [], summary: op.summary });
    }
  }

  console.log('=== Hedef GET endpointler (parametre listesi) ===');
  for (const t of targets) {
    console.log(`\n* ${t.op}  ${t.path}`);
    if (t.summary) console.log('  summary:', t.summary);
    for (const param of t.parameters) {
      console.log(`  - [${param.in}] ${param.name}  required=${!!param.required}  type=${param.type || (param.schema && param.schema.type) || ''}  enum=${JSON.stringify(param.enum || (param.items && param.items.enum) || [])}`);
    }
  }

  // Zorunlu query parametrelerini doldur
  function buildQuery(params) {
    const q = [];
    for (const p of params) {
      if (p.in !== 'query' || !p.required) continue;
      let v;
      const name = p.name.toLowerCase();
      if (name === 'documenttype') v = 'EFATURA';
      else if (name === 'profileid') v = 'TICARIFATURA';
      else if (name === 'invoicetype') v = 'SATIS';
      else if (name === 'documenttypecode' || name === 'doctype') v = 'EFATURA';
      else if (p.enum && p.enum.length) v = p.enum[0];
      else if ((p.type || '') === 'integer' || (p.type || '') === 'number') v = '1';
      else if ((p.type || '') === 'boolean') v = 'false';
      else v = 'TEST';
      q.push(`${encodeURIComponent(p.name)}=${encodeURIComponent(v)}`);
    }
    return q.length ? '?' + q.join('&') : '';
  }

  console.log('\n=== Auth + zorunlu parametre testi ===');
  for (const t of targets) {
    // Header parametreleri (username/password) zaten her istekte gidiyor.
    const url = baseUrl + t.path + buildQuery(t.parameters);
    console.log(`\n-> GET ${url}`);
    const resp = await fetch(url);
    if (resp.error) {
      console.log('   X', resp.error);
    } else {
      console.log('   status:', resp.status);
      console.log('   body  :', shorten(resp.body));
    }
  }

  console.log('\n=== Bitti ===');
})();
