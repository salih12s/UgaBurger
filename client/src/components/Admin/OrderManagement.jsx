import { useState, useEffect, useCallback } from 'react';
import api from '../../api/api';
import toast from 'react-hot-toast';
import { Box, Typography, Chip, Card, Button, Stack, Divider, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';

const statusLabels = {
  pending: 'Bekleyen',
  preparing: 'Hazırlanıyor',
  delivered: 'Teslim Edildi',
  cancelled: 'İptal',
};

const nextStatus = {
  pending: 'preparing',
  preparing: 'delivered',
};

const statusColors = {
  pending: '#f59e0b',
  preparing: '#8b5cf6',
  delivered: '#64748b',
  cancelled: '#dc2626',
};

export default function OrderManagement() {
  const [orders, setOrders] = useState([]);
  const [activeStatus, setActiveStatus] = useState('pending');
  const [settings, setSettings] = useState({});
  const [cancelConfirm, setCancelConfirm] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');

  const fetchOrders = useCallback(() => {
    api.get('/admin/orders').then(res => setOrders(res.data));
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  useEffect(() => { api.get('/admin/settings').then(res => setSettings(res.data)); }, []);

  // Map old statuses to new ones for filtering
  const mapStatus = (s) => (s === 'confirmed' || s === 'ready') ? 'preparing' : s;
  const filteredOrders = orders
    .filter(o => mapStatus(o.status) === activeStatus)
    .filter(o => {
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return `#${o.id}`.includes(q) || String(o.id).includes(q);
    });
  const statusCounts = {};
  Object.keys(statusLabels).forEach(s => {
    statusCounts[s] = orders.filter(o => mapStatus(o.status) === s).length;
  });

  const handleStatusChange = async (orderId, newStatus, order) => {
    try {
      await api.put(`/admin/orders/${orderId}/status`, { status: newStatus });
      toast.success(`Sipariş ${statusLabels[newStatus]} durumuna güncellendi`);
      // Bekleyenden hazırlamaya geçerken otomatik fiş yazdır
      if (newStatus === 'preparing' && order) {
        printReceipt(order);
      }
      fetchOrders();
    } catch {
      toast.error('Güncelleme hatası');
    }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const paymentLabel = (m, type) => {
    if (m === 'online') return '💳 Kart (Online)';
    if (type === 'table') {
      return m === 'door' ? '💵 Nakit' : '💳 Kart';
    }
    return m === 'door' ? '💵 Kapıda Nakit' : '💳 Kapıda Kart';
  };
  const paymentStatusLabel = (s) => s === 'paid' ? 'Ödendi' : s === 'failed' ? 'Başarısız' : 'Bekliyor';
  const paymentStatusColor = (s) => s === 'paid' ? '#16a34a' : s === 'failed' ? '#dc2626' : '#f59e0b';

  const printReceipt = (order) => {
    const items = order.items || [];
    const dateStr = formatDate(order.createdAt);
    const type = order.order_type === 'online'
      ? `ONLINE: ${order.delivery_address || '-'}`
      : `MASA: ${order.table ? order.table.table_number : '-'}`;
    const customer = order.user ? `${order.user.first_name} ${order.user.last_name}` : (order.customer_name || '-');
    const phone = order.user?.phone || order.customer_phone || '';
    const payment = paymentLabel(order.payment_method, order.order_type);

    const rTitle = settings.receipt_title || 'MUSATTI BURGER';
    const rFooter = settings.receipt_footer || 'Afiyet Olsun!';
    const rFontPx = { small: 12, medium: 14, large: 16 }[settings.receipt_font_size] || 14;
    const showDate = settings.receipt_show_date !== 'false';
    const showTime = settings.receipt_show_time !== 'false';
    const showOrderNo = settings.receipt_show_order_no !== 'false';
    const showTable = settings.receipt_show_table !== 'false';
    const showPrices = settings.receipt_show_prices !== 'false';
    const showTotal = settings.receipt_show_total !== 'false';

    let itemsHtml = '';
    items.forEach(item => {
      const name = item.product?.name || 'Ürün';
      const price = (parseFloat(item.unit_price) * item.quantity).toFixed(2);
      itemsHtml += `<tr><td>${item.quantity}x ${name}</td>${showPrices ? `<td style="text-align:right">${price} TL</td>` : ''}</tr>`;
      if (item.extras?.length > 0) {
        item.extras.forEach(e => {
          const qty = e.quantity || 1;
          itemsHtml += `<tr><td style="padding-left:8px;font-size:${rFontPx - 2}px">+ ${qty > 1 ? qty + 'x ' : ''}${e.name}</td>${showPrices ? `<td style="text-align:right;font-size:${rFontPx - 2}px">${(parseFloat(e.price) * qty).toFixed(2)} TL</td>` : ''}</tr>`;
        });
      }
    });

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Fiş</title>
<style>
  @page { size: 80mm auto; margin: 2mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Courier New', monospace; font-size: ${rFontPx}px; width: 76mm; }
  .center { text-align: center; }
  .bold { font-weight: bold; }
  .sep { border-top: 1px dashed #000; margin: 4px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 1px 0; vertical-align: top; }
  .total { font-size: ${rFontPx + 4}px; font-weight: bold; }
</style></head><body>
  <div class="center bold" style="font-size:${rFontPx + 6}px;margin-bottom:2px">${rTitle}</div>
  <div class="sep"></div>
  ${showOrderNo ? `<div class="bold center" style="font-size:${rFontPx + 2}px">#${order.id}</div>` : ''}
  ${showDate ? `<div class="center" style="font-size:${rFontPx - 2}px">${dateStr.split(' ')[0]}${showTime ? ' ' + dateStr.split(' ')[1] : ''}</div>` : ''}
  ${showTable ? `<div class="sep"></div><div style="font-size:${rFontPx - 1}px">${type}</div>` : ''}
  <div style="font-size:${rFontPx - 1}px">Müşteri: ${customer}</div>
  ${phone ? `<div style="font-size:${rFontPx - 1}px">Tel: ${phone}</div>` : ''}
  ${order.delivery_address ? `<div style="font-size:${rFontPx - 1}px">Adres: ${order.delivery_address}</div>` : ''}
  <div class="sep"></div>
  <table>${itemsHtml}</table>
  <div class="sep"></div>
  ${showTotal ? `<table><tr><td class="total">TOPLAM:</td><td class="total" style="text-align:right">${parseFloat(order.total_amount).toFixed(2)} TL</td></tr></table><div class="sep"></div>` : ''}
  <div class="center" style="font-size:${rFontPx - 2}px">Ödeme: ${payment}</div>
  ${order.order_note ? `<div class="center" style="font-size:${rFontPx - 2}px">Not: ${order.order_note}</div>` : ''}
  <div class="sep"></div>
  <div class="center" style="font-size:${rFontPx - 2}px;margin-top:4px">${rFooter}</div>
  <div class="center" style="font-size:${rFontPx - 3}px;margin-top:2px">--- SON ---</div>
</body></html>`;

    const win = window.open('', '_blank', 'width=320,height=600');
    win.document.write(html);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 3 }}>Sipariş Yönetimi</Typography>

      <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1, mb: 2, '&::-webkit-scrollbar': { display: 'none' } }}>
        {Object.entries(statusLabels).map(([key, label]) => (
          <Chip key={key} label={`${label} (${statusCounts[key] || 0})`}
            onClick={() => setActiveStatus(key)}
            variant={activeStatus === key ? 'filled' : 'outlined'}
            sx={{ fontWeight: 500,
              ...(activeStatus === key && { bgcolor: statusColors[key], color: '#fff' }),
              ...(!activeStatus === key && { borderColor: statusColors[key], color: statusColors[key] })
            }} />
        ))}
      </Stack>

      <TextField fullWidth size="small" placeholder="Sipariş numarası ile ara... (örn: 11)"
        value={searchQuery} onChange={e => setSearchQuery(e.target.value)} sx={{ mb: 2 }} />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
        {filteredOrders.length === 0 ? (
          <Typography color="text.secondary" sx={{ p: 2.5 }}>Bu durumda sipariş bulunmuyor.</Typography>
        ) : (
          filteredOrders.map(order => {
            return (
            <Card key={order.id} sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Typography sx={{ fontWeight: 800, fontSize: 16 }}>#{order.id} - {formatDate(order.createdAt)}</Typography>
              </Stack>
              <Chip label={order.order_type === 'online' ? `🌐 Online` : `🪑 Masa${order.table ? ` - Masa ${order.table.table_number}` : ''}`}
                size="small" sx={{ mb: 1.5, bgcolor: order.order_type === 'online' ? '#dbeafe' : '#fef3c7', fontWeight: 500 }} />
              {(order.user || order.customer_name) && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  👤 {order.user ? `${order.user.first_name} ${order.user.last_name}` : order.customer_name}
                </Typography>
              )}
              {(order.user?.phone || order.customer_phone) && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  📞 {order.user?.phone || order.customer_phone}
                </Typography>
              )}
              {order.delivery_address && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  📍 {order.delivery_address}
                </Typography>
              )}

              {/* Ürünler - her zaman göster */}
              <Box sx={{ mb: 1.5, mt: 1 }}>
                {order.items?.map((item, i) => (
                  <Box key={i} sx={{ mb: 0.5 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {item.quantity}x {item.product?.name || 'Ürün'}
                      <Typography component="span" variant="caption" sx={{ ml: 0.5, color: '#888' }}>
                        ({(parseFloat(item.unit_price) * item.quantity).toFixed(2)} TL)
                      </Typography>
                    </Typography>
                    {item.extras?.length > 0 && (
                      <Typography variant="caption" sx={{ color: '#8b5cf6', display: 'block', ml: 2 }}>
                        + {item.extras.map(e => `${(e.quantity || 1) > 1 ? (e.quantity || 1) + 'x ' : ''}${e.name} (${(parseFloat(e.price) * (e.quantity || 1)).toFixed(2)} ₺)`).join(', ')}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>

              <Divider sx={{ mb: 1 }} />
              <Stack spacing={0.5} sx={{ mb: 1.5 }}>
                <Typography variant="caption">Ödeme: <b>{paymentLabel(order.payment_method, order.order_type)}</b></Typography>
                <Typography variant="caption">
                  Ödeme Durumu: <Chip label={paymentStatusLabel(order.payment_status)} size="small"
                    sx={{ fontSize: 10, fontWeight: 700, bgcolor: paymentStatusColor(order.payment_status), color: '#fff', height: 20 }} />
                </Typography>
                {order.order_note && (
                  <Typography variant="caption">📝 Not: {order.order_note}</Typography>
                )}
              </Stack>

              <Typography sx={{ fontWeight: 800, fontSize: 18, color: '#dc2626', mb: 1.5 }}>{parseFloat(order.total_amount).toFixed(2)} TL</Typography>
              <Stack direction="row" spacing={1}>
                {nextStatus[order.status] && (
                  <Button size="small" variant="contained" color="success" onClick={() => handleStatusChange(order.id, nextStatus[order.status], order)}
                    sx={{ fontWeight: 600, fontSize: 12 }}>
                    → {statusLabels[nextStatus[order.status]]}
                  </Button>
                )}
                {order.status !== 'cancelled' && order.status !== 'delivered' && (
                  <Button size="small" variant="outlined" color="error" onClick={() => setCancelConfirm(order)}
                    sx={{ fontWeight: 600, fontSize: 12 }}>
                    İptal
                  </Button>
                )}
                <IconButton size="small" onClick={() => printReceipt(order)} title="Fiş Yazdır"
                  sx={{ color: '#333', border: '1px solid #ccc', borderRadius: 1.5, ml: 'auto' }}>
                  <PrintIcon fontSize="small" />
                </IconButton>
              </Stack>
            </Card>
          );})
        )}
      </Box>

      {/* İptal Onay Modalı */}
      <Dialog open={!!cancelConfirm} onClose={() => setCancelConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: '#dc2626' }}>Siparişi İptal Et</DialogTitle>
        <DialogContent>
          {cancelConfirm && (
            <Box>
              <Typography variant="body2" sx={{ mb: 1.5, fontWeight: 600 }}>
                #{cancelConfirm.id} numaralı siparişi iptal etmek istediğinize emin misiniz?
              </Typography>
              <Divider sx={{ mb: 1 }} />
              {cancelConfirm.user && (
                <Typography variant="body2" sx={{ mb: 0.5 }}>👤 {cancelConfirm.user.first_name} {cancelConfirm.user.last_name}</Typography>
              )}
              {cancelConfirm.user?.phone && (
                <Typography variant="body2" sx={{ mb: 0.5 }}>📞 {cancelConfirm.user.phone}</Typography>
              )}
              {cancelConfirm.items?.map((item, i) => (
                <Typography key={i} variant="body2" sx={{ mb: 0.3 }}>
                  {item.quantity}x {item.product?.name || 'Ürün'} ({(parseFloat(item.unit_price) * item.quantity).toFixed(2)} TL)
                </Typography>
              ))}
              <Typography sx={{ fontWeight: 800, fontSize: 16, color: '#dc2626', mt: 1 }}>
                Toplam: {parseFloat(cancelConfirm.total_amount).toFixed(2)} TL
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setCancelConfirm(null)} variant="outlined" sx={{ fontWeight: 600 }}>Vazgeç</Button>
          <Button onClick={() => { handleStatusChange(cancelConfirm.id, 'cancelled', null); setCancelConfirm(null); }}
            variant="contained" color="error" sx={{ fontWeight: 600 }}>
            Evet, İptal Et
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
