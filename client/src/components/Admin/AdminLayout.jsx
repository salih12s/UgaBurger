import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import OrderManagement from './OrderManagement';
import TableOrders from './TableOrders';
import MenuManagement from './MenuManagement';
import Reports from './Reports';
import SettingsPanel from './SettingsPanel';
import UserManagement from './UserManagement';
import {
  Box, Drawer, List, ListItemButton, ListItemIcon, ListItemText, Typography,
  IconButton, useMediaQuery, useTheme
} from '@mui/material';
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag';
import GridViewIcon from '@mui/icons-material/GridView';
import ListAltIcon from '@mui/icons-material/ListAlt';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import PublicIcon from '@mui/icons-material/Public';
import MenuIcon from '@mui/icons-material/Menu';
import PeopleIcon from '@mui/icons-material/People';

const tabs = [
  { id: 'orders', label: 'Siparişler', icon: <ShoppingBagIcon /> },
  { id: 'tables', label: 'Masa / Hızlı Sipariş', icon: <GridViewIcon /> },
  { id: 'menu', label: 'Menü Yönetimi', icon: <ListAltIcon /> },
  { id: 'users', label: 'Üyeler', icon: <PeopleIcon /> },
  { id: 'reports', label: 'Raporlar', icon: <BarChartIcon /> },
  { id: 'settings', label: 'Ayarlar', icon: <SettingsIcon /> },
];

const DRAWER_WIDTH = 260;

export default function AdminLayout() {
  const [activeTab, setActiveTab] = useState('orders');
  const [mobileOpen, setMobileOpen] = useState(false);
  const { logout } = useAuth();
  const navigate = useNavigate();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

  const handleLogout = () => { logout(); navigate('/'); };

  const sidebarContent = (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', bgcolor: '#1e1e2d', color: '#fff' }}>
      <Box sx={{ p: 2.5, display: 'flex', alignItems: 'center', gap: 1.5, borderBottom: '1px solid rgba(255,255,255,0.08)' }}>
        <Typography sx={{ fontSize: 24 }}>🍔</Typography>
        <Typography variant="subtitle1" sx={{ fontWeight: 800, letterSpacing: 1 }}>UGA BURGER</Typography>
      </Box>
      <List sx={{ flex: 1, py: 1 }}>
        {tabs.map(tab => (
          <ListItemButton key={tab.id} selected={activeTab === tab.id}
            onClick={() => { setActiveTab(tab.id); setMobileOpen(false); }}
            sx={{ mx: 1, borderRadius: 2, mb: 0.5, color: 'rgba(255,255,255,0.65)',
              '&.Mui-selected': { bgcolor: 'rgba(220,38,38,0.2)', color: '#fff' },
              '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' } }}>
            <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}>{tab.icon}</ListItemIcon>
            <ListItemText primary={tab.label} primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }} />
          </ListItemButton>
        ))}
      </List>
      <List sx={{ py: 1 }}>
        <ListItemButton onClick={handleLogout} sx={{ mx: 1, borderRadius: 2, color: 'rgba(255,255,255,0.65)', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' } }}>
          <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}><LogoutIcon /></ListItemIcon>
          <ListItemText primary="Çıkış Yap" primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }} />
        </ListItemButton>
        <ListItemButton component={Link} to="/" sx={{ mx: 1, borderRadius: 2, color: 'rgba(255,255,255,0.65)', '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' } }}>
          <ListItemIcon sx={{ color: 'inherit', minWidth: 36 }}><PublicIcon /></ListItemIcon>
          <ListItemText primary="Siteye Dön" primaryTypographyProps={{ fontSize: 14, fontWeight: 500 }} />
        </ListItemButton>
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      {isMobile ? (
        <Drawer open={mobileOpen} onClose={() => setMobileOpen(false)}
          PaperProps={{ sx: { width: DRAWER_WIDTH, bgcolor: '#1e1e2d', border: 'none' } }}>
          {sidebarContent}
        </Drawer>
      ) : (
        <Box sx={{ width: DRAWER_WIDTH, flexShrink: 0 }}>
          <Box sx={{ width: DRAWER_WIDTH, position: 'fixed', top: 0, left: 0, bottom: 0, overflowY: 'auto' }}>
            {sidebarContent}
          </Box>
        </Box>
      )}

      <Box sx={{ flex: 1, bgcolor: '#f5f5f7', p: { xs: 2, md: 3 }, minHeight: '100vh', overflow: 'hidden', minWidth: 0 }}>
        {isMobile && (
          <IconButton onClick={() => setMobileOpen(true)} sx={{ mb: 2, bgcolor: '#fff', boxShadow: 1 }}>
            <MenuIcon />
          </IconButton>
        )}
        {activeTab === 'orders' && <OrderManagement />}
        {activeTab === 'tables' && <TableOrders />}
        {activeTab === 'menu' && <MenuManagement />}
        {activeTab === 'users' && <UserManagement />}
        {activeTab === 'reports' && <Reports />}
        {activeTab === 'settings' && <SettingsPanel />}
      </Box>
    </Box>
  );
}
