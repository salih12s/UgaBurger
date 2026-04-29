const https = require('https');
const { URL } = require('url');
const SPEC_URL = 'https://portaltest.aktifdonusum.com/edonusum/v2/api-docs';
function get(u) {
  return new Promise((res) => {
    const p = new URL(u);
    https.request({ hostname: p.hostname, path: p.pathname }, (r) => {
      let b = ''; r.on('data', (c) => b += c); r.on('end', () => res(b));
    }).end();
  });
}
(async () => {
  const spec = JSON.parse(await get(SPEC_URL));
  const dump = (name) => {
    const def = (spec.definitions || {})[name];
    if (!def) return console.log(`(yok ${name})`);
    console.log(`\n=== ${name} ===`);
    console.log('required:', def.required || []);
    for (const [k, v] of Object.entries(def.properties || {})) {
      const ref = v.$ref || (v.items && v.items.$ref) || '';
      console.log(`  ${k}: type=${v.type || ''} format=${v.format || ''} enum=${JSON.stringify(v.enum || [])} ref=${ref}`);
    }
  };
  for (const n of ['DocumentCustomer','DocumentSupplier','DocumentLine','TaxSubTotal','SellerSupplier','PartyAddress','PartyPerson','Party']) dump(n);

  // sendDocumentModel body schema
  const op = spec.paths['/api/document/sendDocumentModel'].post;
  console.log('\n=== sendDocumentModel parameters ===');
  for (const p of op.parameters || []) {
    console.log(`  - [${p.in}] ${p.name} required=${!!p.required} type=${p.type || ''} ref=${p.schema && p.schema.$ref || ''}`);
  }
  console.log('responses:', Object.keys(op.responses || {}));
})();
