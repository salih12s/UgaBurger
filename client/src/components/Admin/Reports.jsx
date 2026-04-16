import { useState, useEffect } from 'react';
import api from '../../api/api';
import {
  Box, Typography, Card, TextField, Stack, Chip, Collapse, IconButton,
  Table, TableHead, TableBody, TableRow, TableCell, CircularProgress, Button, Divider
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';

export default function Reports() {
  const today = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(today);
  const [endDate, setEndDate] = useState(today);
  const [report, setReport] = useState(null);
  const [loading, setLoading] = useState(false);
  const [onlineExpanded, setOnlineExpanded] = useState(false);
  const [tableExpanded, setTableExpanded] = useState(false);
  const [searchFilter, setSearchFilter] = useState('');
  const [creditExpanded, setCreditExpanded] = useState(false);

  const fetchReport = () => {
    setLoading(true);
    api.get(`/admin/reports/daily?startDate=${startDate}&endDate=${endDate}`)
      .then(res => setReport(res.data))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchReport(); }, []);

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    return d.toLocaleString('tr-TR', { hour: '2-digit', minute: '2-digit', day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const paymentLabel = (m, type) => {
    if (m === 'online') return '💳 Kart';
    return '💵 Nakit';
  };
  const statusLabels = { pending: 'Bekleyen', confirmed: 'Onaylanan', preparing: 'Hazırlanıyor', ready: 'Hazır', delivered: 'Teslim Edildi', cancelled: 'İptal' };

  if (loading || !report) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;

  const onlineOrders = report.orderDetails?.filter(o => o.order_type === 'online') || [];
  const tableOrders = report.orderDetails?.filter(o => o.order_type === 'table') || [];

  // Filtre: masa numarası, ismi veya müşteri adı
  const filterOrders = (orders) => {
    if (!searchFilter.trim()) return orders;
    const q = searchFilter.toLowerCase();
    return orders.filter(o => {
      const tableNum = o.table?.table_number?.toString() || '';
      const tableName = (o.table?.table_name || '').toLowerCase();
      const customerName = o.customer_name ? o.customer_name.toLowerCase() : '';
      const userName = o.user ? `${o.user.first_name} ${o.user.last_name}`.toLowerCase() : '';
      return tableNum.includes(q) || tableName.includes(q) || customerName.includes(q) || userName.includes(q) || `#${o.id}`.includes(q);
    });
  };

  const filteredOnlineOrders = filterOrders(onlineOrders);
  const filteredTableOrders = filterOrders(tableOrders);
  const isFiltered = searchFilter.trim() !== '';

  // Açık hesap: pending ödeme durumundaki müşteriler (customer_name bazlı)
  const creditOrders = (report.orderDetails || []).filter(o => o.customer_name && o.payment_method !== 'online');
  const creditByCustomer = {};
  creditOrders.forEach(o => {
    const name = o.customer_name;
    if (!creditByCustomer[name]) creditByCustomer[name] = { name, orders: [], total: 0 };
    creditByCustomer[name].orders.push(o);
    creditByCustomer[name].total += parseFloat(o.total_amount);
  });
  const creditList = Object.values(creditByCustomer).sort((a, b) => b.total - a.total);

  const displayTotalOrders = isFiltered ? filteredOnlineOrders.length + filteredTableOrders.length : report.totalOrders;
  const displayTotalRevenue = isFiltered ? [...filteredOnlineOrders, ...filteredTableOrders].reduce((s, o) => s + parseFloat(o.total_amount), 0) : parseFloat(report.totalRevenue);
  const displayOnlineCount = isFiltered ? filteredOnlineOrders.length : report.onlineOrders;
  const displayOnlineRevenue = isFiltered ? filteredOnlineOrders.reduce((s, o) => s + parseFloat(o.total_amount), 0) : parseFloat(report.onlineRevenue || 0);
  const displayTableCount = isFiltered ? filteredTableOrders.length : report.tableOrders;
  const displayTableRevenue = isFiltered ? filteredTableOrders.reduce((s, o) => s + parseFloat(o.total_amount), 0) : parseFloat(report.tableRevenue || 0);

  const stats = [
    { label: 'Toplam Sipariş', value: displayTotalOrders, color: '#3b82f6' },
    { label: 'Toplam Gelir', value: `${displayTotalRevenue.toFixed(2)} ₺`, color: '#16a34a' },
    { label: 'Online Sipariş', value: `${displayOnlineCount} (${displayOnlineRevenue.toFixed(2)} ₺)`, color: '#8b5cf6' },
    { label: 'Masa Siparişi', value: `${displayTableCount} (${displayTableRevenue.toFixed(2)} ₺)`, color: '#f59e0b' },
  ];

  const renderOrderTable = (orders) => (
    <Table size="small">
      <TableHead>
        <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: '#f8f8f8', fontSize: 12 } }}>
          <TableCell>#</TableCell>
          <TableCell>Müşteri</TableCell>
          <TableCell>Ürünler</TableCell>
          <TableCell>Ödeme</TableCell>
          <TableCell>Durum</TableCell>
          <TableCell>Tutar</TableCell>
          <TableCell>Tarih</TableCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {orders.map(o => (
          <TableRow key={o.id} hover>
            <TableCell sx={{ fontWeight: 700 }}>#{o.id}</TableCell>
            <TableCell>
              {o.user ? `${o.user.first_name} ${o.user.last_name}` : (o.customer_name || '-')}
              {(o.user?.phone || o.customer_phone) && <Typography variant="caption" display="block" color="text.secondary">{o.user?.phone || o.customer_phone}</Typography>}
              {o.delivery_address && <Typography variant="caption" display="block" color="text.secondary">📍 {o.delivery_address}</Typography>}
              {o.table && <Typography variant="caption" display="block" color="text.secondary">🪑 {o.table.table_name ? `${o.table.table_name} (${o.table.table_number})` : `Masa ${o.table.table_number}`}</Typography>}
            </TableCell>
            <TableCell>
              <Typography variant="caption">
                {o.items.map((it, i) => (
                  <span key={i}>
                    {i > 0 && <span style={{ color: '#ccc', margin: '0 4px' }}>|</span>}
                    {it.quantity}x {it.name}
                    {it.extras?.length > 0 && <span style={{ color: '#888' }}> (+{it.extras.map(e => `${(e.quantity || 1) > 1 ? (e.quantity||1)+'x ' : ''}${e.name}`).join(', ')})</span>}
                  </span>
                ))}
              </Typography>
            </TableCell>
            <TableCell><Typography variant="caption">{paymentLabel(o.payment_method, o.order_type)}</Typography></TableCell>
            <TableCell><Chip label={statusLabels[o.status] || o.status} size="small" sx={{ fontSize: 11, fontWeight: 600 }} /></TableCell>
            <TableCell sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{parseFloat(o.total_amount).toFixed(2)} ₺</TableCell>
            <TableCell><Typography variant="caption">{formatDate(o.created_at)}</Typography></TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>Raporlar</Typography>
        <Stack direction="row" spacing={1} alignItems="center">
          <TextField type="date" size="small" label="Başlangıç" value={startDate} onChange={e => setStartDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          <TextField type="date" size="small" label="Bitiş" value={endDate} onChange={e => setEndDate(e.target.value)} InputLabelProps={{ shrink: true }} />
          <Button variant="contained" size="small" onClick={fetchReport} sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>Filtrele</Button>
        </Stack>
      </Stack>

      <TextField fullWidth size="small" placeholder="Masa no, masa ismi, müşteri adı veya sipariş # ile ara..."
        value={searchFilter} onChange={e => setSearchFilter(e.target.value)} sx={{ mb: 2 }} />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(4, 1fr)' }, gap: 2, mb: 3 }}>
        {stats.map((s, i) => (
          <Card key={i} sx={{ p: 2.5, textAlign: 'center', borderTop: `3px solid ${s.color}` }}>
            <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>{s.label}</Typography>
            <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>{s.value}</Typography>
          </Card>
        ))}
      </Box>

      {/* Online Siparişler */}
      <Card sx={{ p: 2.5, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center"
          onClick={() => setOnlineExpanded(!onlineExpanded)} sx={{ cursor: 'pointer' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            🌐 Online Siparişler ({filteredOnlineOrders.length})
          </Typography>
          <IconButton size="small">{onlineExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>
        </Stack>
        <Collapse in={onlineExpanded}>
          <Box sx={{ mt: 1.5 }}>
            {filteredOnlineOrders.length === 0 ? (
              <Typography color="text.secondary" variant="body2">Online sipariş bulunmuyor.</Typography>
            ) : renderOrderTable(filteredOnlineOrders)}
          </Box>
        </Collapse>
      </Card>

      {/* Masa Siparişleri */}
      <Card sx={{ p: 2.5, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center"
          onClick={() => setTableExpanded(!tableExpanded)} sx={{ cursor: 'pointer' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            🪑 Masa Siparişleri ({filteredTableOrders.length})
          </Typography>
          <IconButton size="small">{tableExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>
        </Stack>
        <Collapse in={tableExpanded}>
          <Box sx={{ mt: 1.5 }}>
            {filteredTableOrders.length === 0 ? (
              <Typography color="text.secondary" variant="body2">Masa siparişi bulunmuyor.</Typography>
            ) : renderOrderTable(filteredTableOrders)}
          </Box>
        </Collapse>
      </Card>

      {/* Açık Hesaplar */}
      {creditList.length > 0 && (
        <Card sx={{ p: 2.5, mb: 3 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center"
            onClick={() => setCreditExpanded(!creditExpanded)} sx={{ cursor: 'pointer' }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
              💰 Açık Hesaplar - Müşteri Bazlı ({creditList.length} müşteri)
            </Typography>
            <IconButton size="small">{creditExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>
          </Stack>
          <Collapse in={creditExpanded}>
            <Box sx={{ mt: 1.5 }}>
              <Table size="small">
                <TableHead>
                  <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: '#f8f8f8', fontSize: 12 } }}>
                    <TableCell>Müşteri</TableCell>
                    <TableCell>Sipariş Sayısı</TableCell>
                    <TableCell>Toplam Borç</TableCell>
                    <TableCell>Siparişler</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {creditList.map((c, i) => (
                    <TableRow key={i} hover>
                      <TableCell sx={{ fontWeight: 700 }}>{c.name}</TableCell>
                      <TableCell>{c.orders.length}</TableCell>
                      <TableCell sx={{ fontWeight: 700, color: '#dc2626' }}>{c.total.toFixed(2)} ₺</TableCell>
                      <TableCell>
                        <Typography variant="caption">
                          {c.orders.map((o, j) => (
                            <span key={o.id}>
                              {j > 0 && ', '}
                              #{o.id} ({parseFloat(o.total_amount).toFixed(2)}₺)
                            </span>
                          ))}
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          </Collapse>
        </Card>
      )}

      {/* Ürün Bazlı Satışlar */}
      <Card sx={{ p: 2.5, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 2 }}>Ürün Bazlı Satışlar</Typography>
        {report.productStats.length === 0 ? (
          <Typography color="text.secondary">Bu tarih aralığında satış bulunmuyor.</Typography>
        ) : (
          <Table>
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: '#f8f8f8' } }}>
                <TableCell>Ürün</TableCell>
                <TableCell>Adet</TableCell>
                <TableCell>Toplam Gelir</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {report.productStats.map((p, i) => (
                <TableRow key={i} hover>
                  <TableCell sx={{ fontWeight: 600 }}>{p.name}</TableCell>
                  <TableCell>{p.quantity}</TableCell>
                  <TableCell>{parseFloat(p.revenue).toFixed(2)} TL</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
        <Card sx={{ p: 2.5, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>Ortalama Sipariş Tutarı</Typography>
          <Typography variant="h5" sx={{ fontWeight: 800, mt: 0.5 }}>{parseFloat(report.avgOrderAmount).toFixed(2)} ₺</Typography>
        </Card>
        <Card sx={{ p: 2.5, textAlign: 'center' }}>
          <Typography variant="body2" color="text.secondary" sx={{ fontWeight: 500 }}>Tarih Aralığı</Typography>
          <Typography variant="h6" sx={{ fontWeight: 800, mt: 0.5 }}>{report.startDate} — {report.endDate}</Typography>
        </Card>
      </Box>
    </Box>
  );
}
