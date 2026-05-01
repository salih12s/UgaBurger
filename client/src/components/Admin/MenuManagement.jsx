import { useState, useEffect } from 'react';
import api, { getImageUrl } from '../../api/api';
import toast from 'react-hot-toast';
import {
  Box, Typography, Button, Card, Stack, TextField, Chip, Checkbox, FormControlLabel,
  Table, TableHead, TableBody, TableRow, TableCell, IconButton,
  Dialog, DialogTitle, DialogContent, DialogActions,
  FormControl, InputLabel, Select, MenuItem, Switch, Avatar
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';

export default function MenuManagement() {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [extras, setExtras] = useState([]);
  const [optionGroups, setOptionGroups] = useState([]);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name: '', description: '', price: '', category_id: '', image_url: '', is_available: true, is_suggested: false, is_online_sale: true, is_quick_order: true, extra_ids: [], option_group_ids: [] });
  const [tab, setTab] = useState('products');

  // Opsiyon grubu düzenleme state'i
  const [showOptionForm, setShowOptionForm] = useState(false);
  const [editingOption, setEditingOption] = useState(null);
  const [optionForm, setOptionForm] = useState({ name: '', multi_select: false, min_select: 1, max_select: 1, is_available: true, items: [], attached_product_ids: [] });
  // "Opsiyonlu Menü" modu: opsiyon grubu oluştururken aynı zamanda otomatik bir menü ürünü de yaratılır
  const [menuMode, setMenuMode] = useState(false);
  const [menuMeta, setMenuMeta] = useState({ price: '', category_id: '', image_url: '', description: '' });
  // Menü düzenleme bölümleri: her bölüm = 1 OptionGroup (kategoriye göre)
  const [menuSections, setMenuSections] = useState([]);
  // Menü düzenlemede mevcut ama arık kullanılmayan opsiyon gruplarını silmek için
  const [originalGroupIds, setOriginalGroupIds] = useState([]);
  // Menü düzenlerken bağlı ürün id'sini tutar
  const [editingMenuProductId, setEditingMenuProductId] = useState(null);

  const [extraForm, setExtraForm] = useState({ name: '', price: '' });
  const [editingExtra, setEditingExtra] = useState(null);
  const [catForm, setCatForm] = useState({ name: '', slug: '', sort_order: 0 });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [selectedProducts, setSelectedProducts] = useState([]);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = () => {
    api.get('/admin/products').then(res => setProducts(res.data));
    api.get('/categories').then(res => setCategories(res.data));
    api.get('/admin/extras').then(res => setExtras(res.data));
    api.get('/admin/option-groups').then(res => setOptionGroups(res.data)).catch(() => setOptionGroups([]));
    api.get('/admin/settings').then(res => {
      const rec = res.data.recommended_products;
      if (rec) setSelectedProducts(rec.split(',').map(Number).filter(Boolean));
    });
  };

  const toggleRecommended = (id) => setSelectedProducts(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);

  const saveRecommended = async () => {
    try {
      await api.put('/admin/settings', { key: 'recommended_products', value: selectedProducts.join(',') });
      toast.success('Önerilen ürünler kaydedildi!');
    } catch { toast.error('Kaydetme hatası'); }
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
    setForm({
      name: product.name,
      description: product.description || '',
      price: product.price,
      category_id: product.category_id,
      image_url: product.image_url || '',
      is_available: product.is_available,
      is_suggested: product.is_suggested || false,
      is_online_sale: product.is_online_sale !== false,
      is_quick_order: product.is_quick_order !== false,
      extra_ids: product.extras ? product.extras.map(e => e.id) : [],
      option_group_ids: product.optionGroups ? product.optionGroups.map(g => g.id) : [],
    });
    setShowForm(true);
  };

  const openNew = () => {
    setEditing(null);
    setForm({ name: '', description: '', price: '', category_id: categories[0]?.id || '', image_url: '', is_available: true, is_suggested: false, is_online_sale: true, is_quick_order: true, extra_ids: [], option_group_ids: [] });
    setShowForm(true);
  };

  const handleOptionGroupToggle = (id) => {
    setForm(f => ({
      ...f,
      option_group_ids: f.option_group_ids.includes(id) ? f.option_group_ids.filter(x => x !== id) : [...f.option_group_ids, id]
    }));
  };

  // --- OPTION GROUP HANDLERS ---
  const openNewOption = () => {
    setEditingOption(null);
    setMenuMode(false);
    setMenuMeta({ price: '', category_id: '', image_url: '', description: '' });
    setOptionForm({ name: '', multi_select: false, min_select: 1, max_select: 1, is_available: true, items: [], attached_product_ids: [] });
    setShowOptionForm(true);
  };

  const openNewMenuOption = () => {
    setEditingOption(null);
    setEditingMenuProductId(null);
    setOriginalGroupIds([]);
    setMenuMode(true);
    setMenuMeta({ price: '', category_id: categories[0]?.id || '', image_url: '', description: '' });
    setOptionForm({ name: '', multi_select: false, min_select: 1, max_select: 1, is_available: true, items: [], attached_product_ids: [] });
    setMenuSections([]);
    setShowOptionForm(true);
  };

  // Mevcut bir menü ürününü (opsiyon grupları olan) menü modunda düzenle
  const openEditMenuProduct = (p) => {
    setMenuMode(true);
    setEditingOption(null);
    setEditingMenuProductId(p.id);
    setMenuMeta({
      price: p.price,
      category_id: p.category_id,
      image_url: p.image_url || '',
      description: p.description || '',
    });
    setOptionForm({ name: p.name, multi_select: false, min_select: 1, max_select: 1, is_available: true, items: [], attached_product_ids: [] });
    const sections = (p.optionGroups || []).map(g => {
      const firstCat = g.items?.[0]?.product?.category_id || categories[0]?.id || '';
      return {
        id: g.id,
        category_id: firstCat,
        multi_select: !!g.multi_select,
        min_select: g.min_select ?? 1,
        max_select: g.max_select ?? 1,
        items: (g.items || []).map(it => ({ product_id: it.product_id, additional_price: parseFloat(it.additional_price) || 0 })),
      };
    });
    setMenuSections(sections);
    setOriginalGroupIds(sections.map(s => s.id).filter(Boolean));
    setShowOptionForm(true);
  };

  const editProduct = (p) => {
    if (p.optionGroups && p.optionGroups.length > 0) openEditMenuProduct(p);
    else openEdit(p);
  };

  const addMenuSection = () => {
    setMenuSections(s => [...s, { category_id: categories[0]?.id || '', multi_select: false, min_select: 1, max_select: 1, items: [] }]);
  };
  const removeMenuSection = (idx) => {
    setMenuSections(s => s.filter((_, i) => i !== idx));
  };
  const updateMenuSection = (idx, patch) => {
    setMenuSections(s => s.map((sec, i) => i === idx ? { ...sec, ...patch } : sec));
  };
  const toggleMenuSectionItem = (idx, productId) => {
    setMenuSections(s => s.map((sec, i) => {
      if (i !== idx) return sec;
      const exists = sec.items.find(it => it.product_id === productId);
      return { ...sec, items: exists ? sec.items.filter(it => it.product_id !== productId) : [...sec.items, { product_id: productId, additional_price: 0 }] };
    }));
  };
  const updateMenuSectionPrice = (idx, productId, price) => {
    setMenuSections(s => s.map((sec, i) => i === idx
      ? { ...sec, items: sec.items.map(it => it.product_id === productId ? { ...it, additional_price: price } : it) }
      : sec));
  };

  const openEditOption = (g) => {
    setEditingOption(g.id);
    setMenuMode(false);
    setMenuMeta({ price: '', category_id: '', image_url: '', description: '' });
    setOptionForm({
      name: g.name,
      multi_select: !!g.multi_select,
      min_select: g.min_select ?? 1,
      max_select: g.max_select ?? 1,
      is_available: g.is_available !== false,
      items: (g.items || []).map(it => ({ product_id: it.product_id, additional_price: parseFloat(it.additional_price) || 0 })),
      attached_product_ids: (g.attachedProducts || []).map(p => p.id),
    });
    setShowOptionForm(true);
  };

  const toggleOptionItem = (productId) => {
    setOptionForm(f => {
      const exists = f.items.find(i => i.product_id === productId);
      return {
        ...f,
        items: exists ? f.items.filter(i => i.product_id !== productId) : [...f.items, { product_id: productId, additional_price: 0 }],
      };
    });
  };

  const updateOptionItemPrice = (productId, price) => {
    setOptionForm(f => ({
      ...f,
      items: f.items.map(i => i.product_id === productId ? { ...i, additional_price: price } : i),
    }));
  };

  const toggleAttachedProduct = (productId) => {
    setOptionForm(f => ({
      ...f,
      attached_product_ids: f.attached_product_ids.includes(productId)
        ? f.attached_product_ids.filter(x => x !== productId)
        : [...f.attached_product_ids, productId],
    }));
  };

  const handleOptionSubmit = async () => {
    if (!optionForm.name.trim()) { toast.error(menuMode ? 'Menü adı zorunlu' : 'Opsiyon adı zorunlu'); return; }

    // ---- MENÜ MODU ----
    if (menuMode) {
      if (!menuMeta.price || !menuMeta.category_id) { toast.error('Menü fiyatı ve kategori zorunlu'); return; }
      if (menuSections.length === 0) { toast.error('En az 1 bölüm ekleyin (örn. Burger Seçimi)'); return; }
      for (const sec of menuSections) {
        if (!sec.category_id) { toast.error('Her bölüm için kategori seçin'); return; }
        if (sec.items.length === 0) { toast.error('Her bölümde en az 1 ürün seçin'); return; }
      }
      try {
        let pid = editingMenuProductId;
        const productPayload = {
          name: optionForm.name,
          description: menuMeta.description || '',
          price: parseFloat(menuMeta.price) || 0,
          category_id: parseInt(menuMeta.category_id),
          image_url: menuMeta.image_url || '',
          is_available: true,
          is_online_sale: true,
          is_quick_order: true,
          extra_ids: [],
        };
        if (pid) {
          await api.put(`/admin/products/${pid}`, productPayload);
        } else {
          const created = await api.post('/admin/products', { ...productPayload, option_group_ids: [] });
          pid = created.data.id;
        }

        // Bölümleri opsiyon grubu olarak senkronla
        const usedIds = [];
        for (const sec of menuSections) {
          const cat = categories.find(c => c.id === parseInt(sec.category_id));
          const groupName = cat ? cat.name : 'Seçim';
          const payload = {
            name: groupName,
            multi_select: !!sec.multi_select,
            min_select: parseInt(sec.min_select) || 0,
            max_select: parseInt(sec.max_select) || 1,
            is_available: true,
            items: sec.items.map(it => ({ product_id: it.product_id, additional_price: parseFloat(it.additional_price) || 0 })),
            attached_product_ids: [pid],
          };
          if (sec.id) {
            await api.put(`/admin/option-groups/${sec.id}`, payload);
            usedIds.push(sec.id);
          } else {
            const created = await api.post('/admin/option-groups', payload);
            usedIds.push(created.data.id);
          }
        }
        // Kullanılmayan eski grupları sil
        for (const oldId of originalGroupIds) {
          if (!usedIds.includes(oldId)) {
            try { await api.delete(`/admin/option-groups/${oldId}`); } catch { /* yoksay */ }
          }
        }

        toast.success(editingMenuProductId ? 'Menü güncellendi' : 'Menü oluşturuldu');
        setShowOptionForm(false);
        setMenuMode(false);
        setEditingMenuProductId(null);
        setOriginalGroupIds([]);
        fetchAll();
      } catch (err) { toast.error(err.response?.data?.error || 'Hata'); }
      return;
    }

    // ---- KLASİK OPSİYON MODU (Opsiyonlar sekmesi) ----
    if (optionForm.items.length === 0) { toast.error('En az 1 ürün seçin'); return; }
    try {
      const payload = {
        ...optionForm,
        min_select: parseInt(optionForm.min_select) || 1,
        max_select: parseInt(optionForm.max_select) || 1,
      };
      if (editingOption) { await api.put(`/admin/option-groups/${editingOption}`, payload); toast.success('Opsiyon güncellendi'); }
      else { await api.post('/admin/option-groups', payload); toast.success('Opsiyon eklendi'); }
      setShowOptionForm(false);
      fetchAll();
    } catch (err) { toast.error(err.response?.data?.error || 'Hata'); }
  };

  const handleOptionDelete = async (id) => {
    try { await api.delete(`/admin/option-groups/${id}`); toast.success('Opsiyon silindi'); fetchAll(); }
    catch { toast.error('Hata'); }
  };

  const toggleOptionAvailable = async (g) => {
    try {
      await api.put(`/admin/option-groups/${g.id}`, { is_available: !g.is_available });
      fetchAll();
    } catch { toast.error('Hata'); }
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
    try { await api.delete(`/admin/products/${id}`); toast.success('Ürün silindi'); fetchAll(); } catch { toast.error('Hata'); }
  };

  const handleCatDelete = async (id) => {
    try { await api.delete(`/admin/categories/${id}`); toast.success('Kategori silindi'); fetchAll(); } catch (err) { toast.error(err.response?.data?.error || 'Hata'); }
  };

  const handleExtraDelete = async (id) => {
    try { await api.delete(`/admin/extras/${id}`); toast.success('Ekstra silindi'); fetchAll(); } catch { toast.error('Hata'); }
  };

  const confirmDelete = () => {
    if (!deleteConfirm) return;
    const { type, id } = deleteConfirm;
    if (type === 'product') handleDelete(id);
    else if (type === 'category') handleCatDelete(id);
    else if (type === 'extra') handleExtraDelete(id);
    setDeleteConfirm(null);
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
          <Chip label="Opsiyonlar" onClick={() => setTab('options')} variant={tab === 'options' ? 'filled' : 'outlined'}
            sx={{ fontWeight: 600, ...(tab === 'options' && { bgcolor: '#dc2626', color: '#fff' }) }} />
          <Chip label="Kategoriler" onClick={() => setTab('categories')} variant={tab === 'categories' ? 'filled' : 'outlined'}
            sx={{ fontWeight: 600, ...(tab === 'categories' && { bgcolor: '#dc2626', color: '#fff' }) }} />
          <Chip label="Önerilen" onClick={() => setTab('recommended')} variant={tab === 'recommended' ? 'filled' : 'outlined'}
            sx={{ fontWeight: 600, ...(tab === 'recommended' && { bgcolor: '#dc2626', color: '#fff' }) }} />
        </Stack>
      </Stack>

      {tab === 'products' && (
        <>
          <Stack direction="row" spacing={1} sx={{ mb: 2, flexWrap: 'wrap', gap: 1 }}>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openNew} sx={{ fontWeight: 600 }}>Yeni Ürün Ekle</Button>
            <Button variant="contained" startIcon={<AddIcon />} onClick={openNewMenuOption}
              sx={{ fontWeight: 600, bgcolor: '#16a34a', '&:hover': { bgcolor: '#15803d' } }}>
              Opsiyonlu Menü Ekle
            </Button>
          </Stack>
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
                      <Stack direction="row" spacing={0.5} sx={{ flexWrap: 'wrap', gap: 0.5 }}>
                        <Chip label={p.is_available ? 'Aktif' : 'Pasif'} size="small"
                          sx={{ bgcolor: p.is_available ? '#dcfce7' : '#fee2e2', color: p.is_available ? '#16a34a' : '#dc2626', fontWeight: 600 }} />
                        <Chip label={p.is_online_sale !== false ? 'Online' : 'Online Kapalı'} size="small"
                          sx={{ bgcolor: p.is_online_sale !== false ? '#dcfce7' : '#f3f4f6', color: p.is_online_sale !== false ? '#16a34a' : '#6b7280', fontWeight: 600 }} />
                        <Chip label={p.is_quick_order !== false ? 'Hızlı' : 'Hızlı Kapalı'} size="small"
                          sx={{ bgcolor: p.is_quick_order !== false ? '#dbeafe' : '#f3f4f6', color: p.is_quick_order !== false ? '#1e40af' : '#6b7280', fontWeight: 600 }} />
                      </Stack>
                    </TableCell>
                    <TableCell>
                      <Stack direction="row" spacing={0.5}>
                        <IconButton size="small" color="primary" onClick={() => editProduct(p)}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => setDeleteConfirm({ type: 'product', id: p.id, name: p.name })}><DeleteIcon fontSize="small" /></IconButton>
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
                      <IconButton size="small" color="error" onClick={() => setDeleteConfirm({ type: 'extra', id: e.id, name: e.name })}><DeleteIcon fontSize="small" /></IconButton>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {tab === 'options' && (
        <Card sx={{ p: 2.5 }}>
          <Button variant="contained" startIcon={<AddIcon />} onClick={openNewOption} sx={{ mb: 2, fontWeight: 600, bgcolor: '#dc2626', '&:hover': { bgcolor: '#b91c1c' } }}>Yeni Opsiyon Ekle</Button>
          <Box sx={{ overflowX: 'auto' }}>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: '#f8f8f8' } }}>
                  <TableCell>Opsiyon Adı</TableCell>
                  <TableCell>Opsiyon İçerisindeki Ürünler</TableCell>
                  <TableCell>Bağlı Olduğu Ürünler</TableCell>
                  <TableCell>Min-Max Adet</TableCell>
                  <TableCell align="center">İşlemler</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {optionGroups.length === 0 && (
                  <TableRow><TableCell colSpan={5}><Typography variant="body2" color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>Henüz opsiyon grubu yok</Typography></TableCell></TableRow>
                )}
                {optionGroups.map(g => (
                  <TableRow key={g.id} hover>
                    <TableCell sx={{ fontWeight: 600 }}>{g.name}</TableCell>
                    <TableCell sx={{ maxWidth: 280, fontSize: 13 }}>{(g.items || []).map(i => i.product?.name).filter(Boolean).join(', ') || '-'}</TableCell>
                    <TableCell sx={{ maxWidth: 220, fontSize: 13 }}>{(g.attachedProducts || []).map(p => p.name).join(', ') || '-'}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{g.min_select} - {g.max_select}</TableCell>
                    <TableCell align="center">
                      <Stack direction="row" spacing={0.5} alignItems="center" justifyContent="center">
                        <Chip label={g.is_available ? 'Satışa Açık' : 'Kapalı'} size="small" onClick={() => toggleOptionAvailable(g)}
                          sx={{ cursor: 'pointer', bgcolor: g.is_available ? '#dcfce7' : '#fee2e2', color: g.is_available ? '#16a34a' : '#dc2626', fontWeight: 600 }} />
                        <IconButton size="small" color="primary" onClick={() => openEditOption(g)}><EditIcon fontSize="small" /></IconButton>
                        <IconButton size="small" color="error" onClick={() => handleOptionDelete(g.id)}><DeleteIcon fontSize="small" /></IconButton>
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
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
            <TableHead><TableRow sx={{ '& th': { fontWeight: 700, bgcolor: '#f8f8f8' } }}><TableCell>İsim</TableCell><TableCell>Slug</TableCell><TableCell>Sıra</TableCell><TableCell>İşlem</TableCell></TableRow></TableHead>
            <TableBody>
              {categories.map(c => (
                <TableRow key={c.id} hover>
                  <TableCell>{c.name}</TableCell>
                  <TableCell>{c.slug}</TableCell>
                  <TableCell>{c.sort_order}</TableCell>
                  <TableCell>
                    <IconButton size="small" color="error" onClick={() => setDeleteConfirm({ type: 'category', id: c.id, name: c.name })}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Card>
      )}

      {tab === 'recommended' && (
        <Card sx={{ p: 2.5 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>Sipariş ekranında önerilecek ürünleri seçin</Typography>
          <Box sx={{ maxHeight: 400, overflowY: 'auto', mb: 2 }}>
            {products.map(p => (
              <Stack key={p.id} direction="row" alignItems="center" spacing={1.5}
                onClick={() => toggleRecommended(p.id)}
                sx={{ p: 1, borderRadius: 2, cursor: 'pointer', mb: 0.5, '&:hover': { bgcolor: '#f5f5f5' },
                  ...(selectedProducts.includes(p.id) && { bgcolor: '#fef2f2', border: '1px solid #fca5a5' }) }}>
                <Checkbox checked={selectedProducts.includes(p.id)} size="small" sx={{ p: 0, color: '#dc2626', '&.Mui-checked': { color: '#dc2626' } }} />
                {p.image_url ? <Avatar src={getImageUrl(p.image_url)} variant="rounded" sx={{ width: 32, height: 32 }} /> : <Avatar variant="rounded" sx={{ width: 32, height: 32, bgcolor: '#f0f0f0', fontSize: 14 }}>🍔</Avatar>}
                <Box sx={{ flex: 1 }}><Typography variant="body2" sx={{ fontWeight: 600 }}>{p.name}</Typography></Box>
                <Typography variant="body2" sx={{ fontWeight: 600 }}>{parseFloat(p.price).toFixed(2)} ₺</Typography>
              </Stack>
            ))}
          </Box>
          <Button variant="contained" onClick={saveRecommended} sx={{ fontWeight: 700 }}>💾 Önerileri Kaydet</Button>
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
          <Box sx={{ mt: 1.5, mb: 1, display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
            <FormControlLabel control={<Switch name="is_available" checked={form.is_available} onChange={e => setForm(f => ({ ...f, is_available: e.target.checked }))} />} label="Aktif" />
            <FormControlLabel control={<Checkbox checked={form.is_suggested || false} onChange={e => setForm(f => ({ ...f, is_suggested: e.target.checked }))} />} label="Sepette Önerilenlerde Göster" />
            <FormControlLabel
              control={<Switch checked={form.is_online_sale !== false} onChange={e => setForm(f => ({ ...f, is_online_sale: e.target.checked }))} sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#16a34a' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#16a34a' } }} />}
              label={form.is_online_sale !== false ? 'Online Satışta Göster' : 'Online Satışta Gösterme'}
            />
            <FormControlLabel
              control={<Switch checked={form.is_quick_order !== false} onChange={e => setForm(f => ({ ...f, is_quick_order: e.target.checked }))} sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#3b82f6' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#3b82f6' } }} />}
              label={form.is_quick_order !== false ? 'Hızlı Siparişte Göster' : 'Hızlı Siparişte Gösterme'}
            />
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
          {optionGroups.length > 0 && (
            <>
              <Typography variant="subtitle2" sx={{ fontWeight: 600, mt: 2, mb: 0.5 }}>Opsiyon Grupları</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Bu ürüne ekleyeceğiniz opsiyon gruplarını seçin. Müşteri ürünü açınca bu gruplar otomatik görünür.
              </Typography>
              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                {optionGroups.map(g => (
                  <Chip key={g.id} label={g.name}
                    onClick={() => handleOptionGroupToggle(g.id)}
                    variant={form.option_group_ids.includes(g.id) ? 'filled' : 'outlined'}
                    sx={{ cursor: 'pointer', ...(form.option_group_ids.includes(g.id) && { bgcolor: '#fef3c7', color: '#92400e' }) }} />
                ))}
              </Stack>
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setShowForm(false)} sx={{ fontWeight: 600 }}>İptal</Button>
          <Button variant="contained" onClick={handleSubmit} sx={{ fontWeight: 600 }}>{editing ? 'Güncelle' : 'Ekle'}</Button>
        </DialogActions>
      </Dialog>

      {/* Opsiyon Grubu Düzenle Dialog */}
      <Dialog open={showOptionForm} onClose={() => setShowOptionForm(false)} maxWidth="md" fullWidth PaperProps={{ sx: { borderRadius: 4 } }}>
        <DialogTitle sx={{ fontWeight: 800 }}>
          {menuMode ? (editingMenuProductId ? 'Menü Düzenle' : 'Opsiyonlu Menü Ekle') : (editingOption ? 'Opsiyon Düzenle' : 'Yeni Opsiyon')}
        </DialogTitle>
        <DialogContent dividers>
          <TextField fullWidth label={menuMode ? 'Menü Adı (örn. İkili Menü)' : 'Opsiyon Adı'} value={optionForm.name} onChange={e => setOptionForm(f => ({ ...f, name: e.target.value }))} sx={{ mb: 2 }} size="small" />

          {menuMode && (
            <Box sx={{ p: 1.5, bgcolor: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 2, mb: 2 }}>
              <Typography variant="caption" sx={{ color: '#166534', fontWeight: 600, display: 'block', mb: 1.25 }}>
                {editingMenuProductId
                  ? 'Bu menü ürününü ve bölümlerini buradan düzenleyebilirsiniz.'
                  : 'Bu form hem yeni bir menü ürünü oluşturur hem de seçilen bölümleri (kategorileri) opsiyon grubu olarak otomatik ekler.'}
              </Typography>
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mb: 1.25 }}>
                <TextField size="small" label="Menü Fiyatı (₺)" type="number" value={menuMeta.price}
                  onChange={e => setMenuMeta(m => ({ ...m, price: e.target.value }))}
                  inputProps={{ step: '0.01', min: 0 }} sx={{ flex: 1 }} />
                <FormControl size="small" sx={{ flex: 1 }}>
                  <InputLabel>Kategori</InputLabel>
                  <Select label="Kategori" value={menuMeta.category_id}
                    onChange={e => setMenuMeta(m => ({ ...m, category_id: e.target.value }))}>
                    {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                  </Select>
                </FormControl>
              </Stack>
              <TextField fullWidth size="small" label="Açıklama" value={menuMeta.description}
                onChange={e => setMenuMeta(m => ({ ...m, description: e.target.value }))} sx={{ mb: 1.25 }} multiline minRows={2} />
              <Stack direction="row" alignItems="center" spacing={1.5}>
                {menuMeta.image_url
                  ? <Avatar src={getImageUrl(menuMeta.image_url)} variant="rounded" sx={{ width: 56, height: 56 }} />
                  : <Avatar variant="rounded" sx={{ width: 56, height: 56, bgcolor: '#e5e7eb', fontSize: 22 }}>🍔</Avatar>}
                <Button component="label" size="small" variant="outlined" sx={{ fontWeight: 600 }}>
                  Resim Yükle
                  <input hidden type="file" accept="image/*" onChange={async (e) => {
                    const file = e.target.files[0]; if (!file) return;
                    const fd = new FormData(); fd.append('image', file);
                    try { const res = await api.post('/admin/upload', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
                      setMenuMeta(m => ({ ...m, image_url: res.data.url })); toast.success('Resim yüklendi');
                    } catch { toast.error('Yükleme hatası'); }
                  }} />
                </Button>
              </Stack>
            </Box>
          )}

          {menuMode ? (
            <>
              <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mt: 1, mb: 1 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Bölümler (Kategorilere Göre Seçim)</Typography>
                <Button size="small" startIcon={<AddIcon />} variant="outlined" onClick={addMenuSection} sx={{ fontWeight: 600 }}>Bölüm Ekle</Button>
              </Stack>
              {menuSections.length === 0 && (
                <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 2 }}>
                  Örn. "Burger Seçimi" (Et Burger kategorisi, min 2, max 2) ve "İçecek Seçimi" (İçecek kategorisi, min 1, max 1) gibi bölümler ekleyin.
                </Typography>
              )}
              {menuSections.map((sec, idx) => {
                const sectionProducts = products.filter(p => p.id !== editingMenuProductId && parseInt(p.category_id) === parseInt(sec.category_id));
                const cat = categories.find(c => c.id === parseInt(sec.category_id));
                return (
                  <Box key={idx} sx={{ p: 1.5, mb: 1.5, border: '1px solid #e5e7eb', borderRadius: 2, bgcolor: '#fafafa' }}>
                    <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                      <Typography variant="body2" sx={{ fontWeight: 700, flex: 1 }}>Bölüm {idx + 1} {cat ? `— ${cat.name}` : ''}</Typography>
                      <IconButton size="small" color="error" onClick={() => removeMenuSection(idx)}><DeleteIcon fontSize="small" /></IconButton>
                    </Stack>
                    <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.25} sx={{ mb: 1 }}>
                      <FormControl size="small" sx={{ flex: 2 }}>
                        <InputLabel>Kategori</InputLabel>
                        <Select label="Kategori" value={sec.category_id}
                          onChange={e => updateMenuSection(idx, { category_id: e.target.value, items: [] })}>
                          {categories.map(c => <MenuItem key={c.id} value={c.id}>{c.name}</MenuItem>)}
                        </Select>
                      </FormControl>
                      <TextField size="small" type="number" label="Min Adet" value={sec.min_select}
                        onChange={e => updateMenuSection(idx, { min_select: e.target.value })}
                        inputProps={{ min: 0 }} sx={{ flex: 1 }} />
                      <TextField size="small" type="number" label="Max Adet" value={sec.max_select}
                        onChange={e => updateMenuSection(idx, { max_select: e.target.value })}
                        inputProps={{ min: 1 }} sx={{ flex: 1 }} />
                    </Stack>
                    <FormControlLabel
                      control={<Checkbox size="small" checked={sec.multi_select}
                        onChange={e => updateMenuSection(idx, { multi_select: e.target.checked })} />}
                      label="Birden fazla seçilebilir (aynı bölümde)"
                      sx={{ mb: 0.5 }}
                    />
                    <Box sx={{ maxHeight: 220, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 1.5, p: 0.5, bgcolor: '#fff' }}>
                      {sectionProducts.length === 0 && (
                        <Typography variant="caption" color="text.secondary" sx={{ p: 1, display: 'block' }}>Bu kategoride ürün yok.</Typography>
                      )}
                      {sectionProducts.map(p => {
                        const item = sec.items.find(it => it.product_id === p.id);
                        const checked = !!item;
                        return (
                          <Stack key={p.id} direction="row" alignItems="center" spacing={1.25} sx={{ p: 0.5, borderBottom: '1px solid #f1f5f9' }}>
                            <Checkbox size="small" checked={checked} onChange={() => toggleMenuSectionItem(idx, p.id)} sx={{ p: 0.5, color: '#dc2626', '&.Mui-checked': { color: '#dc2626' } }} />
                            {p.image_url ? <Avatar src={getImageUrl(p.image_url)} variant="rounded" sx={{ width: 28, height: 28 }} /> : <Avatar variant="rounded" sx={{ width: 28, height: 28, bgcolor: '#f0f0f0', fontSize: 12 }}>🍔</Avatar>}
                            <Typography variant="body2" sx={{ flex: 1, fontWeight: 500 }}>{p.name}</Typography>
                            <TextField size="small" type="number" label="Ek Fiyat" disabled={!checked}
                              value={item?.additional_price ?? 0}
                              onChange={e => updateMenuSectionPrice(idx, p.id, parseFloat(e.target.value) || 0)}
                              inputProps={{ step: '0.01', min: 0 }} sx={{ width: 110 }} />
                          </Stack>
                        );
                      })}
                    </Box>
                  </Box>
                );
              })}
            </>
          ) : (
            <>
              <FormControlLabel
                control={<Checkbox checked={optionForm.multi_select} onChange={e => setOptionForm(f => ({ ...f, multi_select: e.target.checked }))} />}
                label="Birden fazla ürün seçilebilir."
                sx={{ mb: 1 }}
              />

              <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
                <TextField type="number" label="En Az Seçilebilir Adet" size="small" value={optionForm.min_select} onChange={e => setOptionForm(f => ({ ...f, min_select: e.target.value }))} sx={{ flex: 1 }} inputProps={{ min: 0 }} />
                <TextField type="number" label="En Fazla Seçilebilir Adet" size="small" value={optionForm.max_select} onChange={e => setOptionForm(f => ({ ...f, max_select: e.target.value }))} sx={{ flex: 1 }} inputProps={{ min: 1 }} />
              </Stack>

              <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1, mb: 1 }}>Ürün Seçimi (Opsiyon İçerisindeki Ürünler)</Typography>
              <Box sx={{ maxHeight: 260, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 2, p: 1, mb: 2 }}>
                {categories.map(cat => {
                  const catProducts = products.filter(p => parseInt(p.category_id) === cat.id);
                  if (catProducts.length === 0) return null;
                  return (
                    <Box key={cat.id} sx={{ mb: 1 }}>
                      <Typography variant="caption" sx={{ fontWeight: 700, color: '#6b7280', textTransform: 'uppercase', display: 'block', mt: 0.5 }}>{cat.name}</Typography>
                      {catProducts.map(p => {
                        const item = optionForm.items.find(i => i.product_id === p.id);
                        const checked = !!item;
                        return (
                          <Stack key={p.id} direction="row" alignItems="center" spacing={1.5} sx={{ p: 0.5, borderBottom: '1px solid #f1f5f9' }}>
                            <Checkbox checked={checked} onChange={() => toggleOptionItem(p.id)} sx={{ p: 0.5, color: '#dc2626', '&.Mui-checked': { color: '#dc2626' } }} />
                            {p.image_url ? <Avatar src={getImageUrl(p.image_url)} variant="rounded" sx={{ width: 32, height: 32 }} /> : <Avatar variant="rounded" sx={{ width: 32, height: 32, bgcolor: '#f0f0f0', fontSize: 14 }}>🍔</Avatar>}
                            <Box sx={{ flex: 1 }}>
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>{p.name}</Typography>
                            </Box>
                            <TextField
                              size="small" type="number" label="Ek Fiyat (₺)" disabled={!checked}
                              value={item?.additional_price ?? 0}
                              onChange={e => updateOptionItemPrice(p.id, parseFloat(e.target.value) || 0)}
                              inputProps={{ step: '0.01', min: 0 }}
                              sx={{ width: 130 }}
                            />
                          </Stack>
                        );
                      })}
                    </Box>
                  );
                })}
              </Box>

              <Typography variant="subtitle2" sx={{ fontWeight: 700, mt: 1, mb: 1 }}>Bağlı Olduğu Ürünler</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1 }}>
                Bu opsiyon grubu, seçilen ürünlerin sipariş sayfasında otomatik olarak gösterilecek.
              </Typography>
              <Box sx={{ maxHeight: 200, overflowY: 'auto', border: '1px solid #e5e7eb', borderRadius: 2, p: 1 }}>
                {products.map(p => (
                  <Stack key={`a-${p.id}`} direction="row" alignItems="center" spacing={1} sx={{ p: 0.5 }}>
                    <Checkbox
                      checked={optionForm.attached_product_ids.includes(p.id)}
                      onChange={() => toggleAttachedProduct(p.id)}
                      size="small" sx={{ p: 0.5, color: '#16a34a', '&.Mui-checked': { color: '#16a34a' } }}
                    />
                    <Typography variant="body2">{p.name}</Typography>
                  </Stack>
                ))}
              </Box>

              <FormControlLabel
                sx={{ mt: 2 }}
                control={<Switch checked={optionForm.is_available} onChange={e => setOptionForm(f => ({ ...f, is_available: e.target.checked }))} />}
                label="Satışa Açık"
              />
            </>
          )}
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2.5 }}>
          <Button onClick={() => setShowOptionForm(false)} sx={{ fontWeight: 600 }}>İptal</Button>
          <Button variant="contained" onClick={handleOptionSubmit} sx={{ fontWeight: 600, bgcolor: '#dc2626', '&:hover': { bgcolor: '#b91c1c' } }}>
            {menuMode ? (editingMenuProductId ? 'Menüyü Güncelle' : 'Menüyü Oluştur') : (editingOption ? 'Güncelle' : 'Ekle')}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Silme Onay Dialogı */}
      <Dialog open={!!deleteConfirm} onClose={() => setDeleteConfirm(null)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 700, color: '#dc2626' }}>Silme Onayı</DialogTitle>
        <DialogContent>
          <Typography variant="body1" sx={{ mt: 1 }}>
            <b>"{deleteConfirm?.name}"</b> {deleteConfirm?.type === 'product' ? 'ürününü' : deleteConfirm?.type === 'category' ? 'kategorisini' : 'ekstrasını'} silmek istediğinize emin misiniz?
          </Typography>
          <Typography variant="body2" color="error" sx={{ mt: 1 }}>Bu işlem geri alınamaz.</Typography>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setDeleteConfirm(null)} variant="outlined" sx={{ fontWeight: 600 }}>Vazgeç</Button>
          <Button onClick={confirmDelete} variant="contained" color="error" sx={{ fontWeight: 600 }}>Evet, Sil</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
