import { useState, useEffect } from 'react';
import api from '../../api/axios';
import toast from 'react-hot-toast';
import {
  Box, Typography, Card, TextField, Button, Chip, Stack, IconButton,
  FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import RemoveIcon from '@mui/icons-material/Remove';

export default function TableOrders() {
  const [tables, setTables] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [newTableNum, setNewTableNum] = useState('');
  const [activeCategory, setActiveCategory] = useState(null);

  const [selectedTable, setSelectedTable] = useState('');
  const [cartItems, setCartItems] = useState([]);
  const [orderNote, setOrderNote] = useState('');
  const [paymentType, setPaymentType] = useState('cash');

  // Extras dialog
  const [extrasDialog, setExtrasDialog] = useState(null); // product with extras
  const [selectedExtras, setSelectedExtras] = useState([]);

  useEffect(() => {
    fetchTables();
    api.get('/admin/products').then(res => setProducts(res.data));
    api.get('/categories').then(res => setCategories(res.data));
  }, []);

  const fetchTables = () => api.get('/admin/tables').then(res => setTables(res.data));

  const addTable = async () => {
    if (!newTableNum) return;
    try {
      await api.post('/admin/tables', { table_number: parseInt(newTableNum) });
      toast.success('Masa eklendi');
      setNewTableNum('');
      fetchTables();
    } catch (err) { toast.error(err.response?.data?.error || 'Hata'); }
  };

  const deleteTable = async (id) => {
    try {
      await api.delete(`/admin/tables/${id}`);
      toast.success('Masa silindi');
      fetchTables();
    } catch { toast.error('Hata'); }
  };

  const handleProductClick = (product) => {
    if (product.extras && product.extras.length > 0) {
      setExtrasDialog(product);
      setSelectedExtras([]);
    } else {
      addToCart(product, []);
    }
  };

  const toggleExtra = (extra) => {
    setSelectedExtras(prev =>
      prev.find(e => e.id === extra.id)
        ? prev.filter(e => e.id !== extra.id)
        : [...prev, { id: extra.id, name: extra.name, price: extra.price }]
    );
  };

  const confirmExtras = () => {
    if (extrasDialog) {
      addToCart(extrasDialog, selectedExtras);
      setExtrasDialog(null);
      setSelectedExtras([]);
    }
  };

  const addToCart = (product, extras) => {
    const extrasKey = extras.map(e => e.id).sort().join(',');
    setCartItems(prev => {
      const existing = prev.find(i => i.product_id === product.id && i._extrasKey === extrasKey);
      if (existing) return prev.map(i => (i.product_id === product.id && i._extrasKey === extrasKey) ? { ...i, quantity: i.quantity + 1 } : i);
      return [...prev, {
        product_id: product.id, name: product.name, price: product.price,
        quantity: 1, extras, _extrasKey: extrasKey, isFree: false
      }];
    });
  };

  const updateCartQty = (index, qty) => {
    if (qty <= 0) { setCartItems(prev => prev.filter((_, i) => i !== index)); return; }
    setCartItems(prev => prev.map((item, i) => i === index ? { ...item, quantity: qty } : item));
  };

  const toggleFree = (index) => {
    setCartItems(prev => prev.map((item, i) => i === index ? { ...item, isFree: !item.isFree } : item));
  };

  const cartTotal = cartItems.reduce((s, i) => {
    if (i.isFree) return s;
    const extrasTotal = i.extras.reduce((es, e) => es + parseFloat(e.price), 0);
    return s + (parseFloat(i.price) + extrasTotal) * i.quantity;
  }, 0);

  const submitQuickOrder = async () => {
    if (cartItems.length === 0) { toast.error('Ürün seçiniz'); return; }
    try {
      await api.post('/admin/quick-order', {
        items: cartItems.map(i => ({
          product_id: i.product_id, quantity: i.quantity, extras: i.extras,
          unit_price_override: i.isFree ? 0 : undefined
        })),
        table_id: selectedTable ? parseInt(selectedTable) : null,
        order_note: orderNote,
        payment_method: paymentType,
      });
      toast.success('Hızlı sipariş oluşturuldu!');
      setCartItems([]); setOrderNote(''); setSelectedTable(''); setPaymentType('cash');
    } catch (err) { toast.error(err.response?.data?.error || 'Hata'); }
  };

  const filteredProducts = activeCategory ? products.filter(p => p.category_id === activeCategory) : products;

  return (
    <Box sx={{ overflow: 'hidden' }}>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 3 }}>Masa Siparişleri / Hızlı Sipariş</Typography>

      {/* Table Management */}
      <Card sx={{ p: 2.5, mb: 3 }}>
        <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>Masa Yönetimi</Typography>
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <TextField size="small" type="number" placeholder="Masa No" value={newTableNum} onChange={e => setNewTableNum(e.target.value)} sx={{ width: 120 }} />
          <Button variant="contained" startIcon={<AddIcon />} onClick={addTable} sx={{ fontWeight: 600 }}>Ekle</Button>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          {tables.map(t => (
            <Chip key={t.id} label={`Masa ${t.table_number}`} onDelete={() => deleteTable(t.id)} deleteIcon={<DeleteIcon fontSize="small" />} variant="outlined" />
          ))}
        </Stack>
      </Card>

      {/* Quick Order */}
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>Hızlı Sipariş</Typography>
      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 320px' }, gap: 2 }}>
        <Box sx={{ minWidth: 0 }}>
          <Stack direction="row" spacing={1} sx={{ overflowX: 'auto', pb: 1, mb: 2, '&::-webkit-scrollbar': { display: 'none' } }}>
            <Chip label="Tümü" onClick={() => setActiveCategory(null)} variant={activeCategory === null ? 'filled' : 'outlined'}
              sx={{ fontWeight: 500, ...(activeCategory === null && { bgcolor: '#dc2626', color: '#fff' }) }} />
            {categories.map(c => (
              <Chip key={c.id} label={c.name} onClick={() => setActiveCategory(c.id)} variant={activeCategory === c.id ? 'filled' : 'outlined'}
                sx={{ fontWeight: 500, ...(activeCategory === c.id && { bgcolor: '#dc2626', color: '#fff' }) }} />
            ))}
          </Stack>
          <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 1.5 }}>
            {filteredProducts.map(p => (
              <Card key={p.id} onClick={() => handleProductClick(p)} sx={{ p: 1.5, cursor: 'pointer', transition: 'transform 0.1s', '&:hover': { transform: 'scale(1.02)' } }}>
                {p.image_url ? (
                  <Box component="img" src={p.image_url} alt={p.name} sx={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 2, mb: 1 }} />
                ) : (
                  <Box sx={{ width: '100%', height: 100, bgcolor: '#f0f0f0', borderRadius: 2, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, mb: 1 }}>🍔</Box>
                )}
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{p.name}</Typography>
                <Typography variant="body2" sx={{ color: '#dc2626', fontWeight: 700 }}>{parseFloat(p.price).toFixed(2)} TL</Typography>
                {p.extras && p.extras.length > 0 && (
                  <Typography variant="caption" color="text.secondary">+{p.extras.length} ekstra</Typography>
                )}
              </Card>
            ))}
          </Box>
        </Box>

        <Card sx={{ p: 2, alignSelf: 'flex-start', position: 'sticky', top: 16, maxHeight: 'calc(100vh - 32px)', overflowY: 'auto' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>🛒 Sipariş</Typography>
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Masa seçiniz (opsiyonel)</InputLabel>
            <Select value={selectedTable} onChange={e => setSelectedTable(e.target.value)} label="Masa seçiniz (opsiyonel)">
              <MenuItem value="">Seçilmedi</MenuItem>
              {tables.map(t => <MenuItem key={t.id} value={t.id}>Masa {t.table_number}</MenuItem>)}
            </Select>
          </FormControl>

          {cartItems.length === 0 ? (
            <Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2.5 }}>Ürün seçiniz</Typography>
          ) : (
            cartItems.map((item, index) => (
              <Box key={index} sx={{ py: 1, borderBottom: '1px solid #f0f0f0' }}>
                <Stack direction="row" alignItems="center" justifyContent="space-between">
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="body2" sx={{ fontWeight: 600, textDecoration: item.isFree ? 'line-through' : 'none' }}>{item.name}</Typography>
                    {item.extras.length > 0 && (
                      <Typography variant="caption" sx={{ color: '#8b5cf6', display: 'block' }}>
                        + {item.extras.map(e => e.name).join(', ')}
                      </Typography>
                    )}
                    <Typography variant="caption" sx={{ color: item.isFree ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                      {item.isFree ? 'ÜCRETSİZ' : `${((parseFloat(item.price) + item.extras.reduce((s, e) => s + parseFloat(e.price), 0)) * item.quantity).toFixed(2)} TL`}
                    </Typography>
                  </Box>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    <IconButton size="small" onClick={() => updateCartQty(index, item.quantity - 1)} sx={{ border: 1, borderColor: '#ddd', width: 24, height: 24 }}><RemoveIcon sx={{ fontSize: 14 }} /></IconButton>
                    <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{item.quantity}</Typography>
                    <IconButton size="small" onClick={() => updateCartQty(index, item.quantity + 1)} sx={{ border: 1, borderColor: '#ddd', width: 24, height: 24 }}><AddIcon sx={{ fontSize: 14 }} /></IconButton>
                  </Stack>
                </Stack>
                <Button size="small" onClick={() => toggleFree(index)}
                  sx={{ mt: 0.5, fontSize: 10, fontWeight: 700, color: item.isFree ? '#dc2626' : '#16a34a', minWidth: 'auto', p: '2px 6px' }}>
                  {item.isFree ? '💰 Ücretli Yap' : '🎁 Ücretsiz Yap (0 TL)'}
                </Button>
              </Box>
            ))
          )}

          <TextField fullWidth multiline rows={2} size="small" placeholder="Sipariş notu..." value={orderNote} onChange={e => setOrderNote(e.target.value)} sx={{ mt: 1.5 }} />

          <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1.5, mb: 1 }}>Ödeme Yöntemi</Typography>
          <Stack direction="row" spacing={1} sx={{ mb: 1.5 }}>
            <Button fullWidth variant={paymentType === 'cash' ? 'contained' : 'outlined'} onClick={() => setPaymentType('cash')}
              sx={{ fontWeight: 600, ...(paymentType === 'cash' && { bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' } }) }}>
              💵 Nakit
            </Button>
            <Button fullWidth variant={paymentType === 'card' ? 'contained' : 'outlined'} onClick={() => setPaymentType('card')}
              sx={{ fontWeight: 600, ...(paymentType === 'card' && { bgcolor: '#3b82f6', '&:hover': { bgcolor: '#2563eb' } }) }}>
              💳 Kart
            </Button>
          </Stack>

          <Stack direction="row" justifyContent="space-between" sx={{ my: 1 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 16 }}>Toplam</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: 16 }}>{cartTotal.toFixed(2)} TL</Typography>
          </Stack>

          <Button fullWidth variant="contained" color="success" onClick={submitQuickOrder} sx={{ py: 1.5, fontWeight: 700, fontSize: 15 }}>
            Siparişi Oluştur
          </Button>
        </Card>
      </Box>

      {/* Extras Dialog */}
      <Dialog open={!!extrasDialog} onClose={() => setExtrasDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{extrasDialog?.name} - Ekstra Seç</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>İstediğiniz ekstraları seçin:</Typography>
          <Stack spacing={1}>
            {extrasDialog?.extras?.filter(e => e.is_available !== false).map(extra => (
              <Chip key={extra.id} label={`${extra.name} (+${parseFloat(extra.price).toFixed(2)} TL)`}
                onClick={() => toggleExtra(extra)}
                variant={selectedExtras.find(e => e.id === extra.id) ? 'filled' : 'outlined'}
                sx={{
                  fontWeight: 600, justifyContent: 'flex-start', height: 40,
                  ...(selectedExtras.find(e => e.id === extra.id) && { bgcolor: '#8b5cf6', color: '#fff' })
                }} />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => { addToCart(extrasDialog, []); setExtrasDialog(null); }} sx={{ fontWeight: 600 }}>Ekstrasız Ekle</Button>
          <Button variant="contained" onClick={confirmExtras} sx={{ fontWeight: 600 }}>
            {selectedExtras.length > 0 ? `Seçilenlerle Ekle (${selectedExtras.length})` : 'Ekle'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
