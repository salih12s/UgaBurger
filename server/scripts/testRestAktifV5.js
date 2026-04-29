/**
 * Aktif Donusum REST — fatura gonderme akisina dair endpoint listesi.
 * Sadece spec'i okur, hicbir cagri yapmaz.
 */
const https = require('https');
const { URL } = require('url');
const SPEC_URL = 'https://portaltest.aktifdonusum.com/edonusum/v2/api-docs';

function get(u) {
  return new Promise((res) => {
    const p = new URL(u);
    https.request({ hostname: p.hostname, path: p.pathname, headers: { Accept: 'application/json' } }, (r) => {
      let b = ''; r.on('data', (c) => b += c); r.on('end', () => res(b));
    }).end();
  });
}

(async () => {
  const spec = JSON.parse(await get(SPEC_URL));
  const interesting = [];
  for (const [p, methods] of Object.entries(spec.paths || {})) {
    for (const [m, op] of Object.entries(methods)) {
      const opId = (op.operationId || '').toLowerCase();
      const path = p.toLowerCase();
      if (opId.match(/send|load|convert|object|draft|preview|cancel|createlink|invoice|earsiv/) ||
          path.match(/send|load|convert|object|draft|preview|cancel|createlink/)) {
        interesting.push({ method: m.toUpperCase(), path: p, op: op.operationId, summary: op.summary });
      }
    }
  }
  for (const t of interesting) console.log(`${t.method.padEnd(6)} ${t.path}    [${t.op}] ${t.summary || ''}`);

  // convertDocumentModel ve loadDocument body schema'larini incele
  const detail = (path, method) => {
    const op = spec.paths[path][method];
    if (!op) return;
    console.log(`\n=== ${method.toUpperCase()} ${path}  (${op.operationId}) ===`);
    console.log('summary:', op.summary || '');
    console.log('parameters:');
    for (const p of op.parameters || []) {
      let extra = '';
      if (p.schema && p.schema.$ref) extra = ` -> ${p.schema.$ref}`;
      console.log(`  - [${p.in}] ${p.name} required=${!!p.required} type=${p.type || ''}${extra}`);
    }
  };
  detail('/api/document/convertDocumentModel', 'post');
  detail('/api/document/loadDocument', 'post');
  detail('/api/document/objectDocument', 'post');
  detail('/api/document/getDraftDocumentPreview', 'get');

  // documentModel definition'i sadelestirilmis goster
  const dump = (name) => {
    const def = (spec.definitions || {})[name];
    if (!def) return console.log(`(definition ${name} yok)`);
    console.log(`\n--- definition ${name} ---`);
    console.log('required:', def.required || []);
    console.log('properties:');
    for (const [k, v] of Object.entries(def.properties || {})) {
      const ref = v.$ref || (v.items && v.items.$ref) || '';
      console.log(`  ${k}: type=${v.type || ''} format=${v.format || ''} enum=${JSON.stringify(v.enum || [])} ref=${ref}`);
    }
  };
  dump('DocumentModel');
  dump('ConvertDocumentModelInput');
  dump('LoadDocumentInput');
})();
