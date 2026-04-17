import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import api from '../../api/api';
import toast from 'react-hot-toast';
import { Box, Card, Typography, TextField, Button, Divider, Dialog, DialogContent } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import { useGoogleLogin } from '@react-oauth/google';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function GoogleLoginBtn() {
  const { googleAuth } = useAuth();
  const navigate = useNavigate();
  const handleGoogleClick = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
      try {
        const user = await googleAuth(tokenResponse.access_token);
        toast.success('Google ile giriş başarılı!');
        navigate(user.role === 'admin' ? '/admin' : '/menu');
      } catch (err) {
        toast.error(err.response?.data?.error || 'Google giriş hatası');
      }
    },
    onError: () => toast.error('Google giriş hatası'),
  });
  return (
    <Button fullWidth variant="outlined" startIcon={<GoogleIcon />}
      onClick={() => handleGoogleClick()}
      sx={{ color: '#333', borderColor: '#ddd', fontWeight: 600, py: 1.2 }}>
      Google ile Giriş Yap
    </Button>
  );
}

export default function LoginPage() {
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Forgot password states
  const [fpOpen, setFpOpen] = useState(false);
  const [fpEmail, setFpEmail] = useState('');
  const [fpLoading, setFpLoading] = useState(false);
  const [fpSent, setFpSent] = useState(false);

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

  const handleFpReset = async () => {
    if (!fpEmail) { toast.error('E-posta adresi gerekli'); return; }
    setFpLoading(true);
    try {
      await api.post('/auth/forgot-password', { email: fpEmail });
      setFpSent(true);
    } catch (err) {
      toast.error(err.response?.data?.error || 'Hata');
    } finally { setFpLoading(false); }
  };

  const closeFp = () => {
    setFpOpen(false);
    setFpEmail(''); setFpSent(false);
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
            value={password} onChange={e => setPassword(e.target.value)} sx={{ mb: 1 }} size="medium" />
          <Typography variant="body2" sx={{ textAlign: 'right', mb: 2 }}>
            <Typography component="span" onClick={() => setFpOpen(true)}
              sx={{ color: '#3b82f6', fontWeight: 600, cursor: 'pointer', '&:hover': { textDecoration: 'underline' } }}>
              Şifremi Unuttum
            </Typography>
          </Typography>
          <Button fullWidth type="submit" variant="contained" color="primary" disabled={loading}
            sx={{ py: 1.5, fontSize: 15, fontWeight: 700 }}>
            {loading ? 'Giriş yapılıyor...' : 'Giriş Yap'}
          </Button>
        </form>
        {googleClientId && googleClientId !== 'YOUR_GOOGLE_CLIENT_ID_HERE' && (
          <>
            <Divider sx={{ my: 2 }} />
            <GoogleLoginBtn />
          </>
        )}
        <Typography variant="body2" sx={{ textAlign: 'center', mt: 2.5, color: '#666' }}>
          Hesabınız yok mu? <Typography component={Link} to="/register" sx={{ color: '#dc2626', fontWeight: 600, textDecoration: 'none' }}>Kayıt Ol</Typography>
        </Typography>
      </Card>

      {/* Şifremi Unuttum Dialog */}
      <Dialog open={fpOpen} onClose={closeFp} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 3 } }}>
        <DialogContent sx={{ p: 4 }}>
          <Typography variant="h6" sx={{ fontWeight: 800, mb: 0.5, textAlign: 'center' }}>Şifremi Unuttum</Typography>
          {fpSent ? (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2, mt: 2, textAlign: 'center' }}>
                Şifre sıfırlama linki <strong>{fpEmail}</strong> adresine gönderildi. Lütfen e-postanızı kontrol ediniz.
              </Typography>
              <Button fullWidth variant="contained" onClick={closeFp}
                sx={{ py: 1.3, fontWeight: 700, bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' } }}>
                Tamam
              </Button>
            </>
          ) : (
            <>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 3, textAlign: 'center' }}>
                Kayıtlı e-posta adresinizi giriniz. Şifre sıfırlama linki göndereceğiz.
              </Typography>
              <TextField fullWidth size="small" label="E-posta Adresi" type="email"
                value={fpEmail} onChange={e => setFpEmail(e.target.value)} sx={{ mb: 2 }} />
              <Button fullWidth variant="contained" onClick={handleFpReset} disabled={fpLoading}
                sx={{ py: 1.3, fontWeight: 700, bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' } }}>
                {fpLoading ? 'Gönderiliyor...' : 'Sıfırlama Linki Gönder'}
              </Button>
              <Button fullWidth variant="text" onClick={closeFp} sx={{ mt: 1.5, color: '#888', fontSize: 13 }}>İptal</Button>
            </>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}
