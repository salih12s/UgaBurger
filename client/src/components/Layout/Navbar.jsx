import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  AppBar, Toolbar, Typography, Button, IconButton, Box, Drawer, List, ListItemButton, ListItemText, Divider
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import CloseIcon from '@mui/icons-material/Close';

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate('/');
    setDrawerOpen(false);
  };

  return (
    <AppBar position="sticky" sx={{ bgcolor: '#fff', borderBottom: '3px solid #dc2626', boxShadow: 'none' }}>
      <Toolbar sx={{ justifyContent: 'space-between' }}>
        <Typography
          component={Link} to="/"
          sx={{ display: 'flex', alignItems: 'center', gap: 1, fontWeight: 800, fontSize: 18, color: '#dc2626', textTransform: 'uppercase', textDecoration: 'none' }}
        >
          <span style={{ fontSize: 22 }}>🍔</span> UGA BURGER
        </Typography>

        {/* Desktop */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 2.5 }}>
          <Button component={Link} to="/menu" sx={{ color: '#333', fontWeight: 500, fontSize: 14 }}>Menü</Button>
          {user ? (
            <>
              {user.role === 'admin' && (
                <Button component={Link} to="/admin" sx={{ color: '#333', fontWeight: 500, fontSize: 14 }}>Admin Panel</Button>
              )}
              <Button component={Link} to="/profile" sx={{ color: '#333', fontWeight: 500, fontSize: 14 }}>Hesabım</Button>
              <Button onClick={handleLogout} sx={{ color: '#333', fontWeight: 500, fontSize: 14 }}>
                Çıkış ({user.first_name})
              </Button>
            </>
          ) : (
            <>
              <Button component={Link} to="/login" sx={{ color: '#333', fontWeight: 500, fontSize: 14 }}>Giriş</Button>
              <Button component={Link} to="/register" variant="contained" color="primary"
                sx={{ borderRadius: 20, px: 2.5, py: 0.8, fontSize: 13 }}>
                Kayıt Ol
              </Button>
            </>
          )}
        </Box>

        {/* Mobile hamburger */}
        <IconButton sx={{ display: { md: 'none' }, color: '#333' }} onClick={() => setDrawerOpen(true)}>
          <MenuIcon />
        </IconButton>
      </Toolbar>

      {/* Mobile Drawer */}
      <Drawer anchor="right" open={drawerOpen} onClose={() => setDrawerOpen(false)}>
        <Box sx={{ width: 260, p: 2 }}>
          <IconButton onClick={() => setDrawerOpen(false)} sx={{ mb: 1 }}><CloseIcon /></IconButton>
          <Divider sx={{ mb: 1 }} />
          <List>
            <ListItemButton component={Link} to="/menu" onClick={() => setDrawerOpen(false)}>
              <ListItemText primary="Menü" />
            </ListItemButton>
            {user ? (
              <>
                {user.role === 'admin' && (
                  <ListItemButton component={Link} to="/admin" onClick={() => setDrawerOpen(false)}>
                    <ListItemText primary="Admin Panel" />
                  </ListItemButton>
                )}
                <ListItemButton component={Link} to="/profile" onClick={() => setDrawerOpen(false)}>
                  <ListItemText primary="Hesabım" />
                </ListItemButton>
                <ListItemButton onClick={handleLogout}>
                  <ListItemText primary={`Çıkış (${user.first_name})`} />
                </ListItemButton>
              </>
            ) : (
              <>
                <ListItemButton component={Link} to="/login" onClick={() => setDrawerOpen(false)}>
                  <ListItemText primary="Giriş" />
                </ListItemButton>
                <ListItemButton component={Link} to="/register" onClick={() => setDrawerOpen(false)}>
                  <ListItemText primary="Kayıt Ol" />
                </ListItemButton>
              </>
            )}
          </List>
        </Box>
      </Drawer>
    </AppBar>
  );
}
