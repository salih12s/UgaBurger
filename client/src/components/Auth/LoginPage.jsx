import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Box, Card, Typography, TextField, Button, Divider } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!phone || !password) { toast.error('Tüm alanları doldurunuz'); return; }
    setLoading(true);
    try {
      const user = await login(phone, password);
      toast.success('Giriş başarılı!');
      navigate(user.role === 'admin' ? '/admin' : '/menu');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Giriş hatası');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Box sx={{ minHeight: 'calc(100vh - 100px)', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3, bgcolor: '#f5f5f5' }}>
      <Card sx={{ p: { xs: 3, md: 5 }, width: '100%', maxWidth: 480 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, textAlign: 'center', mb: 3.5 }}>
          Giriş Yap
        </Typography>
        <form onSubmit={handleSubmit}>
          <TextField fullWidth label="Telefon Numarası" type="tel" placeholder="05XX..."
            value={phone} onChange={e => setPhone(e.target.value)} sx={{ mb: 2 }} size="medium" />
          <TextField fullWidth label="Şifre" type="password"
            value={password} onChange={e => setPassword(e.target.value)} sx={{ mb: 2 }} size="medium" />
          <Button fullWidth type="submit" variant="contained" color="primary" disabled={loading}
            sx={{ py: 1.5, fontSize: 15, fontWeight: 700, mt: 1 }}>
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </Button>
        </form>
        <Divider sx={{ my: 2 }} />
        <Button fullWidth variant="outlined" startIcon={<GoogleIcon />}
          onClick={() => toast('Google giriş yakında aktif olacak')}
          sx={{ color: '#333', borderColor: '#ddd', fontWeight: 600, py: 1.2 }}>
          Google ile Giriş Yap
        </Button>
        <Typography variant="body2" sx={{ textAlign: 'center', mt: 2.5, color: '#666' }}>
          Hesabınız yok mu? <Typography component={Link} to="/register" sx={{ color: '#dc2626', fontWeight: 600, textDecoration: 'none' }}>Kayıt Ol</Typography>
        </Typography>
      </Card>
    </Box>
  );
}
