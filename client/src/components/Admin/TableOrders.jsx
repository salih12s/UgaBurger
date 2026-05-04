import { useState, useEffect } from 'react';
import api, { getImageUrl } from '../../api/api';
import toast from 'react-hot-toast';
import {
  Box, Typography, Card, TextField, Button, Chip, Stack, IconButton,
  FormControl, InputLabel, Select, MenuItem, Dialog, DialogTitle, DialogContent, DialogActions
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';

export default function TableOrders() {
  const [tables, setTables] = useState([]);
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(null);

  const [selectedTable, setSelectedTable] = useState('');
  const [cartItems, setCartItems] = useState([]);
  const [orderNote, setOrderNote] = useState('');
  const [paymentType, setPaymentType] = useState('cash');
  const [cashSplitAmount, setCashSplitAmount] = useState(''); // Kısmi nakit (split): boşsa tam ödeme
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [customerAddress, setCustomerAddress] = useState('');
  const [settings, setSettings] = useState({});

  // Promosyon kodu
  const [promoCode, setPromoCode] = useState('');
  const [promoResult, setPromoResult] = useState(null); // { code, discount_amount, new_total }
  const [promoLoading, setPromoLoading] = useState(false);

  // Extras dialog
  const [extrasDialog, setExtrasDialog] = useState(null);
  const [selectedExtras, setSelectedExtras] = useState([]);
  // groupId -> [{id,name,price,quantity}]
  const [selectedOptions, setSelectedOptions] = useState({});

  useEffect(() => {
    fetchTables();
    api.get('/admin/products').then(res => setProducts(res.data));
    api.get('/categories').then(res => setCategories(res.data));
    api.get('/admin/settings').then(res => setSettings(res.data));
  }, []);

  const fetchTables = () => api.get('/admin/tables').then(res => setTables(res.data));

  const handleProductClick = (product) => {
    const hasExtras = product.extras && product.extras.length > 0;
    const hasOptions = product.optionGroups && product.optionGroups.length > 0;
    if (hasExtras || hasOptions) {
      setExtrasDialog(product);
      setSelectedExtras([]);
      setSelectedOptions({});
    } else {
      addToCart(product, []);
    }
  };

  const toggleExtra = (extra) => {
    setSelectedExtras(prev => {
      const existing = prev.find(e => e.id === extra.id);
      if (existing) {
        return prev.filter(e => e.id !== extra.id);
      }
      return [...prev, { id: extra.id, name: extra.name, price: extra.price, quantity: 1 }];
    });
  };

  const changeExtraQty = (extraId, delta) => {
    setSelectedExtras(prev => prev.map(e => {
      if (e.id !== extraId) return e;
      const newQty = e.quantity + delta;
      return newQty >= 1 ? { ...e, quantity: newQty } : e;
    }));
  };

  const toggleOptionItem = (group, item) => {
    const entry = {
      id: `og_${item.id}`,
      name: item.product?.name || 'Seçim',
      price: parseFloat(item.additional_price) || 0,
      quantity: 1,
    };
    setSelectedOptions(prev => {
      const cur = prev[group.id] || [];
      const exists = cur.find(c => c.id === entry.id);
      let next;
      if (exists) next = cur.filter(c => c.id !== entry.id);
      else if (group.multi_select) {
        if (cur.length >= (group.max_select || 99)) return prev;
        next = [...cur, entry];
      } else next = [entry];
      return { ...prev, [group.id]: next };
    });
  };

  const confirmExtras = () => {
    if (extrasDialog) {
      const groups = extrasDialog.optionGroups || [];
      for (const g of groups) {
        const cnt = (selectedOptions[g.id] || []).length;
        if (cnt < (g.min_select || 0)) {
          toast.error(`"${g.name}" için en az ${g.min_select} seçim yapın`);
          return;
        }
      }
      const allOpts = Object.values(selectedOptions).flat();
      addToCart(extrasDialog, [...selectedExtras, ...allOpts]);
      setExtrasDialog(null);
      setSelectedExtras([]);
      setSelectedOptions({});
    }
  };

  const addToCart = (product, extras) => {
    setCartItems(prev => [...prev, {
      product_id: product.id, name: product.name, price: product.price,
      quantity: 1, extras, isFree: false
    }]);
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
    const extrasTotal = i.extras.reduce((es, e) => es + parseFloat(e.price) * (e.quantity || 1), 0);
    return s + (parseFloat(i.price) + extrasTotal) * i.quantity;
  }, 0);

  const discountAmount = promoResult ? parseFloat(promoResult.discount_amount) || 0 : 0;
  const finalTotal = Math.max(0, cartTotal - discountAmount);

  const handleApplyPromo = async () => {
    if (!promoCode.trim()) { toast.error('Promosyon kodu girin'); return; }
    if (cartTotal <= 0) { toast.error('Önce ürün ekleyin'); return; }
    setPromoLoading(true);
    try {
      const res = await api.post('/orders/validate-promo', { code: promoCode.trim(), order_total: cartTotal });
      setPromoResult(res.data);
      toast.success(`İndirim uygulandı: -${parseFloat(res.data.discount_amount).toFixed(2)} TL`);
    } catch (err) {
      setPromoResult(null);
      toast.error(err.response?.data?.error || 'Geçersiz kod');
    } finally { setPromoLoading(false); }
  };

  const removePromo = () => { setPromoResult(null); setPromoCode(''); };

  const printReceipt = (order) => {
    const items = order.items || [];
    const d = new Date(order.createdAt || order.created_at);
    const dateStr = d.toLocaleString('tr-TR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    const masaInfo = order.table ? (order.table.table_name ? `${order.table.table_name} (${order.table.table_number})` : order.table.table_number) : '-';
    const type = order.order_type === 'online'
      ? `🌐 ONLINE SİPARİŞ`
      : order.table
        ? `MASA: ${masaInfo}`
        : `📱 TELEFON SİPARİŞİ`;
    const customer = order.customer_name || '-';
    const phone = order.customer_phone || '';
    // Ödeme bilgisi (split / kısmi nakit dahil)
    const totAmt = parseFloat(order.total_amount) || 0;
    const cashAmtRaw = order.cash_amount;
    const cashAmt = (cashAmtRaw === null || cashAmtRaw === undefined || cashAmtRaw === '') ? null : parseFloat(cashAmtRaw);
    let payment;
    if (cashAmt !== null && !isNaN(cashAmt) && cashAmt > 0 && cashAmt < totAmt) {
      payment = `💵 Nakit: ${cashAmt.toFixed(2)} TL  +  💳 Kart: ${(totAmt - cashAmt).toFixed(2)} TL`;
    } else if (order.payment_method === 'online' || order.payment_method === 'card') {
      payment = '💳 Kart';
    } else {
      payment = '💵 Nakit';
    }

    const rTitle = settings.receipt_title || 'UGA BURGER';
    const rFooter = settings.receipt_footer || 'Afiyet Olsun!';
    const rFontPx = { small: 12, medium: 14, large: 16 }[settings.receipt_font_size] || 14;

    let itemsHtml = '';
    items.forEach(item => {
      const name = item.product?.name || item.name || 'Ürün';
      const price = (parseFloat(item.unit_price) * item.quantity).toFixed(2);
      itemsHtml += `<tr><td>${item.quantity}x ${name}</td><td style="text-align:right">${price} TL</td></tr>`;
      const extras = item.extras || [];
      if (extras.length > 0) {
        extras.forEach(e => {
          const qty = e.quantity || 1;
          itemsHtml += `<tr><td style="padding-left:8px;font-size:${rFontPx - 2}px">+ ${qty > 1 ? qty + 'x ' : ''}${e.name}</td><td style="text-align:right;font-size:${rFontPx - 2}px">${(parseFloat(e.price) * qty).toFixed(2)} TL</td></tr>`;
        });
      }
    });

    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"><title>Fiş</title>
<style>
  @page { size: 80mm auto; margin: 2mm; }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    font-family: 'Arial Black', 'Helvetica', Arial, sans-serif;
    font-size: ${rFontPx + 1}px;
    width: 76mm;
    font-weight: 900;
    color: #000;
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
    letter-spacing: 0.3px;
  }
  .center { text-align: center; }
  .bold { font-weight: 900; }
  .sep { border-top: 2px solid #000; margin: 5px 0; }
  table { width: 100%; border-collapse: collapse; }
  td { padding: 2px 0; vertical-align: top; font-weight: 900; }
  .total { font-size: ${rFontPx + 6}px; font-weight: 900; }
</style></head><body>
  <div class="center bold" style="font-size:${rFontPx + 6}px;margin-bottom:2px">${rTitle}</div>
  <div class="sep"></div>
  <div class="bold center" style="font-size:${rFontPx + 2}px">#${order.id}</div>
  <div class="center" style="font-size:${rFontPx - 2}px">${dateStr}</div>
  <div class="sep"></div>
  <div style="font-size:${rFontPx - 1}px"><b>${type}</b></div>
  ${order.order_note ? `<div style="font-size:${rFontPx - 1}px">📝 Not: ${order.order_note}</div>` : ''}
  ${customer !== '-' ? `<div style="font-size:${rFontPx - 1}px">Müşteri: ${customer}</div>` : ''}
  ${phone ? `<div style="font-size:${rFontPx - 1}px">Tel: ${phone}</div>` : ''}
  ${order.delivery_address ? `<div style="font-size:${rFontPx - 1}px">Adres: ${order.delivery_address}</div>` : ''}
  <div class="sep"></div>
  <table>${itemsHtml}</table>
  <div class="sep"></div>
  <table><tr><td class="total">TOPLAM:</td><td class="total" style="text-align:right">${parseFloat(order.total_amount).toFixed(2)} TL</td></tr></table>
  <div class="sep"></div>
  <div class="center" style="font-size:${rFontPx - 2}px">Ödeme: ${payment}</div>
  <div class="sep"></div>
  <div class="center" style="font-size:${rFontPx - 2}px;margin-top:4px">${rFooter}</div>
  <div class="center" style="font-size:${rFontPx - 3}px;margin-top:2px">--- SON ---</div>
</body></html>`;

    // Electron varsa popup'sız silent print, yoksa fallback iframe
    if (window.electronAPI?.isElectron) {
      window.electronAPI.silentPrint(html)
        .then(() => console.log('Fiş yazdırıldı (silent)'))
        .catch(err => console.error('Print hatası:', err));
    } else {
      const iframe = document.createElement('iframe');
      iframe.style.cssText = 'position:fixed;top:0;left:0;width:0;height:0;border:none;visibility:hidden';
      document.body.appendChild(iframe);
      iframe.contentDocument.write(html);
      iframe.contentDocument.close();
      iframe.contentWindow.onafterprint = () => document.body.removeChild(iframe);
      setTimeout(() => iframe.contentWindow.print(), 200);
    }
  };

  const submitQuickOrder = async () => {
    if (!selectedTable) { toast.error('Masa seçiniz'); return; }
    if (cartItems.length === 0) { toast.error('Ürün seçiniz'); return; }
    // Kısmi nakit doğrulaması
    let cashAmt = parseFloat(cashSplitAmount);
    if (cashSplitAmount === '' || isNaN(cashAmt) || cashAmt <= 0) cashAmt = null;
    if (cashAmt !== null && cashAmt > finalTotal) {
      toast.error('Nakit tutar toplamdan büyük olamaz');
      return;
    }
    try {
      const res = await api.post('/admin/quick-order', {
        items: cartItems.map(i => ({
          product_id: i.product_id, quantity: i.quantity, extras: i.extras,
          unit_price_override: i.isFree ? 0 : undefined
        })),
        table_id: selectedTable ? parseInt(selectedTable) : null,
        order_note: orderNote,
        payment_method: paymentType,
        cash_amount: cashAmt,
        customer_name: customerName || null,
        customer_phone: customerPhone || null,
        delivery_address: customerAddress || null,
        promo_code: promoResult ? promoResult.code : null,
      });
      toast.success('Hızlı sipariş oluşturuldu!');
      setCartItems([]); setOrderNote(''); setSelectedTable(''); setPaymentType('cash');
      setCustomerName(''); setCustomerPhone(''); setCustomerAddress('');
      setCashSplitAmount('');
      setPromoCode(''); setPromoResult(null);
      if (settings.receipt_auto_print !== 'false') {
        setTimeout(() => printReceipt(res.data), 100);
      }
    } catch (err) { toast.error(err.response?.data?.error || 'Hata'); }
  };

  const filteredProducts = (activeCategory ? products.filter(p => p.category_id === activeCategory) : products).filter(p => p.is_quick_order !== false);

  return (
    <Box sx={{ overflow: 'hidden' }}>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 3 }}>Masa Siparişleri / Hızlı Sipariş</Typography>

      <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 320px' }, gap: 2 }}>
        {/* Sol Taraf: Hızlı Sipariş */}
        <Box sx={{ minWidth: 0 }}>
      {/* Quick Order */}
      <Typography variant="subtitle1" sx={{ fontWeight: 700, mb: 1.5 }}>Hızlı Sipariş</Typography>
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
                  <Box component="img" src={getImageUrl(p.image_url)} alt={p.name} sx={{ width: '100%', height: 100, objectFit: 'cover', borderRadius: 2, mb: 1 }} />
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
            <InputLabel>Masa seçiniz</InputLabel>
            <Select value={selectedTable} onChange={e => setSelectedTable(e.target.value)} label="Masa seçiniz">
              {tables.map(t => <MenuItem key={t.id} value={t.id}>{t.table_name ? `${t.table_name} (${t.table_number})` : `Masa ${t.table_number}`}</MenuItem>)}
            </Select>
          </FormControl>

          <Stack spacing={1} sx={{ mb: 1.5 }}>
            <Stack direction="row" spacing={1}>
              <TextField size="small" placeholder="Tel No" value={customerPhone} onChange={e => setCustomerPhone(e.target.value)} sx={{ flex: 1 }} />
              <TextField size="small" placeholder="Müşteri Adı" value={customerName} onChange={e => setCustomerName(e.target.value)} sx={{ flex: 1 }} />
            </Stack>
            <TextField size="small" fullWidth placeholder="Adres" value={customerAddress} onChange={e => setCustomerAddress(e.target.value)} />
          </Stack>

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
                        + {item.extras.map(e => `${(e.quantity || 1) > 1 ? (e.quantity || 1) + 'x ' : ''}${e.name} (${(parseFloat(e.price) * (e.quantity || 1)).toFixed(2)} TL)`).join(', ')}
                      </Typography>
                    )}
                    <Typography variant="caption" sx={{ color: item.isFree ? '#16a34a' : '#dc2626', fontWeight: 700 }}>
                      {item.isFree ? 'ÜCRETSİZ' : `${((parseFloat(item.price) + item.extras.reduce((s, e) => s + parseFloat(e.price) * (e.quantity || 1), 0)) * item.quantity).toFixed(2)} TL`}
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

          {/* Kısmi (split) nakit ödeme: müşteri bir kısmını nakit, kalanını kart öderse */}
          <Box sx={{ mb: 1, p: 1, borderRadius: 1, border: '1px dashed #d1d5db', bgcolor: '#fafafa' }}>
            <Stack direction="row" alignItems="center" spacing={1}>
              <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 700, whiteSpace: 'nowrap' }}>
                Bakiyeden Nakit Düşür
              </Typography>
              <TextField
                size="small"
                type="number"
                inputProps={{ min: 0, step: '0.01' }}
                placeholder="0"
                value={cashSplitAmount}
                onChange={e => setCashSplitAmount(e.target.value)}
                sx={{ width: 110 }}
              />
              <Typography variant="caption" sx={{ color: '#666' }}>TL</Typography>
            </Stack>
            {(() => {
              const c = parseFloat(cashSplitAmount);
              if (!isNaN(c) && c > 0 && c < finalTotal) {
                return (
                  <Typography variant="caption" sx={{ display: 'block', mt: 0.5, color: '#3b82f6', fontWeight: 600 }}>
                    Kart tutarı: {(finalTotal - c).toFixed(2)} TL
                  </Typography>
                );
              }
              return null;
            })()}
          </Box>

          {/* Promosyon Kodu */}
          <Box sx={{ mb: 1, p: 1, borderRadius: 1, border: '1px dashed #d1d5db', bgcolor: '#fafafa' }}>
            <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 700, display: 'block', mb: 0.5 }}>
              🎟️ Promosyon Kodum Var
            </Typography>
            {!promoResult ? (
              <Stack direction="row" spacing={1}>
                <TextField
                  size="small"
                  placeholder="KOD"
                  value={promoCode}
                  onChange={e => setPromoCode(e.target.value.toUpperCase())}
                  sx={{ flex: 1 }}
                />
                <Button
                  size="small"
                  variant="contained"
                  onClick={handleApplyPromo}
                  disabled={promoLoading}
                  sx={{ bgcolor: '#dc2626', fontWeight: 700, '&:hover': { bgcolor: '#b91c1c' } }}
                >
                  Uygula
                </Button>
              </Stack>
            ) : (
              <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={1}>
                <Box>
                  <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 700, display: 'block' }}>
                    ✔ {promoResult.code} uygulandı
                  </Typography>
                  <Typography variant="caption" sx={{ color: '#16a34a' }}>
                    İndirim: -{parseFloat(promoResult.discount_amount).toFixed(2)} TL
                  </Typography>
                </Box>
                <Button size="small" onClick={removePromo} sx={{ color: '#dc2626', fontWeight: 700, fontSize: 11 }}>
                  Kaldır
                </Button>
              </Stack>
            )}
          </Box>

          {discountAmount > 0 && (
            <Stack direction="row" justifyContent="space-between" sx={{ mt: 1 }}>
              <Typography sx={{ color: '#666', fontSize: 13 }}>Ara Toplam</Typography>
              <Typography sx={{ color: '#666', fontSize: 13, textDecoration: 'line-through' }}>{cartTotal.toFixed(2)} TL</Typography>
            </Stack>
          )}
          {discountAmount > 0 && (
            <Stack direction="row" justifyContent="space-between">
              <Typography sx={{ color: '#16a34a', fontSize: 13, fontWeight: 600 }}>İndirim</Typography>
              <Typography sx={{ color: '#16a34a', fontSize: 13, fontWeight: 600 }}>-{discountAmount.toFixed(2)} TL</Typography>
            </Stack>
          )}

          <Stack direction="row" justifyContent="space-between" sx={{ my: 1 }}>
            <Typography sx={{ fontWeight: 800, fontSize: 16 }}>Toplam</Typography>
            <Typography sx={{ fontWeight: 800, fontSize: 16 }}>{finalTotal.toFixed(2)} TL</Typography>
          </Stack>

          <Button fullWidth variant="contained" color="success" onClick={submitQuickOrder} sx={{ py: 1.5, fontWeight: 700, fontSize: 15 }}>
            Siparişi Oluştur
          </Button>
        </Card>
      </Box>

      <Dialog open={!!extrasDialog} onClose={() => setExtrasDialog(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>{extrasDialog?.name}</DialogTitle>
        <DialogContent>
          {(extrasDialog?.optionGroups || []).map(group => {
            const sel = selectedOptions[group.id] || [];
            return (
              <Box key={group.id} sx={{ mb: 2 }}>
                <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                  <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>{group.name}</Typography>
                  <Chip size="small" label={`${group.min_select}-${group.max_select}`} sx={{ height: 20, fontSize: 10, bgcolor: '#fef3c7', color: '#92400e' }} />
                </Stack>
                <Stack spacing={0.75}>
                  {(group.items || []).map(item => {
                    const isSel = !!sel.find(c => c.id === `og_${item.id}`);
                    const addPrice = parseFloat(item.additional_price) || 0;
                    return (
                      <Chip key={item.id}
                        label={`${item.product?.name || 'Ürün'}${addPrice > 0 ? ` (+${addPrice.toFixed(2)} TL)` : ''}`}
                        onClick={() => toggleOptionItem(group, item)}
                        variant={isSel ? 'filled' : 'outlined'}
                        sx={{ fontWeight: 600, justifyContent: 'flex-start', height: 36, ...(isSel && { bgcolor: '#dc2626', color: '#fff' }) }}
                      />
                    );
                  })}
                </Stack>
              </Box>
            );
          })}

          {(extrasDialog?.extras || []).filter(e => e.is_available !== false).length > 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1, mt: 1 }}>Ekstralar:</Typography>
          )}
          <Stack spacing={1}>
            {extrasDialog?.extras?.filter(e => e.is_available !== false).map(extra => {
              const selected = selectedExtras.find(e => e.id === extra.id);
              return (
                <Stack key={extra.id} direction="row" alignItems="center" spacing={1}>
                  <Chip
                    label={`${extra.name} (+${parseFloat(extra.price).toFixed(2)} TL)`}
                    onClick={() => toggleExtra(extra)}
                    variant={selected ? 'filled' : 'outlined'}
                    sx={{
                      fontWeight: 600, justifyContent: 'flex-start', height: 40, flex: 1,
                      ...(selected && { bgcolor: '#8b5cf6', color: '#fff' })
                    }}
                  />
                  {selected && (
                    <Stack direction="row" alignItems="center" spacing={0.5}>
                      <IconButton size="small" onClick={() => changeExtraQty(extra.id, -1)}
                        sx={{ border: 1, borderColor: '#ddd', width: 28, height: 28 }}>
                        <RemoveIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                      <Typography sx={{ fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{selected.quantity}</Typography>
                      <IconButton size="small" onClick={() => changeExtraQty(extra.id, 1)}
                        sx={{ border: 1, borderColor: '#ddd', width: 28, height: 28 }}>
                        <AddIcon sx={{ fontSize: 14 }} />
                      </IconButton>
                    </Stack>
                  )}
                </Stack>
              );
            })}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {(!extrasDialog?.optionGroups || extrasDialog.optionGroups.length === 0) && (
            <Button onClick={() => { addToCart(extrasDialog, []); setExtrasDialog(null); setSelectedOptions({}); setSelectedExtras([]); }} sx={{ fontWeight: 600 }}>Boş Ekle</Button>
          )}
          <Button variant="contained" onClick={confirmExtras} sx={{ fontWeight: 600 }}>Seçilenlerle Ekle</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
