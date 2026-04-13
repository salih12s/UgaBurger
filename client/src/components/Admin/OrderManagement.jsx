import { useState, useEffect, useCallback } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import { Box, Typography, Chip, Card, Button, Stack, Divider, Collapse, IconButton } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import PrintIcon from '@mui/icons-material/Print';

const statusLabels = {
  pending: 'Bekleyen',
  confirmed: 'Onaylanan',
  preparing: 'Hazırlanan',
  ready: 'Hazır',
  delivered: 'Teslim Edildi',
  cancelled: 'İptal',
};

const nextStatus = {
  pending: 'confirmed',
  confirmed: 'preparing',
  preparing: 'ready',
  ready: 'delivered',
};

const statusColors = {
  pending: '#f59e0b',
  confirmed: '#3b82f6',
  preparing: '#8b5cf6',
  ready: '#16a34a',
  delivered: '#64748b',
  cancelled: '#dc2626',
};

export default function OrderManagement() {
  const [orders, setOrders] = useState([]);
  const [activeStatus, setActiveStatus] = useState('pending');
  const [expandedOrder, setExpandedOrder] = useState(null);
  const [settings, setSettings] = useState({});

  const fetchOrders = useCallback(() => {
    api.get('/admin/orders').then(res => setOrders(res.data));
  }, []);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  useEffect(() => { api.get('/admin/settings').then(res => setSettings(res.data)); }, []);

  const filteredOrders = orders.filter(o => o.status === activeStatus);
  const statusCounts = {};
  Object.keys(statusLabels).forEach(s => {
    statusCounts[s] = orders.filter(o => o.status === s).length;
  });

  const handleStatusChange = async (orderId, newStatus) => {
    try {
      await api.put(`/admin/orders/${orderId}/status`, { status: newStatus });
      toast.success(`Sipariş ${statusLabels[newStatus]} durumuna güncellendi`);
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
    const customer = order.user ? `${order.user.first_name} ${order.user.last_name}` : '-';
    const phone = order.user?.phone || '';
    const payment = paymentLabel(order.payment_method, order.order_type);

    const rTitle = settings.receipt_title || 'MUSATTI BURGER';
    const rFooter = settings.receipt_footer || 'Afiyet Olsun!';
    const rFontPx = { small: 10, medium: 12, large: 14 }[settings.receipt_font_size] || 12;
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
          itemsHtml += `<tr><td style="padding-left:8px;font-size:${rFontPx - 2}px">+ ${e.name}</td>${showPrices ? `<td style="text-align:right;font-size:${rFontPx - 2}px">${parseFloat(e.price).toFixed(2)} TL</td>` : ''}</tr>`;
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

      <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1, mb: 3, '&::-webkit-scrollbar': { display: 'none' } }}>
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

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
        {filteredOrders.length === 0 ? (
          <Typography color="text.secondary" sx={{ p: 2.5 }}>Bu durumda sipariş bulunmuyor.</Typography>
        ) : (
          filteredOrders.map(order => {
            const isExpanded = expandedOrder === order.id;
            return (
            <Card key={order.id} sx={{ p: 2.5 }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Typography sx={{ fontWeight: 800, fontSize: 16 }}>#{order.id} - {formatDate(order.createdAt)}</Typography>
              </Stack>
              <Chip label={order.order_type === 'online' ? `🌐 Online` : `🪑 Masa${order.table ? ` - Masa ${order.table.table_number}` : ''}`}
                size="small" sx={{ mb: 1.5, bgcolor: order.order_type === 'online' ? '#dbeafe' : '#fef3c7', fontWeight: 500 }} />
              {order.user && (
                <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                  👤 {order.user.first_name} {order.user.last_name}
                </Typography>
              )}
              {order.user?.phone && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 0.5 }}>
                  📞 {order.user.phone}
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
                        + {item.extras.map(e => `${e.name} (${parseFloat(e.price).toFixed(2)} ₺)`).join(', ')}
                      </Typography>
                    )}
                  </Box>
                ))}
              </Box>

              {/* Detaylar toggle */}
              <Box onClick={() => setExpandedOrder(isExpanded ? null : order.id)} sx={{ cursor: 'pointer', mb: 1 }}>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  <Typography variant="caption" sx={{ fontWeight: 600, color: '#3b82f6' }}>
                    {isExpanded ? 'Detayları Gizle' : 'Detayları Göster'}
                  </Typography>
                  {isExpanded ? <ExpandLessIcon sx={{ fontSize: 16, color: '#3b82f6' }} /> : <ExpandMoreIcon sx={{ fontSize: 16, color: '#3b82f6' }} />}
                </Stack>
              </Box>
              <Collapse in={isExpanded}>
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
              </Collapse>

              <Typography sx={{ fontWeight: 800, fontSize: 18, color: '#dc2626', mb: 1.5 }}>{parseFloat(order.total_amount).toFixed(2)} TL</Typography>
              <Stack direction="row" spacing={1}>
                {nextStatus[order.status] && (
                  <Button size="small" variant="contained" color="success" onClick={() => handleStatusChange(order.id, nextStatus[order.status])}
                    sx={{ fontWeight: 600, fontSize: 12 }}>
                    → {statusLabels[nextStatus[order.status]]}
                  </Button>
                )}
                {order.status !== 'cancelled' && order.status !== 'delivered' && (
                  <Button size="small" variant="outlined" color="error" onClick={() => handleStatusChange(order.id, 'cancelled')}
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
    </Box>
  );
}
