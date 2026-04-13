import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import ProductCard from './ProductCard';
import ProductModal from './ProductModal';
import OrderDialog from '../Cart/OrderDialog';
import { useCart } from '../../context/CartContext';
import { Box, Button, Chip, Stack, Typography, Fab, Badge, Alert } from '@mui/material';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';

export default function MenuPage() {
  const [categories, setCategories] = useState([]);
  const [products, setProducts] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [showOrder, setShowOrder] = useState(false);
  const [settings, setSettings] = useState({});
  const { totalItems, totalAmount } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    api.get('/categories').then(res => setCategories(res.data));
    api.get('/products').then(res => setProducts(res.data));
    api.get('/settings').then(res => setSettings(res.data));
  }, []);

  const filteredProducts = activeCategory
    ? products.filter(p => p.category_id === activeCategory)
    : products;

  const isOnlineActive = settings.online_order_active === 'true';

  return (
    <Box sx={{ maxWidth: 1200, mx: 'auto', p: 2.5 }}>
      {!isOnlineActive && (
        <Alert severity="info" variant="filled"
          action={<Button color="inherit" size="small" variant="outlined" onClick={() => navigate('/contact')} sx={{ borderRadius: 20, whiteSpace: 'nowrap' }}>İletişim & Detay ›</Button>}
          sx={{ mb: 3, borderRadius: 3, bgcolor: '#3b82f6', '& .MuiAlert-icon': { color: '#fff' } }}>
          🔴 Mesai Dışı — Şu anda online sipariş alınmamaktadır. Telefon Siparişi İçin: {settings.store_phone || '05301257088'}
        </Alert>
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
        <Fab variant="extended" onClick={() => setShowOrder(true)}
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

      {showOrder && isOnlineActive && <OrderDialog onClose={() => setShowOrder(false)} products={products} />}
    </Box>
  );
}
