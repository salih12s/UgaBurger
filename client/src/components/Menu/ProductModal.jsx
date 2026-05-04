import { useState } from 'react';
import { useCart } from '../../context/CartContext';
import toast from 'react-hot-toast';
import {
  Dialog, DialogContent, Box, Typography, Chip, IconButton, Button, Checkbox, Stack,
  Accordion, AccordionSummary, AccordionDetails
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { getImageUrl } from '../../api/api';

export default function ProductModal({ product, onClose }) {
  const [quantity, setQuantity] = useState(1);
  const [selectedExtras, setSelectedExtras] = useState([]);
  // optionGroupId -> [{ id, name, price, quantity }]
  const [selectedOptions, setSelectedOptions] = useState({});
  const { addItem } = useCart();

  const extras = product.extras || [];
  const optionGroups = product.optionGroups || [];

  const toggleExtra = (extra) => {
    setSelectedExtras(prev =>
      prev.find(e => e.id === extra.id) ? prev.filter(e => e.id !== extra.id) : [...prev, { ...extra, quantity: 1 }]
    );
  };

  const changeExtraQty = (extraId, delta) => {
    setSelectedExtras(prev => prev.map(e => {
      if (e.id !== extraId) return e;
      const newQty = e.quantity + delta;
      return newQty >= 1 ? { ...e, quantity: newQty } : e;
    }));
  };

  const toggleOption = (group, item) => {
    const itemEntry = {
      id: `og_${item.id}`,
      name: item.product?.name || 'Seçim',
      price: parseFloat(item.additional_price) || 0,
      quantity: 1,
      _option_group_id: group.id,
      _option_group_name: group.name,
    };
    setSelectedOptions(prev => {
      const current = prev[group.id] || [];
      const exists = current.find(c => c.id === itemEntry.id);
      let next;
      if (exists) {
        next = current.filter(c => c.id !== itemEntry.id);
      } else if (group.multi_select) {
        if (current.length >= (group.max_select || 99)) return prev;
        next = [...current, itemEntry];
      } else {
        next = [itemEntry];
      }
      return { ...prev, [group.id]: next };
    });
  };

  const allOptionSelections = Object.values(selectedOptions).flat();
  const optionsTotal = allOptionSelections.reduce((s, e) => s + parseFloat(e.price) * (e.quantity || 1), 0);
  const extrasTotal = selectedExtras.reduce((s, e) => s + parseFloat(e.price) * (e.quantity || 1), 0);
  const totalPrice = (parseFloat(product.price) + extrasTotal + optionsTotal) * quantity;

  const handleAdd = () => {
    // Min seçim doğrulaması
    for (const g of optionGroups) {
      const count = (selectedOptions[g.id] || []).length;
      const min = g.min_select || 0;
      if (count < min) {
        toast.error(`"${g.name}" için en az ${min} seçim yapmalısınız`);
        return;
      }
    }
    // Opsiyon seçimlerini de extras gibi gönder
    addItem(product, quantity, [...selectedExtras, ...allOptionSelections]);
    toast.success(`${product.name} sepete eklendi`);
    onClose();
  };

  return (
    <Dialog open onClose={onClose} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4, overflow: 'hidden' } }}>
      <IconButton onClick={onClose} sx={{ position: 'absolute', top: 8, right: 8, zIndex: 2, bgcolor: 'rgba(255,255,255,0.9)', boxShadow: '0 2px 8px rgba(0,0,0,0.15)' }}>
        <CloseIcon />
      </IconButton>

      {product.image_url ? (
        <Box component="img" src={getImageUrl(product.image_url)} alt={product.name} sx={{ width: '100%', height: 280, objectFit: 'cover' }} />
      ) : (
        <Box sx={{ width: '100%', height: 280, bgcolor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 64 }}>🍔</Box>
      )}

      <DialogContent sx={{ p: 3 }}>
        <Stack direction="row" justifyContent="space-between" alignItems="flex-start" sx={{ mb: 1.5 }}>
          <Typography variant="h5" sx={{ fontWeight: 800 }}>{product.name}</Typography>
          <Typography sx={{ fontWeight: 800, color: '#dc2626', fontSize: 20, whiteSpace: 'nowrap', ml: 2 }}>{parseFloat(product.price).toFixed(2)} TL</Typography>
        </Stack>

        {product.description && (
          <Box sx={{ bgcolor: '#f8f8f8', p: 1.5, borderRadius: 2, mb: 2.5 }}>
            <Typography variant="body2" color="text.secondary">{product.description}</Typography>
          </Box>
        )}

        <Box>
          {optionGroups.map(group => {
            const selectedList = selectedOptions[group.id] || [];
            const isComplete = selectedList.length >= (group.min_select || 0);
            const summary = selectedList.map(s => s.name).join(', ');
            // Bu grubun çoğunluk kategorisi (geçmiş verilerde karışmış kategorileri temizlemek için)
            const catCounts = {};
            (group.items || []).forEach(it => {
              const cid = it.product?.category_id;
              if (cid != null) catCounts[cid] = (catCounts[cid] || 0) + 1;
            });
            const dominantCat = Object.keys(catCounts).sort((a, b) => catCounts[b] - catCounts[a])[0];
            const visibleItems = dominantCat
              ? (group.items || []).filter(it => String(it.product?.category_id) === String(dominantCat))
              : (group.items || []);
            return (
              <Accordion key={group.id} disableGutters elevation={0} defaultExpanded
                sx={{
                  mb: 1.25, borderRadius: 2, border: '1px solid',
                  borderColor: !isComplete && group.min_select > 0 ? '#fca5a5' : '#e5e7eb',
                  '&:before': { display: 'none' },
                  '&.Mui-expanded': { my: 1.25 },
                  overflow: 'hidden',
                }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />} sx={{ minHeight: 56, '& .MuiAccordionSummary-content': { my: 1 } }}>
                  <Stack sx={{ flex: 1 }}>
                    <Stack direction="row" alignItems="center" spacing={1}>
                      <Typography variant="body1" sx={{ fontWeight: 700 }}>{group.name}</Typography>
                      {group.min_select > 0 && (
                        <Chip size="small" label="Zorunlu" sx={{ height: 18, fontSize: 10, fontWeight: 700, bgcolor: '#fee2e2', color: '#dc2626' }} />
                      )}
                      <Chip size="small" label={`${group.min_select}-${group.max_select}`} sx={{ height: 18, fontSize: 10, bgcolor: '#f3f4f6', color: '#6b7280' }} />
                    </Stack>
                    {summary && (
                      <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 600, mt: 0.25 }}>
                        Seçim: {summary}
                      </Typography>
                    )}
                  </Stack>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0, pb: 1.5 }}>
                  {visibleItems.map(item => {
                    const isSelected = !!selectedList.find(s => s.id === `og_${item.id}`);
                    const addPrice = parseFloat(item.additional_price) || 0;
                    return (
                      <Box key={item.id}
                        onClick={() => toggleOption(group, item)}
                        sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.25,
                          border: 1, borderColor: isSelected ? '#dc2626' : '#eee', borderRadius: 2, mt: 1, cursor: 'pointer',
                          bgcolor: isSelected ? '#fef2f2' : 'transparent', transition: 'all 0.15s' }}>
                        <Stack direction="row" alignItems="center" spacing={1.25} sx={{ minWidth: 0 }}>
                          <Checkbox checked={isSelected} size="small" sx={{ p: 0, color: '#dc2626', '&.Mui-checked': { color: '#dc2626' } }} />
                          {item.product?.image_url
                            ? <Box component="img" src={getImageUrl(item.product.image_url)} alt="" sx={{ width: 40, height: 40, borderRadius: 1.5, objectFit: 'cover', flexShrink: 0 }} />
                            : <Box sx={{ width: 40, height: 40, borderRadius: 1.5, bgcolor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>🍔</Box>
                          }
                          <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis' }}>{item.product?.name || 'Ürün'}</Typography>
                        </Stack>
                        {addPrice > 0 && (
                          <Typography variant="body2" sx={{ color: '#16a34a', fontWeight: 700, whiteSpace: 'nowrap', ml: 1 }}>+{addPrice.toFixed(2)} ₺</Typography>
                        )}
                      </Box>
                    );
                  })}
                </AccordionDetails>
              </Accordion>
            );
          })}

          {extras.length > 0 && (
            <>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ mt: 2, mb: 0.5 }}>
                <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Ekstra Lezzetler</Typography>
                <Chip label="İsteğe Bağlı" size="small" sx={{ fontSize: 11, bgcolor: '#f0f0f0', color: '#888' }} />
              </Stack>
            </>
          )}

          {extras.length === 0 && optionGroups.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#f8f8f8', borderRadius: 2, mt: 1 }}>
              <Typography variant="body2" color="text.secondary">Bu ürün için ekstra seçenek bulunmuyor.</Typography>
            </Box>
          ) : (
            extras.map(extra => {
              const selected = selectedExtras.find(e => e.id === extra.id);
              const isSelected = !!selected;
              return (
                <Box key={extra.id}
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5,
                    border: 1, borderColor: isSelected ? '#dc2626' : '#eee', borderRadius: 2, mt: 1,
                    bgcolor: isSelected ? '#fef2f2' : 'transparent', transition: 'all 0.2s' }}>
                  <Stack direction="row" alignItems="center" spacing={1} onClick={() => !isSelected && toggleExtra(extra)} sx={{ cursor: !isSelected ? 'pointer' : 'default', flex: 1 }}>
                    <Checkbox checked={isSelected} size="small" onClick={(e) => { e.stopPropagation(); toggleExtra(extra); }} sx={{ p: 0, color: '#dc2626', '&.Mui-checked': { color: '#dc2626' } }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{extra.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{isSelected ? `${selected.quantity} ADET` : '1 ADET'}</Typography>
                    </Box>
                  </Stack>
                  <Stack direction="row" alignItems="center" spacing={0.5}>
                    {isSelected && (
                      <>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); if (selected.quantity <= 1) { toggleExtra(extra); } else { changeExtraQty(extra.id, -1); } }}
                          sx={{ border: 1, borderColor: '#ddd', width: 26, height: 26 }}>
                          <RemoveIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                        <Typography variant="body2" sx={{ fontWeight: 700, minWidth: 20, textAlign: 'center' }}>{selected.quantity}</Typography>
                        <IconButton size="small" onClick={(e) => { e.stopPropagation(); changeExtraQty(extra.id, 1); }}
                          sx={{ border: 1, borderColor: '#ddd', width: 26, height: 26 }}>
                          <AddIcon sx={{ fontSize: 14 }} />
                        </IconButton>
                      </>
                    )}
                    <Typography variant="body2" sx={{ color: '#16a34a', fontWeight: 600, ml: 1, whiteSpace: 'nowrap' }}>+{(parseFloat(extra.price) * (isSelected ? selected.quantity : 1)).toFixed(2)} ₺</Typography>
                  </Stack>
                </Box>
              );
            })
          )}
        </Box>

        <Stack direction="row" alignItems="center" justifyContent="center" spacing={2} sx={{ my: 3 }}>
          <IconButton onClick={() => setQuantity(Math.max(1, quantity - 1))} sx={{ border: 1, borderColor: '#ddd' }}>
            <RemoveIcon />
          </IconButton>
          <Typography sx={{ fontSize: 20, fontWeight: 800, minWidth: 30, textAlign: 'center' }}>{quantity}</Typography>
          <IconButton onClick={() => setQuantity(quantity + 1)} sx={{ border: 1, borderColor: '#ddd' }}>
            <AddIcon />
          </IconButton>
        </Stack>

        <Button fullWidth variant="contained" onClick={handleAdd}
          sx={{ py: 2, borderRadius: 3, fontSize: 16, fontWeight: 700, bgcolor: '#dc2626', '&:hover': { bgcolor: '#b91c1c' },
            display: 'flex', justifyContent: 'space-between' }}>
          <span>Sepete Ekle</span>
          <span>{totalPrice.toFixed(2)} TL</span>
        </Button>
      </DialogContent>
    </Dialog>
  );
}
