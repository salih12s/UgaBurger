import { useState, useEffect } from 'react';
import { Box, Typography, Stack, Dialog, DialogTitle, DialogContent, DialogActions, Button } from '@mui/material';
import api from '../../api/api';

export default function Footer() {
  const [siteName, setSiteName] = useState('Uga Burger');
  const [settings, setSettings] = useState({});
  const [legalDialog, setLegalDialog] = useState(null);

  useEffect(() => {
    api.get('/settings').then(r => {
      setSettings(r.data);
      if (r.data.site_name) setSiteName(r.data.site_name);
    }).catch(() => {});
  }, []);

  const legalItems = [
    { key: 'kvkk_text', label: 'KVKK Aydınlatma Metni' },
    { key: 'privacy_text', label: 'Gizlilik Politikası' },
    { key: 'sales_agreement', label: 'Mesafeli Satış Sözleşmesi' },
  ];

  return (
    <>
      <Box component="footer" sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 1.5, py: 2.5, px: 2, color: '#888', fontSize: 13, bgcolor: '#fff', borderTop: '1px solid #eee', mt: 5, textAlign: 'center' }}>
        <Stack direction="row" spacing={2} sx={{ flexWrap: 'wrap', justifyContent: 'center', rowGap: 1, columnGap: 2 }}>
          {legalItems.map(item => (
            settings[item.key] && (
              <Typography key={item.key} variant="caption" onClick={() => setLegalDialog(item)}
                sx={{ cursor: 'pointer', color: '#3b82f6', textAlign: 'center', '&:hover': { textDecoration: 'underline' } }}>
                {item.label}
              </Typography>
            )
          ))}
        </Stack>
        <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center' }}>
          © {new Date().getFullYear()} {siteName} - Tüm hakları saklıdır.
        </Typography>
      </Box>

      <Dialog open={!!legalDialog} onClose={() => setLegalDialog(null)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{legalDialog?.label}</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-line', mt: 1 }}>
            {legalDialog ? settings[legalDialog.key] : ''}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setLegalDialog(null)} variant="contained" sx={{ fontWeight: 600 }}>Kapat</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}
