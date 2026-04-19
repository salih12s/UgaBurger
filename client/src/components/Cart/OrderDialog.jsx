import { useState, useEffect, useCallback, useRef } from 'react';
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
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import LockIcon from '@mui/icons-material/Lock';
import AddressFormDialog from './AddressFormDialog';

// Haversine mesafe hesaplama (km)
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// PayTR iFrame bileşeni
function PaytrIframe({ token, onSuccess }) {
  const iframeRef = useRef(null);

  useEffect(() => {
    // iframeResizer script yükle
    if (!document.getElementById('paytr-resizer-script')) {
      const script = document.createElement('script');
      script.id = 'paytr-resizer-script';
      script.src = 'https://www.paytr.com/js/iframeResizer.min.js';
      script.onload = () => {
        if (window.iFrameResize && iframeRef.current) {
          window.iFrameResize({}, '#paytriframe');
        }
      };
      document.head.appendChild(script);
    } else if (window.iFrameResize && iframeRef.current) {
      window.iFrameResize({}, '#paytriframe');
    }
  }, [token]);

  return (
    <Box sx={{ p: 0, flex: 1 }}>
      <iframe
        ref={iframeRef}
        src={`https://www.paytr.com/odeme/guvenli/${token}`}
        id="paytriframe"
        frameBorder="0"
        scrolling="no"
        style={{ width: '100%', minHeight: 450, border: 'none' }}
      />
    </Box>
  );
}

export default function OrderDialog({ onClose, products }) {
  const { items, addItem, updateQuantity, clearCart, totalAmount } = useCart();
  const { user, refreshUser } = useAuth();
  const navigate = useNavigate();
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [orderNote, setOrderNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [settings, setSettings] = useState({});
  const [kvkkAccepted, setKvkkAccepted] = useState(false);
  const [successOrder, setSuccessOrder] = useState(null);
  const [userAddresses, setUserAddresses] = useState([]);
  const [selectedAddressIdx, setSelectedAddressIdx] = useState(-1);
  const [newAddress, setNewAddress] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [promoResult, setPromoResult] = useState(null);
  const [promoLoading, setPromoLoading] = useState(false);
  const [showAddressForm, setShowAddressForm] = useState(false);
  const [editingAddress, setEditingAddress] = useState(null);
  const [paytrToken, setPaytrToken] = useState(null);
  const [paytrOrderId, setPaytrOrderId] = useState(null);

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

  // Adres kaydedilince
  const handleAddressSaved = async (addressData) => {
    try {
      const currentAddresses = user?.addresses && Array.isArray(user.addresses) ? [...user.addresses] : [];
      if (editingAddress !== null) {
        currentAddresses[editingAddress] = addressData;
      } else {
        currentAddresses.push(addressData);
      }
      await api.put('/auth/profile', { addresses: currentAddresses });
      if (refreshUser) await refreshUser();
      setUserAddresses(currentAddresses);
      setSelectedAddressIdx(editingAddress !== null ? editingAddress : currentAddresses.length - 1);
      setDeliveryAddress(addressData.address);
      setShowAddressForm(false);
      setEditingAddress(null);
      toast.success('Adres kaydedildi!');
    } catch {
      toast.error('Adres kaydedilemedi');
    }
  };

  const handleAddressSelect = (idx) => {
    const i = parseInt(idx);
    setSelectedAddressIdx(i);
    if (i >= 0 && userAddresses[i]) {
      setDeliveryAddress(userAddresses[i].address);
    } else {
      setDeliveryAddress(newAddress);
    }
  };

  // Bölge bazlı minimum sipariş tutarı
  const getZoneMinOrder = useCallback(() => {
    const zones = settings.delivery_zones ? JSON.parse(settings.delivery_zones) : [];
    if (zones.length === 0) return parseFloat(settings.min_order_amount || 1);
    const addr = selectedAddressIdx >= 0 ? userAddresses[selectedAddressIdx] : null;
    if (!addr?.lat || !addr?.lng || !settings.contact_lat || !settings.contact_lng) {
      return parseFloat(settings.min_order_amount || 1);
    }
    const dist = haversineDistance(addr.lat, addr.lng, parseFloat(settings.contact_lat), parseFloat(settings.contact_lng));
    const sortedZones = [...zones].sort((a, b) => a.radius - b.radius);
    const matched = sortedZones.find(z => dist <= z.radius);
    return matched ? matched.min_order : parseFloat(settings.min_order_amount || 1);
  }, [settings, selectedAddressIdx, userAddresses]);

  const minOrder = getZoneMinOrder();
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


  const handleAddSuggestion = (product) => {
    addItem(product, 1, []);
  };

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) return;
    setPromoLoading(true);
    try {
      const res = await api.post('/orders/validate-promo', { code: promoCode, order_total: totalAmount });
      setPromoResult(res.data);
      toast.success(`İndirim uygulandı: -${res.data.discount_amount.toFixed(2)} TL`);
    } catch (err) {
      setPromoResult(null);
      toast.error(err.response?.data?.error || 'Geçersiz kod');
    } finally { setPromoLoading(false); }
  };

  const removePromo = () => { setPromoResult(null); setPromoCode(''); };

  const finalTotal = promoResult ? promoResult.new_total : totalAmount;

  const handleConfirm = async () => {
    if (!user) { toast.error('Sipariş vermek için giriş yapınız'); navigate('/login'); return; }
    const addr = selectedAddressIdx === -1 ? newAddress : deliveryAddress;
    if (!addr.trim()) { toast.error('Teslimat adresini giriniz'); return; }
    if (!kvkkAccepted) { toast.error('Sözleşmeleri kabul etmelisiniz'); return; }
    setLoading(true);
    try {
      const orderItems = items.map(item => ({
        product_id: item.product.id, quantity: item.quantity,
        extras: item.selectedExtras.map(e => ({ id: e.id, name: e.name, price: e.price, quantity: e.quantity || 1 })),
      }));
      const selectedAddr = selectedAddressIdx >= 0 ? userAddresses[selectedAddressIdx] : null;
      // 1) Sipariş oluştur
      const orderRes = await api.post('/orders', {
        items: orderItems, order_type: 'online',
        delivery_address: addr,
        address_lat: selectedAddr?.lat || null,
        address_lng: selectedAddr?.lng || null,
        order_note: orderNote, payment_method: 'online',
        promo_code: promoResult ? promoResult.code : null,
      });
      const orderId = orderRes.data.id || orderRes.data.order?.id;
      setPaytrOrderId(orderId);
      // 2) PayTR token al
      const tokenRes = await api.post('/paytr/token', { order_id: orderId });
      setPaytrToken(tokenRes.data.token);
    } catch (err) { toast.error(err.response?.data?.error || 'Sipariş hatası'); }
    finally { setLoading(false); }
  };

  // PayTR iFrame ödeme ekranı
  if (paytrToken) {
    return (
      <Dialog open onClose={() => { setPaytrToken(null); }} maxWidth="sm" fullWidth
        PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden', minHeight: 500 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, borderBottom: '1px solid #eee' }}>
          <Stack direction="row" alignItems="center" spacing={1}>
            <LockIcon sx={{ color: '#16a34a', fontSize: 20 }} />
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Güvenli Ödeme</Typography>
          </Stack>
          <IconButton size="small" onClick={() => { setPaytrToken(null); }}><CloseIcon /></IconButton>
        </Box>
        <PaytrIframe token={paytrToken} onSuccess={() => { clearCart(); setPaytrToken(null); setSuccessOrder({ id: paytrOrderId }); }} />
      </Dialog>
    );
  }

  // Adres formu diyaloğu (sipariş ekranından yeni adres ekleme)
  if (showAddressForm) {
    return (
      <AddressFormDialog
        open={true}
        onClose={() => setShowAddressForm(false)}
        onSave={handleAddressSaved}
        editAddress={editingAddress !== null ? userAddresses[editingAddress] : null}
      />
    );
  }

  // Başarı ekranı
  if (successOrder) {
    const orderId = successOrder.id || successOrder.order?.id;
    return (
      <Dialog open onClose={onClose} maxWidth="xs" fullWidth
        PaperProps={{ sx: { borderRadius: 5, overflow: 'hidden', p: 0 } }}>
        {/* Üst yeşil alan */}
        <Box sx={{ bgcolor: '#16a34a', pt: 5, pb: 6, textAlign: 'center', position: 'relative' }}>
          <Box sx={{
            width: 80, height: 80, borderRadius: '50%', bgcolor: '#fff',
            display: 'flex', alignItems: 'center', justifyContent: 'center', mx: 'auto', mb: 2,
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
          }}>
            <CheckCircleIcon sx={{ fontSize: 56, color: '#16a34a' }} />
          </Box>
          <Typography variant="h5" sx={{ fontWeight: 800, color: '#fff', mb: 0.5 }}>Siparişiniz Alındı!</Typography>
          <Typography variant="body2" sx={{ color: 'rgba(255,255,255,0.85)' }}>
            En kısa sürede hazırlanacaktır
          </Typography>
          {/* Alt dalga */}
          <Box sx={{ position: 'absolute', bottom: -1, left: 0, right: 0, height: 30, bgcolor: '#fff', borderRadius: '50% 50% 0 0' }} />
        </Box>
        {/* Alt beyaz alan */}
        <Box sx={{ px: 4, pb: 4, pt: 1, textAlign: 'center' }}>
          <Box sx={{ bgcolor: '#f0fdf4', borderRadius: 4, p: 2.5, mb: 3, border: '2px dashed #bbf7d0' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 500, letterSpacing: 1, textTransform: 'uppercase' }}>
              Sipariş Numaranız
            </Typography>
            <Typography variant="h3" sx={{ fontWeight: 900, color: '#16a34a', mt: 0.5 }}>#{orderId}</Typography>
          </Box>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
            Siparişinizi <strong>Profil</strong> sayfasından takip edebilirsiniz.
          </Typography>
          <Button fullWidth variant="contained" onClick={onClose}
            sx={{ py: 1.5, fontWeight: 700, fontSize: 16, bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' }, borderRadius: 3 }}>
            Tamam
          </Button>
        </Box>
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
                  </RadioGroup>
                </FormControl>
              )}
              <Button
                size="small" variant="outlined" onClick={() => { setEditingAddress(null); setShowAddressForm(true); }}
                sx={{ fontWeight: 600, textTransform: 'none', borderColor: '#3b82f6', color: '#3b82f6', borderRadius: 2 }}
              >
                + Yeni Adres Ekle
              </Button>
            </Box>

            {/* Ödeme Bilgisi */}
            <Box sx={{ mb: 2.5 }}>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1.5 }}>
                <Avatar sx={{ width: 28, height: 28, bgcolor: '#3b82f6', fontSize: 13, fontWeight: 700 }}>2</Avatar>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>Ödeme</Typography>
                <LockIcon sx={{ fontSize: 18, color: '#16a34a' }} />
              </Stack>
              <Box sx={{ p: 2, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0' }}>
                <Typography variant="body2" sx={{ fontWeight: 600, color: '#16a34a', mb: 0.5 }}>
                  🔒 Güvenli Ödeme — PayTR
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Siparişi onayladığınızda güvenli ödeme sayfasına yönlendirileceksiniz.
                  Kart bilgileriniz PayTR altyapısı ile güvenle işlenir.
                </Typography>
              </Box>
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
                  {item.selectedExtras.length > 0 && <Typography variant="caption" sx={{ color: '#8b5cf6' }}>+ {item.selectedExtras.map(e => `${(e.quantity || 1) > 1 ? (e.quantity || 1) + 'x ' : ''}${e.name}`).join(', ')}</Typography>}
                  <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 0.5 }}>
                    <IconButton size="small" onClick={() => updateQuantity(idx, item.quantity - 1)} sx={{ border: 1, borderColor: '#ddd', width: 24, height: 24 }}><RemoveIcon sx={{ fontSize: 14 }} /></IconButton>
                    <Typography variant="body2" sx={{ fontWeight: 700 }}>{item.quantity}</Typography>
                    <IconButton size="small" onClick={() => updateQuantity(idx, item.quantity + 1)} sx={{ border: 1, borderColor: '#ddd', width: 24, height: 24 }}><AddIcon sx={{ fontSize: 14 }} /></IconButton>
                  </Stack>
                </Box>
                <Typography variant="body2" sx={{ fontWeight: 700, whiteSpace: 'nowrap' }}>{((parseFloat(item.product.price) + item.selectedExtras.reduce((s, e) => s + parseFloat(e.price) * (e.quantity || 1), 0)) * item.quantity).toFixed(2)} TL</Typography>
              </Stack>
            ))}
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography variant="caption" sx={{ color: canOrder ? '#16a34a' : '#dc2626', fontWeight: 600, mr: 1 }}>Min. Sipariş Tutarı</Typography>
              <Typography variant="caption" sx={{ fontWeight: 600, color: canOrder ? 'inherit' : '#dc2626' }}>{minOrder.toFixed(2)} TL</Typography>
            </Stack>
            <LinearProgress variant="determinate" value={progress} sx={{ height: 4, borderRadius: 2, mb: 2, bgcolor: '#e5e7eb', '& .MuiLinearProgress-bar': { bgcolor: canOrder ? '#16a34a' : '#dc2626' } }} />

            {/* Promosyon Kodu */}
            <Box sx={{ mb: 1.5 }}>
              {promoResult ? (
                <Stack direction="row" alignItems="center" sx={{ p: 1.2, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0' }}>
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="caption" sx={{ fontWeight: 700, color: '#16a34a' }}>🎟️ {promoResult.code}</Typography>
                    <Typography variant="caption" display="block" color="text.secondary">
                      {promoResult.discount_type === 'percentage' ? `%${promoResult.discount_value} indirim` : `${promoResult.discount_value.toFixed(2)} TL indirim`}
                      {' → '}-{promoResult.discount_amount.toFixed(2)} TL
                    </Typography>
                  </Box>
                  <Button size="small" color="error" onClick={removePromo} sx={{ minWidth: 'auto', fontSize: 11 }}>Kaldır</Button>
                </Stack>
              ) : (
                <Stack direction="row" spacing={1}>
                  <TextField size="small" placeholder="Promosyon kodu" value={promoCode} onChange={e => setPromoCode(e.target.value.toUpperCase())} sx={{ flex: 1 }} inputProps={{ style: { fontSize: 13 } }} />
                  <Button variant="outlined" size="small" onClick={handleApplyPromo} disabled={promoLoading || !promoCode.trim()}
                    sx={{ fontWeight: 700, fontSize: 12, whiteSpace: 'nowrap' }}>
                    {promoLoading ? '...' : 'Uygula'}
                  </Button>
                </Stack>
              )}
            </Box>

            <Divider sx={{ my: 1.5 }} />
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
              <Typography variant="body2" sx={{ mr: 1 }}>Ara Toplam: </Typography>
              <Typography variant="body2">{totalAmount.toFixed(2)} TL</Typography>
            </Stack>
            {promoResult && (
              <Stack direction="row" justifyContent="space-between" sx={{ mb: 0.5 }}>
                <Typography variant="body2" sx={{ mr: 1, color: '#16a34a' }}>İndirim: </Typography>
                <Typography variant="body2" sx={{ color: '#16a34a', fontWeight: 600 }}>-{promoResult.discount_amount.toFixed(2)} TL</Typography>
              </Stack>
            )}
            <Stack direction="row" justifyContent="space-between">
              <Typography variant="h6" sx={{ fontWeight: 800, mr: 1 }}>Toplam</Typography>
              <Typography variant="h6" sx={{ fontWeight: 800 }}>{finalTotal.toFixed(2)} TL</Typography>
            </Stack>
            <FormControlLabel
              control={<Checkbox checked={kvkkAccepted} onChange={e => setKvkkAccepted(e.target.checked)} size="small" sx={{ '&.Mui-checked': { color: '#dc2626' } }} />}
              label={<Typography variant="caption">KVKK Aydınlatma Metni ve Mesafeli Satış Sözleşmesi'ni kabul ediyorum.</Typography>}
              sx={{ mt: 1, mb: 1 }}
            />
            <Button fullWidth variant="contained" onClick={handleConfirm} disabled={loading || !canOrder || !kvkkAccepted}
              endIcon={!loading && <LockIcon />}
              sx={{ mt: 1, py: 1.8, bgcolor: '#16a34a', fontWeight: 700, fontSize: 15, '&:hover': { bgcolor: '#15803d' }, '&:disabled': { bgcolor: '#999' } }}>
              {loading ? 'İşleniyor...' : 'Güvenli Ödemeye Geç'}
            </Button>
          </Box>
        </Box>
      </DialogContent>
    </Dialog>
  );
}
