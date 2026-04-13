import { useState, useEffect } from 'react';
import { Box, Typography } from '@mui/material';
import { API_URL } from '../../api/axios';

export default function Footer() {
  const [siteName, setSiteName] = useState('Uga Burger');

  useEffect(() => {
    fetch(`${API_URL}/api/settings`).then(r => r.json()).then(s => { if (s.site_name) setSiteName(s.site_name); }).catch(() => {});
  }, []);

  return (
    <Box component="footer" sx={{ textAlign: 'center', py: 2.5, color: '#888', fontSize: 13, bgcolor: '#fff', borderTop: '1px solid #eee', mt: 5 }}>
      <Typography variant="body2" color="text.secondary">
        © {new Date().getFullYear()} {siteName} - Tüm hakları saklıdır.
      </Typography>
    </Box>
  );
}
