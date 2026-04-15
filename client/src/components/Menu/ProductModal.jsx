import { useState } from 'react';
import { useCart } from '../../context/CartContext';
import toast from 'react-hot-toast';
import {
  Dialog, DialogContent, Box, Typography, Chip, IconButton, Button, Checkbox, Stack
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import { getImageUrl } from '../../api/api';

export default function ProductModal({ product, onClose }) {
  const [quantity, setQuantity] = useState(1);
  const [selectedExtras, setSelectedExtras] = useState([]);
  const { addItem } = useCart();

  const extras = product.extras || [];

  const toggleExtra = (extra) => {
    setSelectedExtras(prev =>
      prev.find(e => e.id === extra.id) ? prev.filter(e => e.id !== extra.id) : [...prev, extra]
    );
  };

  const extrasTotal = selectedExtras.reduce((s, e) => s + parseFloat(e.price), 0);
  const totalPrice = (parseFloat(product.price) + extrasTotal) * quantity;

  const handleAdd = () => {
    addItem(product, quantity, selectedExtras);
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
          <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 0.5 }}>
            <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>Ekstra Lezzetler</Typography>
            <Chip label="İsteğe Bağlı" size="small" sx={{ fontSize: 11, bgcolor: '#f0f0f0', color: '#888' }} />
          </Stack>

          {extras.length === 0 ? (
            <Box sx={{ textAlign: 'center', p: 2, bgcolor: '#f8f8f8', borderRadius: 2, mt: 1 }}>
              <Typography variant="body2" color="text.secondary">Bu ürün için ekstra seçenek bulunmuyor.</Typography>
            </Box>
          ) : (
            extras.map(extra => {
              const isSelected = !!selectedExtras.find(e => e.id === extra.id);
              return (
                <Box key={extra.id} onClick={() => toggleExtra(extra)}
                  sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', p: 1.5,
                    border: 1, borderColor: isSelected ? '#dc2626' : '#eee', borderRadius: 2, mt: 1,
                    cursor: 'pointer', bgcolor: isSelected ? '#fef2f2' : 'transparent', transition: 'all 0.2s',
                    '&:hover': { borderColor: '#dc2626' } }}>
                  <Stack direction="row" alignItems="center" spacing={1}>
                    <Checkbox checked={isSelected} size="small" sx={{ p: 0, color: '#dc2626', '&.Mui-checked': { color: '#dc2626' } }} />
                    <Box>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>{extra.name}</Typography>
                      <Typography variant="caption" color="text.secondary">1 ADET</Typography>
                    </Box>
                  </Stack>
                  <Typography variant="body2" sx={{ color: '#16a34a', fontWeight: 600 }}>+{parseFloat(extra.price).toFixed(2)} ₺</Typography>
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
