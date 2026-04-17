import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../../api/api';
import toast from 'react-hot-toast';
import { Box, Card, Typography, TextField, Button } from '@mui/material';

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [newPass, setNewPass] = useState('');
  const [newPass2, setNewPass2] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!newPass || !newPass2) { toast.error('Şifreleri doldurunuz'); return; }
    if (newPass !== newPass2) { toast.error('Şifreler eşleşmiyor'); return; }
    if (newPass.length < 6) { toast.error('Şifre en az 6 karakter olmalı'); return; }
    setLoading(true);
    try {
      await api.post(`/auth/reset-password/${token}`, { new_password: newPass });
      toast.success('Şifreniz güncellendi! Giriş yapabilirsiniz.');
      navigate('/login');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Hata oluştu');
    } finally { setLoading(false); }
  };

  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3, bgcolor: '#f5f5f5' }}>
      <Card sx={{ p: { xs: 3, md: 5 }, width: '100%', maxWidth: 480 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, textAlign: 'center', mb: 1 }}>Şifre Sıfırlama</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', mb: 3 }}>
          Yeni şifrenizi giriniz.
        </Typography>
        <form onSubmit={handleSubmit}>
          <TextField fullWidth label="Yeni Şifre" type="password" value={newPass}
            onChange={e => setNewPass(e.target.value)} sx={{ mb: 2 }} />
          <TextField fullWidth label="Yeni Şifre (Tekrar)" type="password" value={newPass2}
            onChange={e => setNewPass2(e.target.value)} sx={{ mb: 2 }} />
          <Button fullWidth type="submit" variant="contained" disabled={loading}
            sx={{ py: 1.5, fontSize: 15, fontWeight: 700, bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' } }}>
            {loading ? 'Güncelleniyor...' : 'Şifreyi Güncelle'}
          </Button>
        </form>
      </Card>
    </Box>
  );
}
