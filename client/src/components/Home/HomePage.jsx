import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Typography, Button, Stack } from '@mui/material';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import PlaceIcon from '@mui/icons-material/Place';
import GoogleIcon from '@mui/icons-material/Google';
import api, { getImageUrl } from '../../api/api';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { useGoogleLogin } from '@react-oauth/google';

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

function GoogleHomeBtn() {
  const { googleAuth } = useAuth();
  const navigate = useNavigate();
  const handleGoogle = useGoogleLogin({
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
    <Button onClick={() => handleGoogle()} variant="contained" startIcon={<GoogleIcon />}
      sx={{ bgcolor: '#fff', color: '#333', borderRadius: 30, px: 4, py: 1.5, fontWeight: 600, fontSize: 15, mb: 2.5, boxShadow: '0 2px 12px rgba(0,0,0,0.2)', '&:hover': { bgcolor: '#f5f5f5' } }}>
      Google ile Hızlı Giriş
    </Button>
  );
}

export default function HomePage() {
  const navigate = useNavigate();
  // localStorage cache: ilk render'da en son bilinen ayarları kullan -> placeholder/eski resim flicker'ını önler
  const [settings, setSettings] = useState(() => {
    try { return JSON.parse(localStorage.getItem('siteSettingsCache') || '{}'); } catch { return {}; }
  });
  const [settingsLoaded, setSettingsLoaded] = useState(() => {
    try { return !!localStorage.getItem('siteSettingsCache'); } catch { return false; }
  });

  useEffect(() => {
    // Cache-bust ile ayarları her zaman taze getir (admin değişikliklerinin anında yansıması için)
    api.get(`/settings?t=${Date.now()}`).then(r => {
      setSettings(r.data);
      setSettingsLoaded(true);
      try { localStorage.setItem('siteSettingsCache', JSON.stringify(r.data)); } catch {}
    }).catch(() => {});
  }, []);

  const heroTitle = settings.hero_title || 'Taş Devrinden Gelen Lezzet';
  // Sadece ayarlar yüklendiyse hero resmini göster; yoksa düz koyu zemin (eski/varsayılan resim flicker'ı yok)
  const heroImage = settingsLoaded ? getImageUrl(settings.hero_image || '/images/smash_burger.jpg.jpeg') : null;
  const heroOverlay = parseInt(settings.hero_overlay || '60') / 100;
  const heroTextColor = settings.hero_text_color || '#fff';
  const textSizeMap = { small: { xs: 24, sm: 32, md: 38 }, medium: { xs: 30, sm: 40, md: 48 }, large: { xs: 36, sm: 48, md: 60 } };
  const heroTextSize = textSizeMap[settings.hero_text_size] || textSizeMap.medium;

  return (
    <Box sx={{
      position: 'relative', width: '100%', height: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      backgroundColor: '#1a0a0a',
      backgroundImage: heroImage ? `url(${heroImage})` : 'none',
      backgroundSize: 'cover', backgroundPosition: 'center',
    }}>
      <Box sx={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, rgba(0,0,0,${Math.min(heroOverlay + 0.1, 1).toFixed(2)}) 0%, rgba(0,0,0,${(heroOverlay * 0.3).toFixed(2)}) 50%, rgba(0,0,0,${(heroOverlay * 0.5).toFixed(2)}) 100%)` }} />
      <Box sx={{ position: 'relative', zIndex: 2, textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <Typography variant="h1" sx={{
          fontSize: heroTextSize, fontWeight: 900, color: heroTextColor,
          textShadow: '2px 4px 24px rgba(0,0,0,0.7)', mb: 4, fontStyle: 'italic',
        }}>
          {heroTitle}
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 2, sm: 3 }} justifyContent="center" alignItems="center" sx={{ mb: 3 }}>
          <Button onClick={() => navigate('/menu')} variant="contained" startIcon={<ShoppingBagIcon />}
            sx={{ bgcolor: '#f97316', borderRadius: 30, px: { xs: 4, md: 6 }, py: { xs: 1.8, md: 2.2 }, fontSize: { xs: 15, md: 17 }, fontWeight: 700, letterSpacing: 0.3, boxShadow: '0 4px 16px rgba(249,115,22,0.4)', '&:hover': { bgcolor: '#ea580c', transform: 'scale(1.03)' }, transition: 'all 0.2s' }}>
            Menü ve Siparişler
          </Button>
          <Button onClick={() => navigate('/contact')} variant="contained" startIcon={<PlaceIcon />}
            sx={{ bgcolor: '#3b82f6', borderRadius: 30, px: { xs: 4, md: 6 }, py: { xs: 1.8, md: 2.2 }, fontSize: { xs: 15, md: 17 }, fontWeight: 700, letterSpacing: 0.3, boxShadow: '0 4px 16px rgba(59,130,246,0.4)', '&:hover': { bgcolor: '#2563eb', transform: 'scale(1.03)' }, transition: 'all 0.2s' }}>
            Adres & İletişim
          </Button>
        </Stack>

        {googleClientId && googleClientId !== 'YOUR_GOOGLE_CLIENT_ID_HERE' && <GoogleHomeBtn />}

        <Stack direction="row" spacing={1.5} justifyContent="center" alignItems="center">
          <Button component={Link} to="/login" variant="contained"
            sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: 30, px: 3.5, py: 1, fontSize: 14, fontWeight: 700, backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)', textTransform: 'none', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}>
            Giriş Yap
          </Button>
          <Button component={Link} to="/register" variant="contained"
            sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: '#fff', borderRadius: 30, px: 3.5, py: 1, fontSize: 14, fontWeight: 700, backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.3)', textTransform: 'none', '&:hover': { bgcolor: 'rgba(255,255,255,0.25)' } }}>
            Kayıt Ol
          </Button>
        </Stack>
      </Box>
    </Box>
  );
}
