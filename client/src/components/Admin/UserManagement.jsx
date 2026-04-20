import { useState, useEffect } from 'react';
import api from '../../api/api';
import {
  Box, Typography, Card, Stack, TextField, Chip, Avatar, Divider, CircularProgress
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import HomeIcon from '@mui/icons-material/Home';
import WorkIcon from '@mui/icons-material/Work';
import LocationOnIcon from '@mui/icons-material/LocationOn';

const addressIcons = { 'Ev': <HomeIcon fontSize="small" />, 'İş': <WorkIcon fontSize="small" /> };

export default function UserManagement() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    api.get('/admin/users').then(res => {
      setUsers(res.data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const filtered = users.filter(u => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      `${u.first_name} ${u.last_name}`.toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.phone || '').includes(q)
    );
  });

  const formatDate = (d) => new Date(d).toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;
  }

  return (
    <Box>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Üye Yönetimi</Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        Toplam {users.length} kayıtlı üye
      </Typography>

      <TextField
        fullWidth size="small" placeholder="İsim, e-posta veya telefon ile ara..."
        value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
        sx={{ mb: 3 }}
      />

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
        {filtered.length === 0 ? (
          <Typography color="text.secondary" sx={{ p: 2 }}>Üye bulunamadı.</Typography>
        ) : (
          filtered.map(user => (
            <Card key={user.id} sx={{ p: 2.5 }}>
              <Stack direction="row" spacing={2} alignItems="center" sx={{ mb: 1.5 }}>
                <Avatar sx={{ width: 44, height: 44, bgcolor: user.role === 'admin' ? '#f59e0b' : '#3b82f6' }}>
                  {user.role === 'admin' ? <AdminPanelSettingsIcon /> : <PersonIcon />}
                </Avatar>
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontWeight: 700, fontSize: 15 }}>{user.first_name} {user.last_name}</Typography>
                  <Chip label={user.role === 'admin' ? 'Admin' : 'Müşteri'} size="small"
                    sx={{ fontSize: 10, fontWeight: 700, height: 20,
                      bgcolor: user.role === 'admin' ? '#fef3c7' : '#dbeafe',
                      color: user.role === 'admin' ? '#92400e' : '#1e40af' }} />
                </Box>
              </Stack>

              <Divider sx={{ mb: 1.5 }} />

              <Stack spacing={0.5} sx={{ mb: 1.5 }}>
                <Typography variant="caption" color="text.secondary">
                  ✉️ {user.email || '-'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  📞 {user.phone || '-'}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  📅 Kayıt: {formatDate(user.created_at)}
                </Typography>
              </Stack>

              <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
                <Chip label={`${user.order_count} Sipariş`} size="small"
                  sx={{ fontSize: 11, fontWeight: 600, bgcolor: '#f0fdf4', color: '#16a34a' }} />
                <Chip label={`${parseFloat(user.total_spent).toFixed(2)} TL`} size="small"
                  sx={{ fontSize: 11, fontWeight: 600, bgcolor: '#fef3c7', color: '#92400e' }} />
              </Stack>

              {user.addresses && user.addresses.length > 0 && (
                <Box>
                  <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.5 }}>
                    Adresler ({user.addresses.length})
                  </Typography>
                  {user.addresses.map((a, i) => (
                    <Box key={i} sx={{ display: 'flex', alignItems: 'flex-start', gap: 0.5, mb: 0.5 }}>
                      <Box sx={{ color: '#3b82f6', mt: 0.2 }}>
                        {addressIcons[a.title] || <LocationOnIcon fontSize="small" />}
                      </Box>
                      <Box>
                        <Typography variant="caption" sx={{ fontWeight: 600 }}>{a.title}</Typography>
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', fontSize: 11 }}>
                          {a.address}
                        </Typography>
                      </Box>
                    </Box>
                  ))}
                </Box>
              )}
            </Card>
          ))
        )}
      </Box>
    </Box>
  );
}
