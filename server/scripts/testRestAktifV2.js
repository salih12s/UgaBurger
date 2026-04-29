/**
 * Aktif Donusum REST keşif v2 — gerçek ReDoc URL bilindi:
 *   https://portaltest.aktifdonusum.com/edonusum/redoc.html
 *
 * 1) ReDoc HTML'i indir, OpenAPI spec URL'sini bul.
 * 2) Spec'ten "servers" / gerçek base path'i çıkar.
 * 3) Spec'ten getPrefixCodeList / getGibUser / lastDocumentNumber yollarını topla,
 *    her birine username/password header'ı ile GET at, status'u yazdır.
 *
 * Hicbir POST / fatura cagrisi yapilmaz.
 */

const https = require('https');
const { URL } = require('url');

const USERNAME = process.env.EINVOICE_USERNAME || 'admin_008712';
const PASSWORD = process.env.EINVOICE_PASSWORD || 'Ohs&hi8d';

const REDOC_URL = 'https://portaltest.aktifdonusum.com/edonusum/redoc.html';

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
        Accept: 'application/json, text/html, */*',
        'User-Agent': 'MusattiBurger-RestTest/2.0',
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

function summarize(body, max = 300) {
  if (!body) return '(empty)';
  const t = body.trim();
  if (t.startsWith('<')) {
    const tt = t.match(/<title>([^<]*)<\/title>/i);
    return `[HTML${tt ? ` title="${tt[1].trim()}"` : ''}] ${t.length}b`;
  }
  return t.length > max ? t.slice(0, max) + '...' : t;
}

(async () => {
  console.log('=== 1) ReDoc HTML indiriliyor ===');
  const redoc = await fetch(REDOC_URL);
  console.log('status:', redoc.status, 'len:', (redoc.body || '').length);
  if (!redoc.body) {
    console.log('ReDoc indirilemedi:', redoc.error);
    return;
  }

  // Spec URL adaylarını bul
  const candidates = new Set();
  const patterns = [
    /spec-url=["']([^"']+)["']/gi,
    /specUrl[^=]*=\s*["']([^"']+)["']/gi,
    /url:\s*["']([^"']+\.json[^"']*)["']/gi,
    /["'](\/[^"']*\.json)["']/gi,
    /["'](\/[^"']*api-docs[^"']*)["']/gi,
    /["'](\/[^"']*openapi[^"']*)["']/gi,
    /["'](\/[^"']*swagger[^"']*)["']/gi,
  ];
  for (const re of patterns) {
    let m;
    while ((m = re.exec(redoc.body)) !== null) candidates.add(m[1]);
  }

  console.log('Spec URL adaylari:', [...candidates]);

  const baseOrigin = 'https://portaltest.aktifdonusum.com';
  const specUrls = [...candidates].map((c) => (c.startsWith('http') ? c : baseOrigin + c));
  // Yaygin tahminleri de ekle
  const guesses = [
    '/edonusum/v2/api-docs',
    '/edonusum/v3/api-docs',
    '/edonusum/api-docs',
    '/edonusum/swagger.json',
    '/edonusum/openapi.json',
    '/edonusum/api/openapi.json',
  ].map((p) => baseOrigin + p);
  for (const g of guesses) if (!specUrls.includes(g)) specUrls.push(g);

  console.log('\n=== 2) Spec indirme denemeleri ===');
  let spec = null;
  let specSource = null;
  for (const u of specUrls) {
    const r = await fetch(u);
    const isJson = r.body && r.body.trim().startsWith('{');
    console.log(`  ${r.status || r.error}  ${u}  ${isJson ? '[JSON]' : '[' + (r.body ? r.body.trim().slice(0,15).replace(/\s+/g,' ') : 'empty') + ']'}`);
    if (isJson && r.status === 200) {
      try {
        spec = JSON.parse(r.body);
        specSource = u;
        break;
      } catch (e) {
        console.log('    JSON parse hatasi:', e.message);
      }
    }
  }

  if (!spec) {
    console.log('\n[!] Spec bulunamadi. Sadece path tahminleriyle devam ediliyor.');
  } else {
    console.log('\n[OK] Spec yuklendi:', specSource);
    console.log('  openapi/swagger:', spec.openapi || spec.swagger);
    console.log('  servers:', JSON.stringify(spec.servers || spec.host || '(yok)'));
    console.log('  basePath:', spec.basePath || '(yok)');
  }

  // Hedef operationId'ler / path parcalari
  const wanted = ['getPrefixCodeList', 'getGibUser', 'lastDocumentNumber'];
  const found = []; // {path, method}

  if (spec && spec.paths) {
    for (const [p, methods] of Object.entries(spec.paths)) {
      for (const [method, op] of Object.entries(methods)) {
        if (!op || typeof op !== 'object') continue;
        const opId = (op.operationId || '').toLowerCase();
        const tag = (op.tags || []).join(',').toLowerCase();
        for (const w of wanted) {
          if (opId.includes(w.toLowerCase()) || p.toLowerCase().includes(w.toLowerCase())) {
            found.push({ path: p, method: method.toUpperCase(), operationId: op.operationId, tags: op.tags });
          }
        }
      }
    }
  }

  console.log('\n=== 3) Spec icindeki hedef endpointler ===');
  console.log(found.length ? JSON.stringify(found, null, 2) : '(spec yok ya da bulunamadi)');

  // Base path / server URL belirle
  let serverBase = baseOrigin + '/edonusum';
  if (spec && Array.isArray(spec.servers) && spec.servers[0] && spec.servers[0].url) {
    const su = spec.servers[0].url;
    serverBase = su.startsWith('http') ? su.replace(/\/$/, '') : (baseOrigin + su).replace(/\/$/, '');
  } else if (spec && spec.basePath) {
    serverBase = baseOrigin + spec.basePath.replace(/\/$/, '');
  }
  console.log('\nKullanilacak serverBase:', serverBase);

  // Test edilecek path listesi
  const testPaths = (found.length
    ? found.filter((f) => f.method === 'GET' || f.method === 'POST').map((f) => ({ path: f.path, method: f.method, op: f.operationId }))
    : [
        { path: '/api/document/getPrefixCodeList', method: 'GET' },
        { path: '/api/document/getGibUser', method: 'GET' },
        { path: '/api/document/lastDocumentNumber', method: 'GET' },
      ]);

  console.log('\n=== 4) Auth testi (sadece GET\'leri cagiriyoruz) ===');
  const headerVariants = [
    { name: 'username/password (lower)', headers: { username: USERNAME, password: PASSWORD } },
    { name: 'Username/Password', headers: { Username: USERNAME, Password: PASSWORD } },
    { name: 'Basic', headers: { Authorization: 'Basic ' + Buffer.from(`${USERNAME}:${PASSWORD}`).toString('base64') } },
  ];

  for (const t of testPaths) {
    if (t.method !== 'GET') {
      console.log(`  - ${t.method} ${t.path} (${t.op || ''}) -> POST cagrisi yapilmiyor (atlandi)`);
      continue;
    }
    const fullUrl = serverBase + t.path;
    console.log(`\n  -> GET ${fullUrl}  (${t.op || ''})`);
    for (const v of headerVariants) {
      const r = await fetch(fullUrl, v.headers);
      if (r.error) {
        console.log(`     X [${v.name}] ${r.error}`);
      } else {
        console.log(`     ${r.status} [${v.name}]  body: ${summarize(r.body, 220)}`);
        if (r.status === 200) break;
      }
    }
  }

  console.log('\n=== Bitti ===');
})();
