import { Card, CardMedia, CardContent, Typography, Button, Box } from '@mui/material';
import { getImageUrl } from '../../api/api';

export default function ProductCard({ product, onClick, disabled }) {
  return (
    <Card onClick={disabled ? undefined : onClick} sx={{ cursor: disabled ? 'default' : 'pointer', transition: 'transform 0.2s, box-shadow 0.2s', ...(disabled ? {} : { '&:hover': { transform: 'translateY(-2px)', boxShadow: '0 4px 16px rgba(0,0,0,0.1)' } }) }}>
      {product.image_url ? (
        <CardMedia
          component="img"
          height="200"
          image={getImageUrl(product.image_url)}
          alt={product.name}
          loading="eager"
          decoding="async"
          fetchpriority="high"
          sx={{ objectFit: 'cover' }}
        />
      ) : (
        <Box sx={{ height: 200, bgcolor: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 48 }}>🍔</Box>
      )}
      <CardContent>
        <Typography variant="subtitle1" sx={{ fontWeight: 700 }}>{product.name}</Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1, minHeight: 18 }}>{product.description}</Typography>
        <Typography sx={{ fontWeight: 700, color: '#dc2626', fontSize: 16, mb: 1.5 }}>{parseFloat(product.price).toFixed(2)} TL</Typography>
        <Button fullWidth variant="contained" disabled={disabled}
          onClick={(e) => { e.stopPropagation(); onClick(); }}
          sx={{ fontWeight: 700 }}>
          {disabled ? 'Sipariş Kapalı' : 'Sepete Ekle'}
        </Button>
      </CardContent>
    </Card>
  );
}
