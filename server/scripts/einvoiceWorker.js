/**
 * E-FATURA OTOMATIK WORKER (Lokal Calisir)
 *
 * Railway sunucusu Aktif Donusum test portalina erisemediginden,
 * bu worker'i SENIN bilgisayarinda calistirirsin.
 *
 * Yapar:
 *  - Her POLL_INTERVAL_MS'de Railway DB'sini sorgular
 *  - payment_status='paid' VE einvoice_status NOT IN ('sent','preview_sent','draft') siparisleri bulur
 *  - Aktif Donusum REST'ten resmi sablonda PDF onizleme alir (kontor harcanmaz)
 *  - Musterinin billing_email adresine PDF + XML mail atar
 *  - DB'de einvoice_status = 'preview_sent' olarak isaretler
 *
 * Kullanim:
 *   cd server
 *   node scripts/einvoiceWorker.js
 *
 * Ya da kok klasorden:
 *   .\start-einvoice-worker.bat
 *
 * Durdurmak icin: Ctrl+C
 *
 * Ayarlar (env opsiyonel):
 *   EINVOICE_WORKER_POLL_MS=30000        (default 30sn)
 *   EINVOICE_WORKER_MAX_AGE_HOURS=24     (24sa'ten eski siparisleri atla)
 *   EINVOICE_WORKER_BATCH=5              (her turda en fazla N siparis)
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const { Op } = require('sequelize');
const sequelize = require('../config/db');
const { Order, OrderItem, Product } = require('../models');
const { sendDraftPreviewByEmail } = require('../services/einvoiceServiceRest');

const POLL_MS = parseInt(process.env.EINVOICE_WORKER_POLL_MS, 10) || 30000;
const MAX_AGE_HOURS = parseInt(process.env.EINVOICE_WORKER_MAX_AGE_HOURS, 10) || 24;
const BATCH = parseInt(process.env.EINVOICE_WORKER_BATCH, 10) || 5;

let stopping = false;
let inFlight = false;

function ts() {
  return new Date().toISOString().replace('T', ' ').slice(0, 19);
}

async function processOnce() {
  if (inFlight) return;
  inFlight = true;
  try {
    const since = new Date(Date.now() - MAX_AGE_HOURS * 3600 * 1000);
    const orders = await Order.findAll({
      where: {
        payment_status: 'paid',
        einvoice_status: { [Op.notIn]: ['sent', 'preview_sent', 'draft'] },
        created_at: { [Op.gte]: since },
        billing_email: { [Op.ne]: null, [Op.ne]: '' },
      },
      include: [{ model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] }],
      order: [['created_at', 'ASC']],
      limit: BATCH,
    });

    if (orders.length === 0) return;
    console.log(`[${ts()}] [worker] ${orders.length} siparis isleniyor...`);

    for (const order of orders) {
      try {
        console.log(`[${ts()}] [worker] -> #${order.id} (${order.billing_email})`);
        const r = await sendDraftPreviewByEmail(order, { addDraftWatermark: true });
        if (r.status === 'sent') {
          await order.update({
            einvoice_uuid: r.uuid,
            einvoice_status: 'preview_sent',
            einvoice_error: null,
            einvoice_sent_at: new Date(),
          });
          console.log(`[${ts()}] [worker] OK #${order.id} -> ${r.invoiceId}`);
        } else {
          await order.update({
            einvoice_status: 'failed',
            einvoice_error: (r.error || 'unknown').slice(0, 500),
          });
          console.warn(`[${ts()}] [worker] FAIL #${order.id} -> ${r.error}`);
        }
      } catch (e) {
        console.error(`[${ts()}] [worker] EXC #${order.id}:`, e.message);
        try {
          await order.update({
            einvoice_status: 'failed',
            einvoice_error: ('exc: ' + e.message).slice(0, 500),
          });
        } catch (_) { /* yut */ }
      }
    }
  } catch (err) {
    console.error(`[${ts()}] [worker] poll hatasi:`, err.message);
  } finally {
    inFlight = false;
  }
}

async function main() {
  await sequelize.authenticate();
  console.log(`[${ts()}] [worker] DB OK`);
  console.log(`[${ts()}] [worker] poll=${POLL_MS}ms, batch=${BATCH}, maxAge=${MAX_AGE_HOURS}h`);
  console.log(`[${ts()}] [worker] Ctrl+C ile durdurun.`);

  // Ilk turu hemen calistir
  await processOnce();

  const interval = setInterval(() => {
    if (stopping) return;
    processOnce();
  }, POLL_MS);

  const shutdown = async () => {
    if (stopping) return;
    stopping = true;
    console.log(`\n[${ts()}] [worker] kapaniyor...`);
    clearInterval(interval);
    // Suanki turun bitmesini bekle
    let waited = 0;
    while (inFlight && waited < 30000) {
      await new Promise(r => setTimeout(r, 500));
      waited += 500;
    }
    try { await sequelize.close(); } catch (_) {}
    console.log(`[${ts()}] [worker] kapandi.`);
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(1);
});
