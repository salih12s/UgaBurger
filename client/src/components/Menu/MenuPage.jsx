import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/api';
import ProductCard from './ProductCard';
import ProductModal from './ProductModal';
import OrderDialog from '../Cart/OrderDialog';
import AddressFormDialog from '../Cart/AddressFormDialog';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { Box, Button, Chip, Stack, Typography, Fab, Badge } from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';

export default function MenuPage() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showOrder, setShowOrder] = useState(false);
  const [showAddressFirst, setShowAddressFirst] = useState(false);
  const [settings, setSettings] = useState({});
  const [settingsLoaded, setSettingsLoaded] = useState(false);
  const { totalItems, totalAmount } = useCart();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/categories').then(res => setCategories(res.data));
    api.get('/products').then(res => setProducts(res.data));
    api.get('/settings').then(res => { setSettings(res.data); setSettingsLoaded(true); });
  }, []);

  const filteredProducts = activeCategory
    ? products.filter(p => p.category_id === activeCategory)
    : products;

  // Otomatik mesai kontrolü
  const isWithinWorkingHours = () => {
    if (!settingsLoaded) return true;
    const now = new Date();
    const dayIndex = (now.getDay() + 6) % 7; // JS: 0=Pazar → 6, biz: 0=Pazartesi
    const isOpen = settings[`hours_${dayIndex}_open`];
    // Ayar kayıtlı değilse varsayılan olarak açık kabul et
    if (isOpen === 'false') return false;
    const start = settings[`hours_${dayIndex}_start`] || '10:00';
    const end = settings[`hours_${dayIndex}_end`] || '22:00';
    const nowMin = now.getHours() * 60 + now.getMinutes();
    const [sh, sm] = start.split(':').map(Number);
    const [eh, em] = end.split(':').map(Number);
    return nowMin >= sh * 60 + sm && nowMin < eh * 60 + em;
  };

  // online_order_active ayarı yoksa varsayılan true kabul et
  const isOnlineActive = (settings.online_order_active !== 'false') && isWithinWorkingHours();

  const handleCartClick = () => {
    if (!user) { navigate('/login'); return; }
    const hasAddress = user.addresses && Array.isArray(user.addresses) && user.addresses.length > 0;
    if (!hasAddress) {
      setShowAddressFirst(true);
    } else {
      setShowOrder(true);
    }
  };

  const handleAddressSaved = async (addressData) => {
    try {
      const current = user?.addresses && Array.isArray(user.addresses) ? [...user.addresses] : [];
      current.push(addressData);
      await api.put('/auth/profile', { addresses: current });
      if (refreshUser) await refreshUser();
      setShowAddressFirst(false);
      setShowOrder(true);
    } catch { /* toast handled in dialog */ }
  };

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2.5 }}>
      {settingsLoaded && !isOnlineActive && (
        <Box sx={{
          mb: 3,
          p: 2,
          borderRadius: 3,
          bgcolor: settings.closed_banner_color || '#3b82f6',
          color: '#fff',
        }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            alignItems={{ xs: 'stretch', sm: 'center' }}
            justifyContent="space-between"
          >
            <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ flex: 1, minWidth: 0 }}>
              <Typography sx={{ fontSize: 20, lineHeight: 1.4 }}>{settings.closed_banner_icon || '🔴'}</Typography>
              <Typography variant="body2" sx={{ fontWeight: 500, color: '#fff', wordBreak: 'break-word', flex: 1 }}>
                {settings.closed_message || 'Şuanda online sipariş hizmeti verilmemektedir.'}
              </Typography>
            </Stack>
            <Button
              size="small"
              variant="outlined"
              onClick={() => navigate('/contact')}
              sx={{
                borderRadius: 20,
                whiteSpace: 'nowrap',
                color: '#fff',
                borderColor: 'rgba(255,255,255,0.7)',
                alignSelf: { xs: 'flex-start', sm: 'center' },
                '&:hover': { borderColor: '#fff', bgcolor: 'rgba(255,255,255,0.1)' },
              }}
            >
              İletişim & Detay ›
            </Button>
          </Stack>
        </Box>
      )}

      <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1, mb: 3, '&::-webkit-scrollbar': { display: 'none' } }}>
        <Chip label="Tümü" onClick={() => setActiveCategory(null)}
          variant={activeCategory === null ? 'filled' : 'outlined'}
          sx={{ fontWeight: 500, ...(activeCategory === null && { bgcolor: '#dc2626', color: '#fff' }) }} />
        {categories.map(cat => (
          <Chip key={cat.id} label={cat.name} onClick={() => setActiveCategory(cat.id)}
            variant={activeCategory === cat.id ? 'filled' : 'outlined'}
            sx={{ fontWeight: 500, ...(activeCategory === cat.id && { bgcolor: '#dc2626', color: '#fff' }) }} />
        ))}
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }, gap: 2.5 }}>
        {filteredProducts.map(product => (
          <ProductCard key={product.id} product={product} onClick={() => setSelectedProduct(product)} disabled={!isOnlineActive} />
        ))}
      </Box>

      {selectedProduct && (
        <ProductModal product={selectedProduct} onClose={() => setSelectedProduct(null)} />
      )}

      {totalItems > 0 && isOnlineActive && (
        <Fab variant="extended" onClick={handleCartClick}
          sx={{ position: 'fixed', bottom: 24, right: 24, bgcolor: '#dc2626', color: '#fff',
            fontWeight: 700, fontSize: 15, px: 3, '&:hover': { bgcolor: '#b91c1c' },
            boxShadow: '0 4px 20px rgba(220,38,38,0.4)', zIndex: 90 }}>
          <ShoppingCartIcon sx={{ mr: 1 }} />
          Sepet ({totalAmount.toFixed(2)} TL)
          <Badge badgeContent={totalItems} sx={{ ml: 1.5, '& .MuiBadge-badge': { bgcolor: '#fff', color: '#dc2626', fontWeight: 800 } }}>
            <Box />
          </Badge>
        </Fab>
      )}

      {showAddressFirst && (
        <AddressFormDialog
          open={true}
          onClose={() => setShowAddressFirst(false)}
          onSave={handleAddressSaved}
          editAddress={null}
        />
      )}

      {showOrder && isOnlineActive && <OrderDialog onClose={() => setShowOrder(false)} products={products} />}
    </Box>
  );
}
