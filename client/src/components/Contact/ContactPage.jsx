import { useState, useEffect } from 'react';
import { Box, Card, Typography, Button, Stack, Table, TableBody, TableRow, TableCell, Avatar, CircularProgress } from '@mui/material';
import PlaceIcon from '@mui/icons-material/Place';
import PhoneIcon from '@mui/icons-material/Phone';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import api from '../../api/api';

const dayNames = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];

export default function ContactPage() {
  const [settings, setSettings] = useState({});
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    api.get('/settings').then(res => { setSettings(res.data); setLoaded(true); }).catch(() => setLoaded(true));
  }, []);

  const s = (key, def = '') => settings[key] || def;

  const address = s('contact_address', 'Uga Burger, inönü mah. Yenişehir/Mersin');
  const phone = s('contact_phone', s('store_phone', '05301257088'));
  const lat = s('contact_lat', '36.807804');
  const lng = s('contact_lng', '34.637124');

  if (!loaded) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;

  return (
    <Box sx={{ maxWidth: 700, mx: 'auto', my: 5, px: 2.5 }}>
      <Card sx={{ p: { xs: 3, md: 5 } }}>
        <Typography variant="h4" sx={{ fontWeight: 800, textAlign: 'center', mb: 4 }}>
          İletişim & Adres
        </Typography>

        <Stack spacing={3}>
          <Stack direction="row" spacing={2} alignItems="flex-start">
            <Avatar sx={{ bgcolor: '#dcfce7', color: '#16a34a', width: 44, height: 44 }}><PlaceIcon /></Avatar>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 15 }}>Adres</Typography>
              <Typography variant="body2" color="text.secondary">{address}</Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={2} alignItems="flex-start">
            <Avatar sx={{ bgcolor: '#dcfce7', color: '#16a34a', width: 44, height: 44 }}><PhoneIcon /></Avatar>
            <Box>
              <Typography sx={{ fontWeight: 700, fontSize: 15 }}>Telefon</Typography>
              <Typography variant="body2" color="text.secondary">{phone}</Typography>
            </Box>
          </Stack>

          <Stack direction="row" spacing={2} alignItems="flex-start">
            <Avatar sx={{ bgcolor: '#f3e8ff', color: '#9333ea', width: 44, height: 44 }}><AccessTimeIcon /></Avatar>
            <Box sx={{ flex: 1 }}>
              <Typography sx={{ fontWeight: 700, fontSize: 15, mb: 1 }}>Çalışma Saatleri</Typography>
              <Table size="small">
                <TableBody>
                  {dayNames.map((day, i) => {
                    const isOpen = s(`hours_${i}_open`, 'true') === 'true';
                    const start = s(`hours_${i}_start`, '10:00');
                    const end = s(`hours_${i}_end`, '22:00');
                    return (
                      <TableRow key={day} sx={{ '& td': { borderBottom: '1px solid #f0f0f0', py: 0.8, px: 0 } }}>
                        <TableCell sx={{ fontSize: 13 }}>{day}</TableCell>
                        <TableCell align="right" sx={{ fontSize: 13, fontWeight: 600, color: isOpen ? 'inherit' : '#dc2626' }}>
                          {isOpen ? `${start} - ${end}` : 'Kapalı'}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </Box>
          </Stack>
        </Stack>

        <Card variant="outlined" sx={{ bgcolor: '#f8fafc', p: 3.5, textAlign: 'center', mt: 4, borderRadius: 3 }}>
          <PlaceIcon sx={{ fontSize: 28, color: '#3b82f6' }} />
          <Typography sx={{ fontWeight: 700, mt: 1 }}>Konum ve Yol Tarifi</Typography>
          <Typography variant="body2" color="text.secondary" sx={{ my: 1 }}>
            Bizi haritada görüntülemek ve yol tarifi almak için aşağıdaki butona tıklayın.
          </Typography>
          <Button variant="contained" endIcon={<OpenInNewIcon />}
            href={`https://maps.google.com/?q=${lat},${lng}`} target="_blank" rel="noopener noreferrer"
            sx={{ bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' }, mt: 1 }}>
            Haritada Aç
          </Button>
        </Card>
      </Card>
    </Box>
  );
}
