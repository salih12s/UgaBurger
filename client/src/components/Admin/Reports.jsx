import { useState, useEffect } from 'react';
import api from '../../api/axios';
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

  const paymentLabel = (m, type) => m === 'online' ? 'Online Ödeme' : type === 'table' ? 'Masada Ödeme' : 'Kapıda Ödeme';
  const statusLabels = { pending: 'Bekleyen', confirmed: 'Onaylanan', preparing: 'Hazırlanan', ready: 'Hazır', delivered: 'Teslim Edildi', cancelled: 'İptal' };

  if (loading || !report) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;

  const onlineOrders = report.orderDetails?.filter(o => o.order_type === 'online') || [];
  const tableOrders = report.orderDetails?.filter(o => o.order_type === 'table') || [];

  const stats = [
    { label: 'Toplam Sipariş', value: report.totalOrders, color: '#3b82f6' },
    { label: 'Toplam Gelir', value: `${parseFloat(report.totalRevenue).toFixed(2)} ₺`, color: '#16a34a' },
    { label: 'Online Sipariş', value: `${report.onlineOrders} (${parseFloat(report.onlineRevenue || 0).toFixed(2)} ₺)`, color: '#8b5cf6' },
    { label: 'Masa Siparişi', value: `${report.tableOrders} (${parseFloat(report.tableRevenue || 0).toFixed(2)} ₺)`, color: '#f59e0b' },
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
              {o.user ? `${o.user.first_name} ${o.user.last_name}` : '-'}
              {o.user?.phone && <Typography variant="caption" display="block" color="text.secondary">{o.user.phone}</Typography>}
              {o.delivery_address && <Typography variant="caption" display="block" color="text.secondary">📍 {o.delivery_address}</Typography>}
              {o.table && <Typography variant="caption" display="block" color="text.secondary">🪑 Masa {o.table.table_number}</Typography>}
            </TableCell>
            <TableCell>
              {o.items.map((it, i) => (
                <Typography key={i} variant="caption" display="block">
                  {it.quantity}x {it.name}
                  {it.extras?.length > 0 && <span style={{ color: '#888' }}> (+{it.extras.map(e => e.name).join(', ')})</span>}
                </Typography>
              ))}
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
            🌐 Online Siparişler ({onlineOrders.length})
          </Typography>
          <IconButton size="small">{onlineExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>
        </Stack>
        <Collapse in={onlineExpanded}>
          <Box sx={{ mt: 1.5 }}>
            {onlineOrders.length === 0 ? (
              <Typography color="text.secondary" variant="body2">Online sipariş bulunmuyor.</Typography>
            ) : renderOrderTable(onlineOrders)}
          </Box>
        </Collapse>
      </Card>

      {/* Masa Siparişleri */}
      <Card sx={{ p: 2.5, mb: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="center"
          onClick={() => setTableExpanded(!tableExpanded)} sx={{ cursor: 'pointer' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>
            🪑 Masa Siparişleri ({tableOrders.length})
          </Typography>
          <IconButton size="small">{tableExpanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}</IconButton>
        </Stack>
        <Collapse in={tableExpanded}>
          <Box sx={{ mt: 1.5 }}>
            {tableOrders.length === 0 ? (
              <Typography color="text.secondary" variant="body2">Masa siparişi bulunmuyor.</Typography>
            ) : renderOrderTable(tableOrders)}
          </Box>
        </Collapse>
      </Card>

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
