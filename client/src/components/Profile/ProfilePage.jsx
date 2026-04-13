import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/axios';
import {
  Box, Typography, Card, Stack, Chip, Divider, CircularProgress, Avatar, TextField, Button
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import toast from 'react-hot-toast';

const statusLabels = {
  pending: 'Bekleyen', confirmed: 'Onaylanan', preparing: 'Hazırlanıyor',
  ready: 'Hazır', delivered: 'Teslim Edildi', cancelled: 'İptal',
};
const statusColors = {
  pending: '#f59e0b', confirmed: '#3b82f6', preparing: '#8b5cf6',
  ready: '#16a34a', delivered: '#64748b', cancelled: '#dc2626',
};

export default function ProfilePage() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [address, setAddress] = useState('');

  useEffect(() => {
    api.get('/orders/my').then(res => { setOrders(res.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user) {
      const saved = localStorage.getItem(`address_${user.id}`);
      if (saved) setAddress(saved);
    }
  }, [user]);

  const saveAddress = () => {
    localStorage.setItem(`address_${user.id}`, address);
    toast.success('Adres kaydedildi');
  };

  const formatDate = (d) => new Date(d).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (!user) return null;

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto', p: 3 }}>
      {/* User Info */}
      <Card sx={{ p: 3, mb: 3 }}>
        <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 2 }}>
          <Avatar sx={{ width: 56, height: 56, bgcolor: '#dc2626', fontSize: 24 }}>
            <PersonIcon fontSize="large" />
          </Avatar>
          <Box>
            <Typography variant="h5" sx={{ fontWeight: 800 }}>{user.first_name} {user.last_name}</Typography>
            <Typography variant="body2" color="text.secondary">{user.role === 'admin' ? 'Admin' : 'Müşteri'}</Typography>
          </Box>
        </Stack>
        <Divider sx={{ mb: 2 }} />
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <Box>
            <Typography variant="caption" color="text.secondary">E-posta</Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>{user.email || '-'}</Typography>
          </Box>
          <Box>
            <Typography variant="caption" color="text.secondary">Telefon</Typography>
            <Typography variant="body1" sx={{ fontWeight: 600 }}>{user.phone}</Typography>
          </Box>
        </Box>
        <Box sx={{ mt: 2 }}>
          <Typography variant="caption" color="text.secondary">Kayıtlı Adres</Typography>
          <Stack direction="row" spacing={1} sx={{ mt: 0.5 }}>
            <TextField fullWidth size="small" placeholder="Teslimat adresinizi kaydedin..." value={address} onChange={e => setAddress(e.target.value)} />
            <Button variant="contained" size="small" onClick={saveAddress} sx={{ fontWeight: 600, whiteSpace: 'nowrap' }}>Kaydet</Button>
          </Stack>
        </Box>
      </Card>

      {/* Order History */}
      <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Geçmiş Siparişlerim</Typography>
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>
      ) : orders.length === 0 ? (
        <Card sx={{ p: 3, textAlign: 'center' }}>
          <Typography color="text.secondary">Henüz siparişiniz bulunmuyor.</Typography>
        </Card>
      ) : (
        orders.map(order => (
          <Card key={order.id} sx={{ p: 2.5, mb: 2 }}>
            <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
              <Typography sx={{ fontWeight: 800 }}>#{order.id} - {formatDate(order.createdAt)}</Typography>
              <Chip label={statusLabels[order.status] || order.status} size="small"
                sx={{ fontWeight: 700, bgcolor: statusColors[order.status] || '#888', color: '#fff' }} />
            </Stack>
            {order.delivery_address && (
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>📍 {order.delivery_address}</Typography>
            )}
            <Box sx={{ mb: 1 }}>
              {order.items?.map((item, i) => (
                <Box key={i}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {item.quantity}x {item.product?.name || 'Ürün'}
                    <Typography component="span" variant="caption" sx={{ ml: 0.5, color: '#888' }}>
                      ({(parseFloat(item.unit_price) * item.quantity).toFixed(2)} TL)
                    </Typography>
                  </Typography>
                  {item.extras?.length > 0 && (
                    <Typography variant="caption" sx={{ color: '#8b5cf6', ml: 2, display: 'block' }}>
                      + {item.extras.map(e => e.name).join(', ')}
                    </Typography>
                  )}
                </Box>
              ))}
            </Box>
            <Divider sx={{ my: 1 }} />
            <Stack direction="row" justifyContent="space-between" alignItems="center">
              <Typography variant="caption" color="text.secondary">
                {order.payment_method === 'online' ? '💳 Online Ödeme' : '💵 Nakit'}
                {' • '}
                {order.payment_status === 'paid' ? '✅ Ödendi' : order.payment_status === 'failed' ? '❌ İptal' : '⏳ Bekliyor'}
              </Typography>
              <Typography sx={{ fontWeight: 800, color: '#dc2626' }}>{parseFloat(order.total_amount).toFixed(2)} TL</Typography>
            </Stack>
          </Card>
        ))
      )}
    </Box>
  );
}
