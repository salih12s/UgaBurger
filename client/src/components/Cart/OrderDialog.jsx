import { useState, useEffect } from 'react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import api, { getImageUrl } from '../../api/api';
import toast from 'react-hot-toast';
import {
  Dialog, DialogContent, Box, Typography, Button, IconButton, TextField, Stack,
  LinearProgress, Avatar, Divider, Checkbox, FormControlLabel, Radio, RadioGroup, FormControl
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckIcon from '@mui/icons-material/Check';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import CreditCardIcon from '@mui/icons-material/CreditCard';

export default function OrderDialog({ onClose, products }) {
  const { items, addItem, updateQuantity, clearCart, totalAmount } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({});
  const [cardName, setCardName] = useState('');
  const [cardNumber, setCardNumber] = useState('');
  const [cardExpiry, setCardExpiry] = useState('');
  const [cardCvv, setCardCvv] = useState('');
  const [kvkkAccepted, setKvkkAccepted] = useState(false);
  const [successOrder, setSuccessOrder] = useState(null);
  const [userAddresses, setUserAddresses] = useState([]);
  const [selectedAddressIdx, setSelectedAddressIdx] = useState(-1);
  const [newAddress, setNewAddress] = useState('');

  useEffect(() => { api.get('/settings').then(res => setSettings(res.data)); }, []);

  useEffect(() => {
    if (user?.addresses && Array.isArray(user.addresses)) {
      setUserAddresses(user.addresses);
      if (user.addresses.length > 0) {
        setSelectedAddressIdx(0);
        setDeliveryAddress(user.addresses[0].address);
      }
    }
  }, [user]);

  const handleAddressSelect = (idx) => {
    const i = parseInt(idx);
    setSelectedAddressIdx(i);
    if (i >= 0 && userAddresses[i]) {
      setDeliveryAddress(userAddresses[i].address);
    } else {
      setDeliveryAddress(newAddress);
    }
  };

  const minOrder = parseFloat(settings.min_order_amount || 1);
  const canOrder = totalAmount >= minOrder;
  const progress = Math.min(100, (totalAmount / minOrder) * 100);

  const suggestions = (() => {
    if (!products) return [];
    const recIds = settings.recommended_products ? settings.recommended_products.split(',').map(Number).filter(Boolean) : [];
    const inCart = items.map(i => i.product.id);
    const pool = recIds.length > 0
      ? products.filter(p => recIds.includes(p.id) && !inCart.includes(p.id))
      : products.filter(p => p.is_suggested && !inCart.includes(p.id));
    return pool.slice(0, 4);
  })();

  const fmtCard = (v) => { const d = v.replace(/\D/g, '').slice(0, 16); return d.replace(/(.{4})/g, '$1 ').trim(); };
  const fmtExp = (v) => { const d = v.replace(/\D/g, '').slice(0, 4); return d.length >= 3 ? d.slice(0, 2) + '/' + d.slice(2) : d; };
  const cardValid = () => { const n = cardNumber.replace(/\s/g, ''); return cardName.trim().length >= 3 && n.length === 16 && cardExpiry.length === 5 && cardCvv.length >= 3; };

  const handleAddSuggestion = (product) => {
    addItem(product, 1, []);
  };

  const handleConfirm = async () => {
    if (!user) { toast.error('Sipariş vermek için giriş yapınız'); navigate('/login'); return; }
    const addr = selectedAddressIdx === -1 ? newAddress : deliveryAddress;
    if (!addr.trim()) { toast.error('Teslimat adresini giriniz'); return; }
    if (!cardValid()) { toast.error('Kart bilgilerini eksiksiz giriniz'); return; }
    if (!kvkkAccepted) { toast.error('Sözleşmeleri kabul etmelisiniz'); return; }
    setLoading(true);
    try {
      const orderItems = items.map(item => ({
        product_id: item.product.id, quantity: item.quantity,
        extras: item.selectedExtras.map(e => ({ id: e.id, name: e.name, price: e.price })),
      }));
      const last4 = cardNumber.replace(/\s/g, '').slice(-4);
      const res = await api.post('/orders', {
        items: orderItems, order_type: 'online',
        delivery_address: addr,
        order_note: orderNote, payment_method: 'online',
        card_info: { holder: cardName, last4, expiry: cardExpiry },
      });
      setSuccessOrder(res.data);
      clearCart();
    } catch (err) { toast.error(err.response?.data?.error || 'Sipariş hatası'); }
    finally { setLoading(false); }
  };

  // Başarı ekranı
  if (successOrder) {
    return (
      <Dialog open onClose={onClose} maxWidth="xs" fullWidth PaperProps={{ sx: { borderRadius: 4, textAlign: 'center', p: 4 } }}>
        <CheckCircleIcon sx={{ fontSize: 80, color: '#16a34a', mx: 'auto', mb: 2 }} />
        <Typography variant="h5" sx={{ fontWeight: 800, mb: 1 }}>Siparişiniz Alındı!</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Siparişiniz başarıyla oluşturuldu. En kısa sürede hazırlanacaktır.
        </Typography>
        <Box sx={{ bgcolor: '#f0fdf4', borderRadius: 3, p: 2, mb: 3 }}>
          <Typography variant="caption" color="text.secondary">Sipariş Numaranız</Typography>
          <Typography variant="h4" sx={{ fontWeight: 900, color: '#16a34a' }}>#{successOrder.id || successOrder.order?.id}</Typography>
        </Box>
        <Button fullWidth variant="contained" onClick={onClose}
          sx={{ py: 1.5, fontWeight: 700, fontSize: 16, bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' }, borderRadius: 3 }}>
          Tamam
        </Button>
      </Dialog>
    );
  }

  return (
    <Dialog open onClose={onClose} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 4, maxHeight: '90vh' } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', p: 3, pb: 0 }}>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>Siparişi Tamamla</Typography>
          <Typography variant="body2" color="text.secondary">Lezzet yolculuğu başlamak üzere</Typography>
        </Box>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </Box>
      <DialogContent>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          <Box>
            {/* Adres Seçimi */}
            <Box sx={{ mb: 2.5 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Avatar sx={{ width: 28, height: 28, bgcolor: '#3b82f6', fontSize: 13, fontWeight: 700 }}>1</Avatar>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Teslimat Adresi</Typography>
              </Stack>
              {userAddresses.length > 0 && (
                <FormControl fullWidth sx={{ mb: 1 }}>
                  <RadioGroup value={selectedAddressIdx} onChange={e => handleAddressSelect(e.target.value)}>
                    {userAddresses.map((a, i) => (
                      <Box key={i} sx={{ border: 1, borderColor: selectedAddressIdx === i ? '#3b82f6' : '#e5e7eb', borderRadius: 2, p: 1.2, mb: 0.8, cursor: 'pointer', bgcolor: selectedAddressIdx === i ? '#eff6ff' : 'transparent' }}
                        onClick={() => handleAddressSelect(i)}>
                        <Stack direction="row" alignItems="center" spacing={1}>
                          <Radio value={i} size="small" sx={{ p: 0.3, '&.Mui-checked': { color: '#3b82f6' } }} />
                          <Box sx={{ flex: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>{a.title}</Typography>
                            <Typography variant="caption" color="text.secondary">{a.address}</Typography>
                          </Box>
                        </Stack>
                      </Box>
                    ))}
                    <Box sx={{ border: 1, borderColor: selectedAddressIdx === -1 ? '#3b82f6' : '#e5e7eb', borderRadius: 2, p: 1.2, cursor: 'pointer', bgcolor: selectedAddressIdx === -1 ? '#eff6ff' : 'transparent' }}
                      onClick={() => handleAddressSelect(-1)}>
                      <Stack direction="row" alignItems="center" spacing={1}>
                        <Radio value={-1} size="small" sx={{ p: 0.3, '&.Mui-checked': { color: '#3b82f6' } }} />
                        <Typography variant="body2" sx={{ fontWeight: 600, fontSize: 13 }}>+ Farklı adrese gönder</Typography>
                      </Stack>
                    </Box>
                  </RadioGroup>
                </FormControl>
              )}
              {(selectedAddressIdx === -1 || userAddresses.length === 0) && (
                <TextField fullWidth size="small" placeholder="Teslimat adresinizi giriniz..." value={newAddress} onChange={e => { setNewAddress(e.target.value); setDeliveryAddress(e.target.value); }} />
              )}
            </Box>

            {/* Kart Bilgileri */}
            <Box sx={{ mb: 2.5 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Avatar sx={{ width: 28, height: 28, bgcolor: '#3b82f6', fontSize: 13, fontWeight: 700 }}>2</Avatar>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Kart Bilgileri</Typography>
                <CreditCardIcon sx={{ fontSize: 18, color: '#888' }} />
              </Stack>
              <TextField fullWidth size="small" label="Kart Üzerindeki İsim" value={cardName} onChange={e => setCardName(e.target.value)} sx={{ mb: 1.5 }} />
              <TextField fullWidth size="small" label="Kart Numarası" value={cardNumber} onChange={e => setCardNumber(fmtCard(e.target.value))} placeholder="0000 0000 0000 0000" inputProps={{ maxLength: 19 }} sx={{ mb: 1.5 }} />
              <Stack direction="row" spacing={1.5}>
                <TextField size="small" label="Son Kullanma" value={cardExpiry} onChange={e => setCardExpiry(fmtExp(e.target.value))} placeholder="AA/YY" inputProps={{ maxLength: 5 }} sx={{ flex: 1 }} />
                <TextField size="small" label="CVV" value={cardCvv} onChange={e => setCardCvv(e.target.value.replace(/\D/g, '').slice(0, 4))} placeholder="***" inputProps={{ maxLength: 4 }} type="password" sx={{ flex: 1 }} />
              </Stack>
              <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                💳 Ödeme, sipariş onaylandıktan sonra işlenecektir.
              </Typography>
            </Box>

            {/* Sipariş Notu */}
            <Stack direction="row" spacing={1} alignItems="flex-start" sx={{ mb: 2 }}>
              <Typography sx={{ fontSize: 20 }}>📝</Typography>
              <Box sx={{ flex: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 0.5 }}>
                  Sipariş Notu <Typography component="span" variant="caption" color="text.secondary">(İsteğe Bağlı)</Typography>
                </Typography>
                <TextField fullWidth multiline rows={2} size="small" placeholder="Siparişinizle ilgili eklemek istedikleriniz..." value={orderNote} onChange={e => setOrderNote(e.target.value)} />
              </Box>
            </Stack>

            {/* Sizin İçin Seçtik */}
            {suggestions.length > 0 && (
              <Box>
                <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 1, fontSize: 12 }}>✨ SİZİN İÇİN SEÇTİK</Typography>
                {suggestions.map(p => (
                  <Stack key={p.id} direction="row" alignItems="center" spacing={1} sx={{ p: 0.8, border: 1, borderColor: '#eee', borderRadius: 2, mb: 0.5 }}>
                    {p.image_url ? <Box component="img" src={getImageUrl(p.image_url)} alt={p.name} sx={{ width: 32, height: 32, borderRadius: 1.5, objectFit: 'cover' }} /> : <Box sx={{ width: 32, height: 32, borderRadius: 1.5, bgcolor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>🍔</Box>}
                    <Box sx={{ flex: 1, minWidth: 0 }}>
                      <Typography variant="caption" sx={{ fontWeight: 600, display: 'block', lineHeight: 1.2 }}>{p.name}</Typography>
                      <Typography variant="caption" color="text.secondary" sx={{ fontSize: 11 }}>{parseFloat(p.price).toFixed(2)} ₺</Typography>
                    </Box>
                    <IconButton size="small" onClick={() => handleAddSuggestion(p)} sx={{ border: 1.5, borderColor: '#16a34a', color: '#16a34a', width: 28, height: 28 }}><AddIcon sx={{ fontSize: 16 }} /></IconButton>
                  </Stack>
                ))}
              </Box>
            )}
          </Box>

          {/* Sipariş Özeti */}
          <Box>
            <Typography variant="h6" sx={{ fontWeight: 800, mb: 2 }}>Sipariş Özeti</Typography>
            {items.map((item, idx) => (
              <Stack key={idx} direction="row" alignItems="center" spacing={1.5} sx={{ mb: 1.5, pb: 1.5, borderBottom: '1px solid #f0f0f0' }}>
                {item.product.image_url ? <Box component="img" src={getImageUrl(item.product.image_url)} alt={item.product.name} sx={{ width: 56, height: 56, borderRadius: 2, objectFit: 'cover' }} /> : <Box sx={{ width: 56, height: 56, borderRadius: 2, bgcolor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24 }}>🍔</Box>}
                <Box sx={{ flex: 1 }}>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>{item.product.name}</Typography>
                  {item.selectedExtras.length > 0 && <Typography variant="caption" sx={{ color: '#8b5cf6' }}>+ {item.selectedExtras.map(e => e.name).join(', ')}</Typography>}
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
                    <IconButton size="small" onClick={() => updateQuantity(idx, item.quantity - 1)} sx={{ border: 1, borderColor: '#ddd', width: 24, height: 24 }}><RemoveIcon sx={{ fontSize: 14 }} /></IconButton>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.quantity}</Typography>
                    <IconButton size="small" onClick={() => updateQuantity(idx, item.quantity + 1)} sx={{ border: 1, borderColor: '#ddd', width: 24, height: 24 }}><AddIcon sx={{ fontSize: 14 }} /></IconButton>
                  </Stack>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{((parseFloat(item.product.price) + item.selectedExtras.reduce((s, e) => s + parseFloat(e.price), 0)) * item.quantity).toFixed(2)} TL</Typography>
              </Stack>
            ))}
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: canOrder ? '#16a34a' : '#dc2626', fontWeight: 600, mr: 1 }}>Min. Sipariş Tutarı</Typography>
              <Typography variant="caption" sx={{ fontWeight: 600, color: canOrder ? 'inherit' : '#dc2626' }}>{minOrder.toFixed(2)} TL</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={progress} sx={{ height: 4, borderRadius: 2, mb: 2, bgcolor: '#e5e7eb', '& .MuiLinearProgress-bar': { bgcolor: canOrder ? '#16a34a' : '#dc2626' } }} />
            <Divider sx={{ my: 1.5 }} />
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography variant="body2" sx={{ mr: 1 }}>Ara Toplam: </Typography>
              <Typography variant="body2">{totalAmount.toFixed(2)} TL</Typography>
            </Stack>
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="h6" sx={{ fontWeight: 800, mr: 1 }}>Toplam</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>{totalAmount.toFixed(2)} TL</Typography>
            </Stack>
            <FormControlLabel
              control={<Checkbox checked={kvkkAccepted} onChange={e => setKvkkAccepted(e.target.checked)} size="small" sx={{ '&.Mui-checked': { color: '#dc2626' } }} />}
              label={<Typography variant="caption">KVKK Aydınlatma Metni ve Mesafeli Satış Sözleşmesi'ni kabul ediyorum.</Typography>}
              sx={{ mt: 1, mb: 1 }}
            />
            <Button fullWidth variant="contained" onClick={handleConfirm} disabled={loading || !canOrder || !kvkkAccepted}
              endIcon={!loading && <CheckIcon />}
              sx={{ mt: 1, py: 1.8, bgcolor: '#333', fontWeight: 700, fontSize: 15, '&:hover': { bgcolor: '#111' }, '&:disabled': { bgcolor: '#999' } }}>
              {loading ? 'İşleniyor...' : 'Siparişi Onayla'}
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
