import { useState, useEffect } from 'react';
import api from '../../api/axios';
import { getImageUrl } from '../../api/axios';
import toast from 'react-hot-toast';
import {
  Box, Typography, Button, Card, Stack, TextField, Chip, Checkbox, FormControlLabel,
  Table, TableHead, TableBody, TableRow, TableCell, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem, Switch
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

export default function MenuManagement() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [extras, setExtras] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', price: '', category_id: '', image_url: '', is_available: true, extra_ids: [] });
  const [tab, setTab] = useState('products');

  const [extraForm, setExtraForm] = useState({ name: '', price: '' });
  const [editingExtra, setEditingExtra] = useState(null);
  const [catForm, setCatForm] = useState({ name: '', slug: '', sort_order: 0 });

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = () => {
    api.get('/admin/products').then(res => setProducts(res.data));
    api.get('/categories').then(res => setCategories(res.data));
    api.get('/admin/extras').then(res => setExtras(res.data));
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setForm(f => ({ ...f, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleExtraToggle = (extraId) => {
    setForm(f => ({ ...f, extra_ids: f.extra_ids.includes(extraId) ? f.extra_ids.filter(id => id !== extraId) : [...f.extra_ids, extraId] }));
  };

  const openEdit = (product) => {
    setEditing(product.id);
    setForm({ name: product.name, description: product.description || '', price: product.price, category_id: product.category_id, image_url: product.image_url || '', is_available: product.is_available, extra_ids: product.extras ? product.extras.map(e => e.id) : [] });
    setShowForm(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', description: '', price: '', category_id: categories[0]?.id || '', image_url: '', is_available: true, extra_ids: [] });
    setShowForm(true);
  };

  const handleSubmit = async () => {
    if (!form.name || !form.price || !form.category_id) { toast.error('İsim, fiyat ve kategori zorunlu'); return; }
    try {
      const data = { ...form, price: parseFloat(form.price), category_id: parseInt(form.category_id) };
      if (editing) { await api.put(`/admin/products/${editing}`, data); toast.success('Ürün güncellendi'); }
      else { await api.post('/admin/products', data); toast.success('Ürün eklendi'); }
      setShowForm(false); fetchAll();
    } catch (err) { toast.error(err.response?.data?.error || 'Hata'); }
  };

  const handleDelete = async (id) => {
    if (!confirm('Bu ürünü silmek istediğinize emin misiniz?')) return;
    try { await api.delete(`/admin/products/${id}`); toast.success('Ürün silindi'); fetchAll(); } catch { toast.error('Hata'); }
  };

  const handleUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const formData = new FormData();
    formData.append('image', file);
    try { const res = await api.post('/admin/upload', formData, { headers: { 'Content-Type': 'multipart/form-data' } }); setForm(f => ({ ...f, image_url: res.data.url })); toast.success('Resim yüklendi'); }
    catch { toast.error('Yükleme hatası'); }
  };

  const handleExtraSubmit = async () => {
    if (!extraForm.name || !extraForm.price) { toast.error('İsim ve fiyat zorunlu'); return; }
    try {
      if (editingExtra) { await api.put(`/admin/extras/${editingExtra}`, { name: extraForm.name, price: parseFloat(extraForm.price) }); toast.success('Ekstra güncellendi'); }
      else { await api.post('/admin/extras', { name: extraForm.name, price: parseFloat(extraForm.price) }); toast.success('Ekstra eklendi'); }
      setExtraForm({ name: '', price: '' }); setEditingExtra(null); fetchAll();
    } catch (err) { toast.error(err.response?.data?.error || 'Hata'); }
  };

  const handleExtraDelete = async (id) => {
    try { await api.delete(`/admin/extras/${id}`); toast.success('Ekstra silindi'); fetchAll(); } catch { toast.error('Hata'); }
  };

  const handleCatSubmit = async () => {
    if (!catForm.name) { toast.error('Kategori adı zorunlu'); return; }
    try {
      await api.post('/admin/categories', { name: catForm.name, slug: catForm.slug || catForm.name.toLowerCase().replace(/\s+/g, '-'), sort_order: catForm.sort_order });
      toast.success('Kategori eklendi'); setCatForm({ name: '', slug: '', sort_order: 0 }); fetchAll();
    } catch (err) { toast.error(err.response?.data?.error || 'Hata'); }
  };

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 3, flexWrap: 'wrap', gap: 1 }}>
        <Typography variant="h5" sx={{ fontWeight: 800 }}>Menü Yönetimi</Typography>
        <Stack direction="row" spacing={1}>
          <Chip label="Ürünler" onClick={() => setTab('products')} variant={tab === 'products' ? 'filled' : 'outlined'}
            sx={{ fontWeight: 600, ...(tab === 'products' && { bgcolor: '#dc2626', color: '#fff' }) }} />
          <Chip label="Ekstralar" onClick={() => setTab('extras')} variant={tab === 'extras' ? 'filled' : 'outlined'}
            sx={{ fontWeight: 600, ...(tab === 'extras' && { bgcolor: '#dc2626', color: '#fff' }) }} />
          <Chip label="Kategoriler" onClick={() => setTab('categories')} variant={tab === 'categories' ? 'filled' : 'outlined'}
            sx={{ fontWeight: 600, ...(tab === 'categories' && { bgcolor: '#dc2626', color: '#fff' }) }} />
        </Stack>
      </Stack>

      {tab === 'products' && (
        <>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openNew} sx={{ mb: 2, fontWeight: 600 }}>Yeni Ürün Ekle</Button>
          <Card sx={{ overflow: 'auto' }}>
            <Table>
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: '#f8f8f8' } }}>
                  <TableCell>Resim</TableCell>
                  <TableCell>İsim</TableCell>
                  <TableCell>Kategori</TableCell>
                  <TableCell>Fiyat</TableCell>
                  <TableCell>Durum</TableCell>
                  <TableCell>İşlem</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {products.map(p => (
                  <TableRow key={p.id} hover>
                    <TableCell>
                      {p.image_url ? <Box component="img" src={getImageUrl(p.image_url)} alt="" sx={{ width: 40, height: 40, borderRadius: 1.5, objectFit: 'cover' }} /> : '🍔'}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 600 }}>{p.name}</TableCell>
                    <TableCell>{p.category?.name}</TableCell>
                    <TableCell>{parseFloat(p.price).toFixed(2)} TL</TableCell>
                    <TableCell>
                      <Chip label={p.is_available ? 'Aktif' : 'Pasif'} size="small"
                        sx={{ bgcolor: p.is_available ? '#dcfce7' : '#fee2e2', color: p.is_available ? '#16a34a' : '#dc2626', fontWeight: 600 }} />
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <IconButton size="small" color="primary" onClick={() => openEdit(p)}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => handleDelete(p.id)}><DeleteIcon fontSize="small" /></IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        </>
      )}

      {tab === 'extras' && (
        <Card sx={{ p: 2.5 }}>
          <Stack direction="row" spacing={1} sx={{ mb: 2.5 }}>
            <TextField size="small" placeholder="Ekstra adı" value={extraForm.name} onChange={e => setExtraForm(f => ({ ...f, name: e.target.value }))} sx={{ flex: 1 }} />
            <TextField size="small" placeholder="Fiyat" type="number" inputProps={{ step: '0.01' }} value={extraForm.price} onChange={e => setExtraForm(f => ({ ...f, price: e.target.value }))} sx={{ width: 100 }} />
            <Button variant="contained" color="success" onClick={handleExtraSubmit} sx={{ fontWeight: 600 }}>{editingExtra ? 'Güncelle' : 'Ekle'}</Button>
          </Stack>
          <Table>
            <TableHead><TableRow sx={{ '& th': { fontWeight: 700, bgcolor: '#f8f8f8' } }}><TableCell>İsim</TableCell><TableCell>Fiyat</TableCell><TableCell>İşlem</TableCell></TableRow></TableHead>
            <TableBody>
              {extras.map(e => (
                <TableRow key={e.id} hover>
                  <TableCell>{e.name}</TableCell>
                  <TableCell>{parseFloat(e.price).toFixed(2)} TL</TableCell>
                  <TableCell>
                    <Stack direction="row" spacing={0.5}>
                      <IconButton size="small" color="primary" onClick={() => { setEditingExtra(e.id); setExtraForm({ name: e.name, price: e.price }); }}><EditIcon fontSize="small" /></IconButton>
                      <IconButton size="small" color="error" onClick={() => handleExtraDelete(e.id)}><DeleteIcon fontSize="small" /></IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {tab === 'categories' && (
        <Card sx={{ p: 2.5 }}>
          <Stack direction="row" spacing={1} sx={{ mb: 2.5 }}>
            <TextField size="small" placeholder="Kategori adı" value={catForm.name} onChange={e => setCatForm(f => ({ ...f, name: e.target.value }))} sx={{ flex: 1 }} />
            <TextField size="small" placeholder="Slug" value={catForm.slug} onChange={e => setCatForm(f => ({ ...f, slug: e.target.value }))} sx={{ width: 120 }} />
            <TextField size="small" placeholder="Sıra" type="number" value={catForm.sort_order} onChange={e => setCatForm(f => ({ ...f, sort_order: parseInt(e.target.value) || 0 }))} sx={{ width: 80 }} />
            <Button variant="contained" color="success" onClick={handleCatSubmit} sx={{ fontWeight: 600 }}>Ekle</Button>
          </Stack>
          <Table>
            <TableHead><TableRow sx={{ '& th': { fontWeight: 700, bgcolor: '#f8f8f8' } }}><TableCell>İsim</TableCell><TableCell>Slug</TableCell><TableCell>Sıra</TableCell></TableRow></TableHead>
            <TableBody>
              {categories.map(c => (
                <TableRow key={c.id} hover><TableCell>{c.name}</TableCell><TableCell>{c.slug}</TableCell><TableCell>{c.sort_order}</TableCell></TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {/* Product Add/Edit Dialog */}
      <Dialog open={showForm} onClose={() => setShowForm(false)} maxWidth="sm" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>{editing ? 'Ürün Düzenle' : 'Yeni Ürün'}</DialogTitle>
        <DialogContent>
          <TextField fullWidth label="İsim" name="name" value={form.name} onChange={handleChange} sx={{ mt: 1, mb: 2 }} size="small" />
          <TextField fullWidth label="Açıklama" name="description" value={form.description} onChange={handleChange} sx={{ mb: 2 }} size="small" />
          <TextField fullWidth label="Fiyat (TL)" name="price" type="number" inputProps={{ step: '0.01' }} value={form.price} onChange={handleChange} sx={{ mb: 2 }} size="small" />
          <FormControl fullWidth size="small" sx={{ mb: 2 }}>
            <InputLabel>Kategori</InputLabel>
            <Select name="category_id" value={form.category_id} onChange={handleChange} label="Kategori">
              {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
            </Select>
          </FormControl>
          <TextField fullWidth label="Resim URL" name="image_url" value={form.image_url} onChange={handleChange} sx={{ mb: 1 }} size="small" />
          <Button variant="outlined" component="label" size="small" sx={{ mb: 1 }}>
            Resim Yükle
            <input type="file" accept="image/*" onChange={handleUpload} hidden />
          </Button>
          {form.image_url && <Box component="img" src={getImageUrl(form.image_url)} alt="" sx={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 2, ml: 1.5 }} />}
          <Box sx={{ mt: 1.5, mb: 1 }}>
            <FormControlLabel control={<Switch name="is_available" checked={form.is_available} onChange={e => setForm(f => ({ ...f, is_available: e.target.checked }))} />} label="Aktif" />
          </Box>
          <Typography variant="subtitle2" sx={{ fontWeight: 600, mb: 1 }}>Ekstralar</Typography>
          <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
            {extras.map(e => (
              <Chip key={e.id} label={`${e.name} (+${parseFloat(e.price).toFixed(2)})`}
                onClick={() => handleExtraToggle(e.id)}
                variant={form.extra_ids.includes(e.id) ? 'filled' : 'outlined'}
                sx={{ cursor: 'pointer', ...(form.extra_ids.includes(e.id) && { bgcolor: '#dbeafe', color: '#1e40af' }) }} />
            ))}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setShowForm(false)} sx={{ fontWeight: 600 }}>İptal</Button>
          <Button variant="contained" onClick={handleSubmit} sx={{ fontWeight: 600 }}>{editing ? 'Güncelle' : 'Ekle'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
