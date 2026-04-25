/**
 * LOKAL CALISTIRMA SCRIPT'I
 *
 * Amac: Railway sunucusu Aktif Donusum test portalina erisemediginde,
 *       musterinin mail kutusuna RESMI sablon PDF'i (TASLAK filigranli)
 *       lokal makineden gonderir.
 *
 * Akis:
 *   1. .env dosyasindaki DATABASE_URL ile Railway DB'sine baglanir.
 *   2. Verilen order_id (yoksa son online-paid siparisi) yuklenir.
 *   3. Aktif Donusum REST -> getDraftDocumentPreview ile resmi PDF alinir.
 *   4. SMTP ile musterinin billing_email adresine PDF + XML gonderilir.
 *   5. order.einvoice_status = 'preview_sent' olarak guncellenir.
 *
 * KULLANIM:
 *   cd server
 *   node scripts/sendPreviewForOrder.js              # son odenen siparis
 *   node scripts/sendPreviewForOrder.js 152          # belirli order_id
 *   node scripts/sendPreviewForOrder.js 152 test@x.com   # mail override
 */

require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const sequelize = require('../config/db');
const { Order, OrderItem, Product } = require('../models');
const { sendDraftPreviewByEmail } = require('../services/einvoiceServiceRest');

async function main() {
  const arg1 = process.argv[2];
  const overrideEmail = process.argv[3];
  const orderId = arg1 ? parseInt(arg1, 10) : null;

  await sequelize.authenticate();
  console.log('[db] OK ->', (process.env.DATABASE_URL || '').split('@').pop());

  let order;
  if (orderId) {
    order = await Order.findByPk(orderId, {
      include: [{ model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] }],
    });
    if (!order) {
      console.error(`[err] Siparis #${orderId} bulunamadi.`);
      process.exit(1);
    }
  } else {
    order = await Order.findOne({
      where: { payment_status: 'paid' },
      order: [['created_at', 'DESC']],
      include: [{ model: OrderItem, as: 'items', include: [{ model: Product, as: 'product' }] }],
    });
    if (!order) {
      console.error('[err] Odenen siparis bulunamadi.');
      process.exit(1);
    }
    console.log(`[info] Son odenen siparis: #${order.id}`);
  }

  if (overrideEmail) {
    order.billing_email = overrideEmail;
    console.log(`[info] billing_email override -> ${overrideEmail}`);
  }
  if (!order.billing_email) {
    console.error('[err] Siparisin billing_email alani bos. 3. argumanla mail verin.');
    process.exit(1);
  }

  console.log(`[run] Onizleme + mail: siparis #${order.id} -> ${order.billing_email}`);
  const result = await sendDraftPreviewByEmail(order, { addDraftWatermark: true });
  console.log('[result]', JSON.stringify(result, null, 2));

  if (result.status === 'sent') {
    await order.update({
      einvoice_uuid: result.uuid,
      einvoice_status: 'preview_sent',
      einvoice_error: null,
      einvoice_sent_at: new Date(),
    });
    console.log(`[ok] Siparis #${order.id} -> einvoice_status=preview_sent (DB guncellendi).`);
  } else {
    console.error('[fail] Mail gonderilemedi:', result.error);
    process.exit(2);
  }

  await sequelize.close();
}

main().catch((err) => {
  console.error('[fatal]', err);
  process.exit(99);
});
