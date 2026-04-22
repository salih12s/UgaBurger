import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../../api/api';
import toast from 'react-hot-toast';
import { Box, Typography, Chip, Card, Button, Stack, Divider, IconButton, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem, Checkbox } from '@mui/material';
import PrintIcon from '@mui/icons-material/Print';
import EditIcon from '@mui/icons-material/Edit';

const statusLabels = {
  pending: 'Bekleyen',
  preparing: 'Hazırlanıyor',
  delivered: 'Teslim Edildi',
  cancelled: 'İptal',
};

const nextStatus = {
  pending: 'preparing',
  confirmed: 'delivered',
  preparing: 'delivered',
  ready: 'delivered',
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
  const [visibleCount, setVisibleCount] = useState(50);
  const [tables, setTables] = useState([]);
  const [tableEditOrder, setTableEditOrder] = useState(null);
  const [selectedTableId, setSelectedTableId] = useState('');
  const [selectedOrders, setSelectedOrders] = useState([]);

  const prevOrderCount = useRef(null);
  const notificationAudio = useRef(null);
  const audioUnlocked = useRef(false);
  const titleFlickerRef = useRef(null);

  // Ses dosyasını önceden yükle + browser notification izni iste
  useEffect(() => {
    notificationAudio.current = new Audio('/notification.wav');
    notificationAudio.current.volume = 1.0;
    notificationAudio.current.load();

    // Browser notification izni iste
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission().catch(() => {});
    }

    // sessionStorage'dan önceki pending sayısını al (sayfa yenilenince ses kaybolmasın)
    const stored = sessionStorage.getItem('pendingOrderCount');
    if (stored !== null) prevOrderCount.current = parseInt(stored, 10);

    // Kullanıcı ilk etkileşimde sesi unlock et
    const unlockAudio = () => {
      if (!audioUnlocked.current && notificationAudio.current) {
        notificationAudio.current.play().then(() => {
          notificationAudio.current.pause();
          notificationAudio.current.currentTime = 0;
          audioUnlocked.current = true;
        }).catch(() => {});
      }
    };
    document.addEventListener('click', unlockAudio);
    document.addEventListener('keydown', unlockAudio);
    return () => {
      document.removeEventListener('click', unlockAudio);
      document.removeEventListener('keydown', unlockAudio);
      if (titleFlickerRef.current) clearInterval(titleFlickerRef.current);
    };
  }, []);

  const flickerTitle = useCallback(() => {
    if (titleFlickerRef.current) clearInterval(titleFlickerRef.current);
    const originalTitle = document.title.replace(/^🔔 /, '');
    let toggled = false;
    titleFlickerRef.current = setInterval(() => {
      document.title = toggled ? originalTitle : '🔔 YENİ SİPARİŞ!';
      toggled = !toggled;
    }, 800);
    // Sekmeye dönüldüğünde başlığı resetle
    const onFocus = () => {
      clearInterval(titleFlickerRef.current);
      document.title = originalTitle;
      window.removeEventListener('focus', onFocus);
    };
    window.addEventListener('focus', onFocus);
  }, []);

  const playNotificationSound = useCallback(() => {
    try {
      if (!notificationAudio.current) return;
      // Tek çalma yerine 3 kez bip sesi (bildirim hissi için)
      let count = 0;
      const playOnce = () => {
        if (count >= 3) return;
        try {
          const a = notificationAudio.current.cloneNode(true);
          a.volume = 1.0;
          const p = a.play();
          if (p && p.catch) p.catch(() => {});
        } catch { /* noop */ }
        count += 1;
        setTimeout(playOnce, 450);
      };
      playOnce();
    } catch { /* noop */ }
  }, []);

  const showBrowserNotification = useCallback((count) => {
    try {
      if ('Notification' in window && Notification.permission === 'granted') {
        const n = new Notification('🔔 Yeni Sipariş!', {
          body: `${count} yeni bekleyen sipariş var`,
          icon: '/favicon.png',
          tag: 'new-order',
          requireInteraction: false,
        });
        setTimeout(() => n.close(), 8000);
      }
    } catch { /* noop */ }
  }, []);

  const fetchOrders = useCallback(() => {
    api.get('/admin/orders').then(res => {
      const newOrders = res.data;
      const newPendingCount = newOrders.filter(o => o.status === 'pending').length;
      if (prevOrderCount.current !== null && newPendingCount > prevOrderCount.current) {
        const diff = newPendingCount - prevOrderCount.current;
        playNotificationSound();
        showBrowserNotification(newPendingCount);
        flickerTitle();
        toast.success(`🔔 ${diff} yeni sipariş geldi!`, { duration: 6000 });
      }
      prevOrderCount.current = newPendingCount;
      sessionStorage.setItem('pendingOrderCount', String(newPendingCount));
      setOrders(newOrders);
    });
  }, [playNotificationSound, showBrowserNotification, flickerTitle]);

  useEffect(() => {
    fetchOrders();
    const interval = setInterval(fetchOrders, 10000);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  useEffect(() => { api.get('/admin/settings').then(res => setSettings(res.data)); }, []);
  useEffect(() => { api.get('/admin/tables').then(res => setTables(res.data)); }, []);

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
      const res = await api.put(`/admin/orders/${orderId}/status`, { status: newStatus });
      if (newStatus === 'cancelled' && res.data?.refund?.refunded) {
        toast.success(`Sipariş iptal edildi ve ${res.data.refund.amount.toFixed(2)} TL iade başlatıldı`, { duration: 6000 });
      } else {
        toast.success(`Sipariş ${statusLabels[newStatus]} durumuna güncellendi`);
      }
      // Bekleyenden hazırlamaya geçerken otomatik fiş yazdır
      if (newStatus === 'preparing' && order && settings.receipt_auto_print !== 'false') {
        printReceipt(order);
      }
      fetchOrders();
    } catch (err) {
      toast.error(err.response?.data?.error || 'Güncelleme hatası');
    }
  };

  const handleBulkStatusChange = async () => {
    const ordersToUpdate = filteredOrders.filter(o => selectedOrders.includes(o.id) && nextStatus[o.status]);
    if (ordersToUpdate.length === 0) return;
    try {
      await Promise.all(ordersToUpdate.map(o => api.put(`/admin/orders/${o.id}/status`, { status: nextStatus[o.status] })));
      toast.success(`${ordersToUpdate.length} sipariş güncellendi`);
      setSelectedOrders([]);
      fetchOrders();
    } catch { toast.error('Toplu güncelleme hatası'); }
  };

  const toggleSelectOrder = (id) => {
    setSelectedOrders(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    const actionable = filteredOrders.filter(o => nextStatus[o.status]).map(o => o.id);
    const allSelected = actionable.length > 0 && actionable.every(id => selectedOrders.includes(id));
    setSelectedOrders(allSelected ? selectedOrders.filter(id => !actionable.includes(id)) : [...new Set([...selectedOrders, ...actionable])]);
  };

  const handleTableChange = async (orderId, tableId) => {
    try {
      await api.put(`/admin/orders/${orderId}/status`, { table_id: tableId || null });
      toast.success('Masa güncellendi');
      fetchOrders();
      setTableEditOrder(null);
    } catch { toast.error('Güncelleme hatası'); }
  };

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  };

  const paymentLabel = (m, type) => {
    // Masa siparişi: fiziksel POS veya nakit
    if (type === 'table') {
      if (m === 'online' || m === 'card') return '💳 Kart (POS)';
      return '💵 Nakit';
    }
    // Online sipariş
    if (m === 'online') return '💳 Kart (Online)';
    return m === 'door' ? '💵 Kapıda Nakit' : '💳 Kapıda Kart';
  };
  const paymentStatusLabel = (s) => s === 'paid' ? 'Ödendi' : s === 'refunded' ? 'İade Edildi' : s === 'failed' ? 'Başarısız' : 'Bekliyor';
  const paymentStatusColor = (s) => s === 'paid' ? '#16a34a' : s === 'refunded' ? '#8b5cf6' : s === 'failed' ? '#dc2626' : '#f59e0b';

  const printReceipt = (order) => {
    const items = order.items || [];
    const dateStr = formatDate(order.createdAt);
    const masaInfo = order.table ? (order.table.table_name ? `${order.table.table_name} (${order.table.table_number})` : order.table.table_number) : '-';
    const type = order.order_type === 'online'
      ? `🌐 ONLINE SİPARİŞ`
      : order.table
        ? `MASA: ${masaInfo}`
        : `📱 TELEFON SİPARİŞİ`;
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
  body {
    font-family: 'Arial Black', 'Helvetica', Arial, sans-serif;
    font-size: ${rFontPx + 1}px;
    width: 76mm;
    font-weight: 900;
    color: #000;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    letter-spacing: 0.3px;
  }
  .center { text-align: center; }
  .bold { font-weight: 900; }
  .sep { border-top: 2px solid #000; margin: 5px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 2px 0; vertical-align: top; font-weight: 900; }
  .total { font-size: ${rFontPx + 6}px; font-weight: 900; }
</style></head><body>
  <div class="center bold" style="font-size:${rFontPx + 6}px;margin-bottom:2px">${rTitle}</div>
  <div class="sep"></div>
  ${showOrderNo ? `<div class="bold center" style="font-size:${rFontPx + 2}px">#${order.id}</div>` : ''}
  ${showDate ? `<div class="center" style="font-size:${rFontPx - 2}px">${dateStr.split(' ')[0]}${showTime ? ' ' + dateStr.split(' ')[1] : ''}</div>` : ''}
  ${showTable ? `<div class="sep"></div><div style="font-size:${rFontPx - 1}px"><b>${type}</b></div>` : ''}
  ${order.order_note ? `<div style="font-size:${rFontPx - 1}px">📝 Not: ${order.order_note}</div>` : ''}
  <div style="font-size:${rFontPx - 1}px">Müşteri: ${customer}</div>
  ${phone ? `<div style="font-size:${rFontPx - 1}px">Tel: ${phone}</div>` : ''}
  ${order.delivery_address ? `<div style="font-size:${rFontPx - 1}px">Adres: ${order.delivery_address}</div>` : ''}
  <div class="sep"></div>
  <table>${itemsHtml}</table>
  <div class="sep"></div>
  ${showTotal ? `<table><tr><td class="total">TOPLAM:</td><td class="total" style="text-align:right">${parseFloat(order.total_amount).toFixed(2)} TL</td></tr></table><div class="sep"></div>` : ''}
  <div class="center" style="font-size:${rFontPx - 2}px">Ödeme: ${payment}</div>
  <div class="sep"></div>
  <div class="center" style="font-size:${rFontPx - 2}px;margin-top:4px">${rFooter}</div>
  <div class="center" style="font-size:${rFontPx - 3}px;margin-top:2px">--- SON ---</div>
</body></html>`;

    // Electron varsa popup'sız silent print, yoksa fallback iframe
    if (window.electronAPI?.isElectron) {
      window.electronAPI.silentPrint(html)
        .then(() => console.log('Fiş yazdırıldı (silent)'))
        .catch(err => console.error('Print hatası:', err));
    } else {
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;border:none;visibility:hidden';
      document.body.appendChild(iframe);
      iframe.contentDocument.write(html);
      iframe.contentDocument.close();
      iframe.contentWindow.onafterprint = () => document.body.removeChild(iframe);
      setTimeout(() => iframe.contentWindow.print(), 200);
    }
  };

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 3 }}>Sipariş Yönetimi</Typography>

      <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1, mb: 2, '&::-webkit-scrollbar': { display: 'none' } }}>
        {Object.entries(statusLabels).map(([key, label]) => (
          <Chip key={key} label={`${label} (${statusCounts[key] || 0})`}
            onClick={() => { setActiveStatus(key); setVisibleCount(50); }}
            variant={activeStatus === key ? 'filled' : 'outlined'}
            sx={{ fontWeight: 500,
              ...(activeStatus === key && { bgcolor: statusColors[key], color: '#fff' }),
              ...(!activeStatus === key && { borderColor: statusColors[key], color: statusColors[key] })
            }} />
        ))}
      </Stack>

      <TextField fullWidth size="small" placeholder="Sipariş numarası ile ara... (örn: 11)"
        value={searchQuery} onChange={e => setSearchQuery(e.target.value)} sx={{ mb: 2 }} />

      {filteredOrders.some(o => nextStatus[o.status]) && (
        <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
          <Button size="small" variant="outlined" onClick={toggleSelectAll}
            sx={{ fontWeight: 600, fontSize: 12 }}>
            {filteredOrders.filter(o => nextStatus[o.status]).every(o => selectedOrders.includes(o.id)) && filteredOrders.some(o => nextStatus[o.status]) ? 'Seçimi Kaldır' : 'Tümünü Seç'}
          </Button>
          {selectedOrders.filter(id => filteredOrders.some(o => o.id === id)).length > 0 && (
            <Button size="small" variant="contained" color="success" onClick={handleBulkStatusChange}
              sx={{ fontWeight: 600, fontSize: 12 }}>
              {activeStatus === 'preparing' ? '✅ Seçilenleri Teslim Et' : activeStatus === 'pending' ? '→ Seçilenleri Onayla' : 'Seçilenleri Güncelle'} ({selectedOrders.filter(id => filteredOrders.some(o => o.id === id)).length})
            </Button>
          )}
        </Stack>
      )}

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
        {filteredOrders.length === 0 ? (
          <Typography color="text.secondary" sx={{ p: 2.5 }}>Bu durumda sipariş bulunmuyor.</Typography>
        ) : (
          filteredOrders.slice(0, visibleCount).map(order => {
            return (
            <Card key={order.id} sx={{ p: 2.5, ...(selectedOrders.includes(order.id) && { outline: '2px solid #16a34a', outlineOffset: -2 }) }}>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
                <Stack direction="row" alignItems="center" spacing={0.5}>
                  {nextStatus[order.status] && (
                    <Checkbox size="small" checked={selectedOrders.includes(order.id)} onChange={() => toggleSelectOrder(order.id)}
                      sx={{ p: 0, mr: 0.5 }} />
                  )}
                  <Typography sx={{ fontWeight: 800, fontSize: 16 }}>#{order.id} - {formatDate(order.createdAt)}</Typography>
                </Stack>
              </Stack>
              <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mb: 1.5 }}>
                <Chip label={order.order_type === 'online' ? `🌐 Online` : order.table ? `🪑 Masa - ${order.table.table_name || 'Masa ' + order.table.table_number}` : `📱 Telefon`}
                  size="small" sx={{ bgcolor: order.order_type === 'online' ? '#dbeafe' : order.table ? '#fef3c7' : '#f3e8ff', fontWeight: 500 }} />
                {order.status !== 'cancelled' && order.status !== 'delivered' && (
                  <IconButton size="small" onClick={() => { setTableEditOrder(order); setSelectedTableId(order.table_id || ''); }}
                    title="Masa Düzenle" sx={{ color: '#666', width: 24, height: 24 }}>
                    <EditIcon sx={{ fontSize: 16 }} />
                  </IconButton>
                )}
              </Stack>
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
                {order.order_type !== 'table' && (
                  <Typography variant="caption">
                    Ödeme Durumu: <Chip label={paymentStatusLabel(order.payment_status)} size="small"
                      sx={{ fontSize: 10, fontWeight: 700, bgcolor: paymentStatusColor(order.payment_status), color: '#fff', height: 20 }} />
                  </Typography>
                )}
                {order.order_note && (
                  <Typography variant="caption">📝 Not: {order.order_note}</Typography>
                )}
              </Stack>

              <Typography sx={{ fontWeight: 800, fontSize: 18, color: '#dc2626', mb: 1.5 }}>{parseFloat(order.total_amount).toFixed(2)} TL</Typography>
              {order.promo_code && (
                <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                  <Chip label={`Kupon: ${order.promo_code}`} size="small" sx={{ fontSize: 11, fontWeight: 600, bgcolor: '#fef3c7', color: '#92400e' }} />
                  {parseFloat(order.discount_amount || 0) > 0 && (
                    <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 700 }}>
                      İndirim: -{parseFloat(order.discount_amount).toFixed(2)} TL
                    </Typography>
                  )}
                </Stack>
              )}
              <Stack direction="row" spacing={1}>
                {nextStatus[order.status] && (
                  <Button size="small" variant="contained" color="success" onClick={() => handleStatusChange(order.id, nextStatus[order.status], order)}
                    sx={{ fontWeight: 600, fontSize: 12 }}>
                    {order.status === 'pending' ? '✅ Onayla' : order.status === 'preparing' || order.status === 'confirmed' ? '🚀 Teslim Et' : `→ ${statusLabels[nextStatus[order.status]]}`}
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

      {filteredOrders.length > visibleCount && (
        <Box sx={{ textAlign: 'center', mt: 2 }}>
          <Button variant="outlined" onClick={() => setVisibleCount(prev => prev + 50)} sx={{ fontWeight: 600 }}>
            Daha Fazla Göster ({filteredOrders.length - visibleCount} sipariş daha)
          </Button>
        </Box>
      )}

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
              {cancelConfirm.payment_method === 'online' && cancelConfirm.payment_status === 'paid' && (
                <Box sx={{ mt: 1.5, p: 1.2, bgcolor: '#fef3c7', borderRadius: 2, border: '1px solid #fbbf24' }}>
                  <Typography variant="caption" sx={{ fontWeight: 700, color: '#92400e', display: 'block' }}>
                    💳 Bu sipariş PayTR ile ödenmiş
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#92400e' }}>
                    İptal onaylandığında müşteriye {parseFloat(cancelConfirm.total_amount).toFixed(2)} TL otomatik olarak iade edilecektir.
                  </Typography>
                </Box>
              )}
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

      {/* Masa Düzenle Modalı */}
      <Dialog open={!!tableEditOrder} onClose={() => setTableEditOrder(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Masa Düzenle - #{tableEditOrder?.id}</DialogTitle>
        <DialogContent>
          <FormControl fullWidth size="small" sx={{ mt: 1 }}>
            <InputLabel>Masa Seçiniz</InputLabel>
            <Select value={selectedTableId} onChange={e => setSelectedTableId(e.target.value)} label="Masa Seçiniz">
              <MenuItem value="">Masa Yok (Telefon Siparişi)</MenuItem>
              {tables.map(t => (
                <MenuItem key={t.id} value={t.id}>{t.table_name ? `${t.table_name} (${t.table_number})` : `Masa ${t.table_number}`}</MenuItem>
              ))}
            </Select>
          </FormControl>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setTableEditOrder(null)} variant="outlined" sx={{ fontWeight: 600 }}>Vazgeç</Button>
          <Button onClick={() => handleTableChange(tableEditOrder.id, selectedTableId)} variant="contained" sx={{ fontWeight: 600 }}>Kaydet</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
