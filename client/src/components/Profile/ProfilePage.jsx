import { useState, useEffect } from 'react';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/api';
import {
  Box, Typography, Card, Stack, Chip, Divider, CircularProgress, Avatar, IconButton
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import HomeIcon from '@mui/icons-material/Home';
import WorkIcon from '@mui/icons-material/Work';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import toast from 'react-hot-toast';
import AddressFormDialog from '../Cart/AddressFormDialog';
import { Button } from '@mui/material';

const statusLabels = {
  pending: 'Bekleyen', confirmed: 'Onaylanan', preparing: 'Hazırlanıyor',
  ready: 'Hazır', delivered: 'Teslim Edildi', cancelled: 'İptal',
};
const statusColors = {
  pending: '#f59e0b', confirmed: '#3b82f6', preparing: '#8b5cf6',
  ready: '#16a34a', delivered: '#64748b', cancelled: '#dc2626',
};

const addressIcons = { 'Ev': <HomeIcon fontSize="small" />, 'İş': <WorkIcon fontSize="small" /> };

export default function ProfilePage() {
  const { user, refreshUser } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addresses, setAddresses] = useState([]);
  const [addrDialog, setAddrDialog] = useState(false);
  const [editIdx, setEditIdx] = useState(-1);
  const [editAddress, setEditAddress] = useState(null);

  useEffect(() => {
    api.get('/orders/my').then(res => { setOrders(res.data); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (user?.addresses && Array.isArray(user.addresses)) {
      setAddresses(user.addresses);
    }
  }, [user]);

  const saveAddresses = async (newList) => {
    try {
      await api.put('/auth/profile', { addresses: newList });
      setAddresses(newList);
      if (refreshUser) refreshUser();
      toast.success('Adresler güncellendi');
    } catch {
      toast.error('Adres kaydedilemedi');
    }
  };

  const openAddDialog = () => { setEditIdx(-1); setEditAddress(null); setAddrDialog(true); };
  const openEditDialog = (idx) => { setEditIdx(idx); setEditAddress(addresses[idx]); setAddrDialog(true); };

  const handleSaveAddr = (addressData) => {
    const newList = [...addresses];
    if (editIdx >= 0) {
      newList[editIdx] = addressData;
    } else {
      newList.push(addressData);
    }
    saveAddresses(newList);
    setAddrDialog(false);
  };

  const handleDeleteAddr = (idx) => {
    const newList = addresses.filter((_, i) => i !== idx);
    saveAddresses(newList);
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

        {/* Multi-address management */}
        <Box sx={{ mt: 2.5 }}>
          <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Kayıtlı Adreslerim</Typography>
            <Button size="small" startIcon={<AddIcon />} onClick={openAddDialog} sx={{ fontWeight: 600, textTransform: 'none' }}>Yeni Adres</Button>
          </Stack>
          {addresses.length === 0 ? (
            <Box sx={{ p: 2.5, border: '2px dashed #e5e7eb', borderRadius: 2, textAlign: 'center', cursor: 'pointer' }} onClick={openAddDialog}>
              <LocationOnIcon sx={{ fontSize: 32, color: '#9ca3af', mb: 0.5 }} />
              <Typography variant="body2" color="text.secondary">Henüz kayıtlı adresiniz yok</Typography>
              <Typography variant="caption" color="primary">+ Adres Ekle</Typography>
            </Box>
          ) : (
            addresses.map((a, i) => (
              <Box key={i} sx={{ border: 1, borderColor: '#e5e7eb', borderRadius: 2, p: 1.5, mb: 1, '&:hover': { borderColor: '#3b82f6', bgcolor: '#f8fafc' } }}>
                <Stack direction="row" alignItems="center" spacing={1.5}>
                  <Avatar sx={{ width: 36, height: 36, bgcolor: '#eff6ff', color: '#3b82f6' }}>
                    {addressIcons[a.title] || <LocationOnIcon fontSize="small" />}
                  </Avatar>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{a.title}</Typography>
                    <Typography variant="caption" color="text.secondary">{a.address}</Typography>
                  </Box>
                  <IconButton size="small" onClick={() => openEditDialog(i)} sx={{ color: '#3b82f6' }}><EditIcon fontSize="small" /></IconButton>
                  <IconButton size="small" onClick={() => handleDeleteAddr(i)} sx={{ color: '#dc2626' }}><DeleteIcon fontSize="small" /></IconButton>
                </Stack>
              </Box>
            ))
          )}
        </Box>
      </Card>

      {/* Address Add/Edit Dialog - Uses the full map-based AddressFormDialog */}
      <AddressFormDialog
        open={addrDialog}
        onClose={() => setAddrDialog(false)}
        onSave={handleSaveAddr}
        editAddress={editAddress}
      />

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
