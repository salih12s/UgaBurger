import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Box, Typography, Button, Stack } from '@mui/material';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import PlaceIcon from '@mui/icons-material/Place';
import GoogleIcon from '@mui/icons-material/Google';
import api, { getImageUrl } from '../../api/api';

export default function HomePage() {
  const navigate = useNavigate();
  const [settings, setSettings] = useState({});

  useEffect(() => {
    api.get('/settings').then(r => setSettings(r.data)).catch(() => {});
  }, []);

  const heroTitle = settings.hero_title || 'Taş Devrinden Gelen Lezzet';
  const heroImage = getImageUrl(settings.hero_image || '/images/smash_burger.jpg.jpeg');
  const heroOverlay = parseInt(settings.hero_overlay || '60') / 100;
  const heroTextColor = settings.hero_text_color || '#fff';
  const textSizeMap = { small: { xs: 24, sm: 32, md: 38 }, medium: { xs: 30, sm: 40, md: 48 }, large: { xs: 36, sm: 48, md: 60 } };
  const heroTextSize = textSizeMap[settings.hero_text_size] || textSizeMap.medium;

  return (
    <Box sx={{
      position: 'relative', width: '100%', height: '100vh',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
      backgroundImage: `url(${heroImage})`, backgroundSize: 'cover', backgroundPosition: 'center',
      pb: { xs: 8, md: 28 },
    }}>
      <Box sx={{ position: 'absolute', inset: 0, background: `linear-gradient(to top, rgba(0,0,0,${Math.min(heroOverlay + 0.1, 1).toFixed(2)}) 0%, rgba(0,0,0,${(heroOverlay * 0.3).toFixed(2)}) 50%, rgba(0,0,0,${(heroOverlay * 0.5).toFixed(2)}) 100%)` }} />
      <Box sx={{ position: 'relative', zIndex: 2, textAlign: 'center' }}>
        <Typography variant="h1" sx={{
          fontSize: heroTextSize, fontWeight: 900, color: heroTextColor,
          textShadow: '2px 4px 24px rgba(0,0,0,0.7)', mb: 4, fontStyle: 'italic',
        }}>
          {heroTitle}
        </Typography>

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 2, sm: 8  }} justifyContent="center" sx={{ mb: 3 , ml: { xs: 0, md: 6}}}>
          <Button onClick={() => navigate('/menu')} variant="contained" startIcon={<ShoppingBagIcon />}
            sx={{ bgcolor: '#f97316', borderRadius: 30, px: { xs: 4, md: 6 }, py: { xs: 1.8, md: 2.2 }, fontSize: { xs: 15, md: 17 }, fontWeight: 700, letterSpacing: 0.3, boxShadow: '0 4px 16px rgba(249,115,22,0.4)', '&:hover': { bgcolor: '#ea580c', transform: 'scale(1.03)' }, transition: 'all 0.2s' }}>
            Menü ve Siparişler
          </Button>
          <Button onClick={() => navigate('/contact')} variant="contained" startIcon={<PlaceIcon />}
            sx={{ bgcolor: '#3b82f6', borderRadius: 30, px: { xs: 4, md: 6 }, py: { xs: 1.8, md: 2.2 }, fontSize: { xs: 15, md: 17 }, fontWeight: 700, letterSpacing: 0.3, boxShadow: '0 4px 16px rgba(59,130,246,0.4)', '&:hover': { bgcolor: '#2563eb', transform: 'scale(1.03)' }, transition: 'all 0.2s' }}>
            Adres & İletişim
          </Button>
        </Stack>

        <Button onClick={() => {}} variant="contained" startIcon={<GoogleIcon />}
          sx={{ bgcolor: '#fff', color: '#333', borderRadius: 30, px: 4, py: 1.5, fontWeight: 600, fontSize: 15, mb: 2.5, boxShadow: '0 2px 12px rgba(0,0,0,0.2)', '&:hover': { bgcolor: '#f5f5f5' } }}>
          Google ile Hızlı Giriş
        </Button>

        <Stack direction="row" spacing={2} justifyContent="center" alignItems="center" sx={{ ml: 36 }}>
          <Typography component={Link} to="/login" sx={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3, '&:hover': { color: '#fff' } }}>
            Giriş Yap
          </Typography>
          <Typography sx={{ color: 'rgba(255,255,255,0.4)', fontSize: 14 }}>|</Typography>
          <Typography component={Link} to="/register" sx={{ color: 'rgba(255,255,255,0.85)', fontSize: 14, fontWeight: 700, textDecoration: 'underline', textUnderlineOffset: 3, '&:hover': { color: '#fff' } }}>
            Kayıt Ol
          </Typography>
        </Stack>
      </Box>
    </Box>
  );
}
