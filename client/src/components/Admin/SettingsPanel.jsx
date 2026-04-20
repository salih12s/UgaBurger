import { useState, useEffect, useRef } from 'react';
import api, { getImageUrl } from '../../api/api';
import toast from 'react-hot-toast';
import {
  Box, Typography, Card, TextField, Button, Switch, Stack, Checkbox, Slider,
  Accordion, AccordionSummary, AccordionDetails, Select, MenuItem, FormControlLabel, Fab,
  Table as MuiTable, TableHead, TableBody, TableRow, TableCell, IconButton, Chip
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import 'leaflet/dist/leaflet.css';

const DAYS = ['Pazartesi','Salı','Çarşamba','Perşembe','Cuma','Cumartesi','Pazar'];

const Section = ({ icon, title, children, defaultExpanded }) => (
  <Accordion defaultExpanded={defaultExpanded} sx={{ mb: 2, borderRadius: '12px !important', '&:before': { display: 'none' }, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
      <Typography sx={{ fontSize: 20, mr: 1.5 }}>{icon}</Typography>
      <Typography sx={{ fontWeight: 700, color: '#1e3a5f' }}>{title}</Typography>
    </AccordionSummary>
    <AccordionDetails sx={{ pt: 0 }}>{children}</AccordionDetails>
  </Accordion>
);

export default function SettingsPanel() {
  const [settings, setSettings] = useState({});
  const [loading, setLoading] = useState(false);
  const [mapCenter, setMapCenter] = useState({ lat: 36.8, lng: 34.63 });
  const [zones, setZones] = useState([]);
  const [contactMapVisible, setContactMapVisible] = useState(false);
  const [zoneMapVisible, setZoneMapVisible] = useState(false);
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);
  const markerRef = useRef(null);
  const zonesRef = useRef([]);
  const zoneMapRef = useRef(null);
  const zoneMapInstanceRef = useRef(null);
  const zoneMarkerRef = useRef(null);
  const zoneCirclesRef = useRef([]);
  const leafletRef = useRef(null);

  useEffect(() => { api.get('/admin/settings').then(res => setSettings(res.data)); }, []);

  // Tables
  const [tables, setTables] = useState([]);
  const [newTableNum, setNewTableNum] = useState('');
  const [newTableName, setNewTableName] = useState('');
  const fetchTables = () => api.get('/admin/tables').then(res => setTables(res.data));
  useEffect(() => { fetchTables(); }, []);

  const addTable = async () => {
    if (!newTableNum) return;
    try {
      await api.post('/admin/tables', { table_number: parseInt(newTableNum), table_name: newTableName || null });
      toast.success('Masa eklendi');
      setNewTableNum('');
      setNewTableName('');
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

  useEffect(() => {
    if (settings.delivery_zones) {
      try { setZones(JSON.parse(settings.delivery_zones)); } catch { setZones([]); }
    }
  }, [settings.delivery_zones]);

  // Promo codes
  const [promoCodes, setPromoCodes] = useState([]);
  const [newPromo, setNewPromo] = useState({ code: '', discount_type: 'percentage', discount_value: '', min_order_amount: '', max_uses: '', expires_at: '' });
  useEffect(() => { api.get('/admin/promo-codes').then(res => setPromoCodes(res.data)).catch(() => {}); }, []);

  const addPromo = async () => {
    if (!newPromo.code || !newPromo.discount_value) { toast.error('Kod ve indirim değeri gerekli'); return; }
    try {
      const res = await api.post('/admin/promo-codes', {
        ...newPromo,
        discount_value: parseFloat(newPromo.discount_value),
        min_order_amount: newPromo.min_order_amount ? parseFloat(newPromo.min_order_amount) : 0,
        max_uses: newPromo.max_uses ? parseInt(newPromo.max_uses) : null,
        expires_at: newPromo.expires_at || null,
      });
      setPromoCodes(prev => [res.data, ...prev]);
      setNewPromo({ code: '', discount_type: 'percentage', discount_value: '', min_order_amount: '', max_uses: '', expires_at: '' });
      toast.success('Promosyon kodu oluşturuldu');
    } catch (err) { toast.error(err.response?.data?.error || 'Hata'); }
  };

  const togglePromo = async (id, is_active) => {
    try {
      await api.put(`/admin/promo-codes/${id}`, { is_active: !is_active });
      setPromoCodes(prev => prev.map(p => p.id === id ? { ...p, is_active: !is_active } : p));
    } catch { toast.error('Hata'); }
  };

  const deletePromo = async (id) => {
    try {
      await api.delete(`/admin/promo-codes/${id}`);
      setPromoCodes(prev => prev.filter(p => p.id !== id));
      toast.success('Silindi');
    } catch { toast.error('Hata'); }
  };

  const s = (key, def = '') => settings[key] || def;
  const upd = (key, val) => setSettings(prev => ({ ...prev, [key]: val }));

  const saveAll = async () => {
    setLoading(true);
    const pairs = [
      ['min_order_amount', s('min_order_amount','1')],
      ['store_phone', s('store_phone')], ['store_address', s('store_address')],
      ['site_icon', s('site_icon','🍔')], ['site_name', s('site_name','MUSATTI BURGER')],
      ['closed_message', s('closed_message','Şuanda online sipariş hizmeti verilmemektedir.')],
      ['closed_banner_color', s('closed_banner_color','#427cf0')],
      ['closed_banner_icon', s('closed_banner_icon','❤️')],
      ['hero_title', s('hero_title','Taş Devrinden Gelen Lezzet')],
      ['hero_image', s('hero_image','')],
      ['hero_overlay', s('hero_overlay','60')],
      ['hero_text_color', s('hero_text_color','#FFFFFF')],
      ['hero_text_size', s('hero_text_size','medium')],
      ['receipt_title', s('receipt_title','MUSATTI BURGER')],
      ['receipt_footer', s('receipt_footer','Afiyet Olsun!')],
      ['receipt_font_size', s('receipt_font_size','medium')],
      ['receipt_show_date', s('receipt_show_date','true')],
      ['receipt_show_time', s('receipt_show_time','true')],
      ['receipt_show_order_no', s('receipt_show_order_no','true')],
      ['receipt_show_table', s('receipt_show_table','true')],
      ['receipt_show_prices', s('receipt_show_prices','true')],
      ['receipt_show_total', s('receipt_show_total','true')],
      ['receipt_silent_print', s('receipt_silent_print','false')],
      ['receipt_auto_print', s('receipt_auto_print','true')],
      ['contact_address', s('contact_address')], ['contact_phone', s('contact_phone')],
      ['contact_email', s('contact_email', 'bilgi@ugaburger.com')],
      ['contact_lat', s('contact_lat','36.807804')], ['contact_lng', s('contact_lng','34.637124')],
      ['online_order_active', s('online_order_active','true')],
      ['kvkk_text', s('kvkk_text')],
      ['privacy_text', s('privacy_text')],
      ['sales_agreement', s('sales_agreement')],
      ['delivery_zones', JSON.stringify(zones)],
    ];
    DAYS.forEach((d, i) => {
      pairs.push(['hours_' + i + '_open', s('hours_' + i + '_open', 'true')]);
      pairs.push(['hours_' + i + '_start', s('hours_' + i + '_start', '10:00')]);
      pairs.push(['hours_' + i + '_end', s('hours_' + i + '_end', '22:00')]);
    });
    try {
      for (const [k, v] of pairs) await api.put('/admin/settings', { key: k, value: String(v) });
      toast.success('Tüm ayarlar kaydedildi!');
    } catch { toast.error('Kaydetme hatası'); }
    setLoading(false);
  };

  // Map
  useEffect(() => {
    if (settings.contact_lat && settings.contact_lng) {
      setMapCenter({ lat: parseFloat(settings.contact_lat), lng: parseFloat(settings.contact_lng) });
    }
  }, [settings.contact_lat, settings.contact_lng]);

  // Leaflet yükle
  const loadLeaflet = async () => {
    if (leafletRef.current) return leafletRef.current;
    const L = await import('leaflet');
    delete L.Icon.Default.prototype._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
      iconUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
      shadowUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
    });
    leafletRef.current = L;
    return L;
  };

  const handleMapClick = (marker, latlng) => {
    marker.setLatLng(latlng);
    upd('contact_lat', String(latlng.lat));
    upd('contact_lng', String(latlng.lng));
    setMapCenter({ lat: latlng.lat, lng: latlng.lng });
  };

  // İletişim haritası
  const initMap = () => {
    setContactMapVisible(true);
    if (mapInstanceRef.current) {
      setTimeout(() => mapInstanceRef.current.invalidateSize(), 200);
      return;
    }
    setTimeout(async () => {
      if (!mapRef.current) return;
      const L = await loadLeaflet();
      const map = L.map(mapRef.current, { tap: false }).setView([mapCenter.lat, mapCenter.lng], 13);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OSM' }).addTo(map);
      const marker = L.marker([mapCenter.lat, mapCenter.lng], { draggable: true }).addTo(map);
      marker.on('dragend', () => handleMapClick(marker, marker.getLatLng()));
      map.on('click', (e) => handleMapClick(marker, e.latlng));
      mapInstanceRef.current = map;
      markerRef.current = marker;
      drawZoneCircles(L, map);
      setTimeout(() => map.invalidateSize(), 300);
    }, 200);
  };

  const ZONE_COLORS = ['#dc2626', '#f59e0b', '#3b82f6', '#16a34a', '#8b5cf6'];

  const drawZoneCircles = (L, map) => {
    zonesRef.current.forEach(c => map.removeLayer(c));
    zonesRef.current = [];
    zones.forEach((z, i) => {
      const c = L.circle([mapCenter.lat, mapCenter.lng], {
        radius: z.radius * 1000, color: ZONE_COLORS[i % ZONE_COLORS.length],
        fillColor: ZONE_COLORS[i % ZONE_COLORS.length], fillOpacity: 0.1, dashArray: '5,5'
      }).addTo(map);
      zonesRef.current.push(c);
    });
  };

  useEffect(() => {
    if (mapInstanceRef.current) {
      loadLeaflet().then(L => drawZoneCircles(L, mapInstanceRef.current));
    }
  }, [zones, mapCenter]);

  const addZone = () => setZones(prev => [...prev, { radius: (prev.length + 1) * 5, min_order: 100 }]);
  const removeZone = (i) => setZones(prev => prev.filter((_, idx) => idx !== i));
  const updateZone = (i, key, val) => setZones(prev => prev.map((z, idx) => idx === i ? { ...z, [key]: parseFloat(val) || 0 } : z));

  // Teslimat bölgeleri haritası
  const initZoneMap = () => {
    setZoneMapVisible(true);
    if (zoneMapInstanceRef.current) {
      setTimeout(() => zoneMapInstanceRef.current.invalidateSize(), 200);
      return;
    }
    setTimeout(async () => {
      if (!zoneMapRef.current) return;
      const L = await loadLeaflet();
      const map = L.map(zoneMapRef.current, { tap: false }).setView([mapCenter.lat, mapCenter.lng], 12);
      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { attribution: '© OSM' }).addTo(map);
      const marker = L.marker([mapCenter.lat, mapCenter.lng], { draggable: true }).addTo(map);
      marker.bindPopup('Restoran Konumu');
      marker.on('dragend', () => handleMapClick(marker, marker.getLatLng()));
      map.on('click', (e) => handleMapClick(marker, e.latlng));
      zoneMapInstanceRef.current = map;
      zoneMarkerRef.current = marker;
      drawZoneMapCircles(L, map);
      setTimeout(() => map.invalidateSize(), 300);
    }, 200);
  };

  const drawZoneMapCircles = (L, map) => {
    zoneCirclesRef.current.forEach(c => map.removeLayer(c));
    zoneCirclesRef.current = [];
    zones.forEach((z, i) => {
      const c = L.circle([mapCenter.lat, mapCenter.lng], {
        radius: z.radius * 1000, color: ZONE_COLORS[i % ZONE_COLORS.length],
        fillColor: ZONE_COLORS[i % ZONE_COLORS.length], fillOpacity: 0.1, dashArray: '5,5', weight: 2
      }).addTo(map);
      c.bindTooltip(`${i + 1}. Bölge: ${z.radius} km - Min. ${z.min_order} TL`, { permanent: false });
      zoneCirclesRef.current.push(c);
    });
    if (zones.length > 0) {
      const maxRadius = Math.max(...zones.map(z => z.radius));
      map.fitBounds(L.latLng(mapCenter.lat, mapCenter.lng).toBounds(maxRadius * 2000));
    }
  };

  useEffect(() => {
    if (zoneMapInstanceRef.current) {
      loadLeaflet().then(L => {
        zoneMarkerRef.current?.setLatLng([mapCenter.lat, mapCenter.lng]);
        drawZoneMapCircles(L, zoneMapInstanceRef.current);
      });
    }
  }, [zones, mapCenter]);

  const isOnline = s('online_order_active') === 'true';
  const receiptFontPx = { small: 12, medium: 14, large: 16 }[s('receipt_font_size', 'medium')] || 14;

  return (
    <Box sx={{ maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h5" sx={{ fontWeight: 800, mb: 3 }}>Ayarlar</Typography>

      {/* 1. Genel / Temel Ayarlar */}
      <Section icon="⚙️" title="Genel / Temel Ayarlar" defaultExpanded>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>Minimum Sipariş Tutarı</Typography>
            <TextField fullWidth size="small" type="number" value={s('min_order_amount', '1')} onChange={e => upd('min_order_amount', e.target.value)}
              InputProps={{ startAdornment: <Typography sx={{ mr: 1 }}>₺</Typography> }} />
          </Box>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>WhatsApp İşletme Numarası</Typography>
            <TextField fullWidth size="small" value={s('store_phone')} onChange={e => upd('store_phone', e.target.value)}
              InputProps={{ startAdornment: <Typography sx={{ mr: 1 }}>📱</Typography> }}
              helperText="Örn: 905321234567" />
          </Box>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>Site İkonu (Emoji)</Typography>
            <TextField fullWidth size="small" value={s('site_icon', '🍔')} onChange={e => upd('site_icon', e.target.value)} />
          </Box>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>Site İsmi (Header)</Typography>
            <TextField fullWidth size="small" value={s('site_name', 'MUSATTI BURGER')} onChange={e => upd('site_name', e.target.value)} />
          </Box>
        </Box>
      </Section>

      {/* Masa Yönetimi */}
      <Section icon="🪑" title="Masa Yönetimi">
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          <TextField size="small" type="number" placeholder="Masa No" value={newTableNum} onChange={e => setNewTableNum(e.target.value)} sx={{ width: 100 }} />
          <TextField size="small" placeholder="Masa İsmi (opsiyonel)" value={newTableName} onChange={e => setNewTableName(e.target.value)} sx={{ width: 180 }} />
          <Button variant="contained" startIcon={<AddIcon />} onClick={addTable} sx={{ fontWeight: 600 }}>Ekle</Button>
        </Stack>
        <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
          {tables.map(t => (
            <Chip key={t.id} label={t.table_name ? `${t.table_name} (${t.table_number})` : `Masa ${t.table_number}`}
              onDelete={() => deleteTable(t.id)} deleteIcon={<DeleteIcon fontSize="small" />} variant="outlined" />
          ))}
        </Stack>
      </Section>

      {/* 2. Restoran Kapanış Görünümü */}
      <Section icon="🔴" title="Restoran Kapanış Görünümü">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 2 }}>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>Kapalıyken Görünecek Mesaj</Typography>
            <TextField fullWidth size="small" value={s('closed_message', 'Şuanda online sipariş hizmeti verilmemektedir.')} onChange={e => upd('closed_message', e.target.value)} />
          </Box>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>Banner Rengi</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box component="input" type="color" value={s('closed_banner_color', '#427cf0')} onChange={e => upd('closed_banner_color', e.target.value)}
                sx={{ width: 40, height: 40, border: 'none', cursor: 'pointer', borderRadius: 1 }} />
              <TextField size="small" value={s('closed_banner_color', '#427cf0')} onChange={e => upd('closed_banner_color', e.target.value)} sx={{ flex: 1 }} />
            </Stack>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>Banner İkonu (Emoji)</Typography>
            <TextField fullWidth size="small" value={s('closed_banner_icon', '❤️')} onChange={e => upd('closed_banner_icon', e.target.value)} />
          </Box>
        </Box>
      </Section>

      {/* 3. Açılış Sayfası Tasarımı */}
      <Section icon="🏠" title="Açılış Sayfası Tasarımı">
        <Box>
          <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>Açılış Başlığı</Typography>
          <TextField fullWidth size="small" value={s('hero_title', 'Taş Devrinden Gelen Lezzet')} onChange={e => upd('hero_title', e.target.value)} sx={{ mb: 2 }} />
        </Box>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>Arka Plan Resmi</Typography>
            <Button variant="outlined" component="label" size="small" sx={{ mr: 1 }}>Dosya Seç
              <input type="file" hidden accept="image/*" onChange={async e => {
                const file = e.target.files[0]; if (!file) return;
                const fd = new FormData(); fd.append('image', file);
                try { const res = await api.post('/admin/upload', fd); upd('hero_image', res.data.url); toast.success('Yüklendi'); } catch { toast.error('Hata'); }
              }} />
            </Button>
            <Typography variant="caption" color="text.secondary">{s('hero_image') ? 'Mevcut: ' + s('hero_image').split('/').pop() : 'Dosya seçilmedi'}</Typography>
            <Typography variant="caption" display="block" color="primary">Yüksek çözünürlüklü yatay fotoğraf önerilir. (Mevcut: {s('hero_image') ? 'Var' : 'Yok'})</Typography>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>Karartma Oranı {s('hero_overlay', '60')}%</Typography>
            <Slider value={parseInt(s('hero_overlay', '60'))} onChange={(e, v) => upd('hero_overlay', String(v))} min={0} max={100} sx={{ color: '#3b82f6' }} />
          </Box>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>Yazı Rengi</Typography>
            <Stack direction="row" spacing={1} alignItems="center">
              <Box component="input" type="color" value={s('hero_text_color', '#FFFFFF')} onChange={e => upd('hero_text_color', e.target.value)}
                sx={{ width: 40, height: 40, border: 'none', cursor: 'pointer', borderRadius: 1 }} />
              <TextField size="small" value={s('hero_text_color', '#FFFFFF')} onChange={e => upd('hero_text_color', e.target.value)} sx={{ flex: 1 }} />
            </Stack>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>Yazı Boyutu</Typography>
            <Select fullWidth size="small" value={s('hero_text_size', 'medium')} onChange={e => upd('hero_text_size', e.target.value)}>
              <MenuItem value="small">Küçük</MenuItem>
              <MenuItem value="medium">Orta</MenuItem>
              <MenuItem value="large">Büyük</MenuItem>
            </Select>
          </Box>
        </Box>
      </Section>

      {/* 4. Yazıcı Ayarları */}
      <Section icon="🖨️" title="Yazıcı Ayarları (Mutfak)">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' }, gap: 3 }}>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>Fiş Başlığı</Typography>
            <TextField fullWidth size="small" value={s('receipt_title', 'MUSATTI BURGER')} onChange={e => upd('receipt_title', e.target.value)} sx={{ mb: 2 }} />
            <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>Alt Not (Footer)</Typography>
            <TextField fullWidth size="small" multiline rows={2} value={s('receipt_footer', 'Afiyet Olsun!')} onChange={e => upd('receipt_footer', e.target.value)} sx={{ mb: 2 }} />
            <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>Yazı Boyutu</Typography>
            <Select fullWidth size="small" value={s('receipt_font_size', 'medium')} onChange={e => upd('receipt_font_size', e.target.value)} sx={{ mb: 2 }}>
              <MenuItem value="small">Küçük (12px)</MenuItem>
              <MenuItem value="medium">Orta (14px)</MenuItem>
              <MenuItem value="large">Büyük (16px)</MenuItem>
            </Select>

            <Box sx={{ p: 2, bgcolor: '#f0f9ff', borderRadius: 2, border: '1px solid #bae6fd', mb: 2 }}>
              <FormControlLabel
                control={<Switch checked={s('receipt_silent_print', 'false') === 'true'} onChange={e => upd('receipt_silent_print', e.target.checked ? 'true' : 'false')}
                  sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#3b82f6' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#3b82f6' } }} />}
                label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Sessiz Yazdırma (Yazıcı Penceresi Gösterme)</Typography>} />
              <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
                Bu özellik için tarayıcınızı <strong>--kiosk-printing</strong> parametresiyle başlatmanız gerekir.
                Chrome kısayoluna sağ tıklayıp Özellikler'den Hedef kısmına <code> --kiosk-printing</code> ekleyin.
                Bu sayede yazdırma penceresi açılmadan direkt yazıcıya gönderilir.
              </Typography>
            </Box>

            <FormControlLabel
              control={<Switch checked={s('receipt_auto_print', 'true') === 'true'} onChange={e => upd('receipt_auto_print', e.target.checked ? 'true' : 'false')}
                sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#16a34a' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#16a34a' } }} />}
              label={<Typography variant="body2" sx={{ fontWeight: 700 }}>Sipariş Onayında Otomatik Yazdır</Typography>} sx={{ mb: 1 }} />
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', ml: 4, mb: 2 }}>
              Kapalıysa, sipariş onaylandığında fiş otomatik yazdırılmaz. Manuel olarak 🖨️ butonuyla yazdırabilirsiniz.
            </Typography>

            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1 }}>
              {[['receipt_show_date', 'Tarih Göster'], ['receipt_show_time', 'Saat Göster'], ['receipt_show_order_no', 'Sipariş No'], ['receipt_show_table', 'Masa Bilgisi'], ['receipt_show_prices', 'Ürün Fiyatları'], ['receipt_show_total', 'Toplam Tutar']].map(([k, label]) => (
                <FormControlLabel key={k} control={<Checkbox checked={s(k, 'true') === 'true'} onChange={e => upd(k, e.target.checked ? 'true' : 'false')} size="small" />}
                  label={<Typography variant="body2" sx={{ fontWeight: 600 }}>{label}</Typography>} />
              ))}
            </Box>
          </Box>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, textAlign: 'center', display: 'block', mb: 1 }}>CANLI ÖNİZLEME (80MM)</Typography>
            <Card variant="outlined" sx={{ p: 2, fontFamily: 'Courier New, monospace', fontSize: receiptFontPx, maxWidth: 300, mx: 'auto', bgcolor: '#fff' }}>
              <Box sx={{ textAlign: 'center', fontWeight: 700, fontSize: receiptFontPx + 6, mb: 0.3 }}>{s('receipt_title', 'MUSATTI BURGER')}</Box>
              <Box sx={{ borderTop: '1px dashed #000', my: 0.5 }} />
              {s('receipt_show_order_no', 'true') === 'true' && <Box sx={{ textAlign: 'center', fontWeight: 700, fontSize: receiptFontPx + 2 }}>#1024</Box>}
              {s('receipt_show_date', 'true') === 'true' && <Box sx={{ textAlign: 'center', fontSize: receiptFontPx - 2 }}>30.01.2026{s('receipt_show_time', 'true') === 'true' ? ' 14:30' : ''}</Box>}
              {s('receipt_show_table', 'true') === 'true' && (<><Box sx={{ borderTop: '1px dashed #000', my: 0.5 }} /><Box sx={{ fontSize: receiptFontPx - 1 }}>MASA: BAHÇE-4</Box></>)}
              <Box sx={{ fontSize: receiptFontPx - 1 }}>Müşteri: Ahmet Yılmaz</Box>
              <Box sx={{ fontSize: receiptFontPx - 1 }}>Tel: 05321234567</Box>
              <Box sx={{ borderTop: '1px dashed #000', my: 0.5 }} />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography sx={{ fontSize: receiptFontPx }}>2x Cheeseburger</Typography>{s('receipt_show_prices', 'true') === 'true' && <Typography sx={{ fontSize: receiptFontPx }}>120.00 TL</Typography>}</Box>
              <Typography sx={{ fontSize: receiptFontPx - 2, pl: 1 }}>+ Ekstra Peynir</Typography>
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography sx={{ fontSize: receiptFontPx }}>1x Kola (330ml)</Typography>{s('receipt_show_prices', 'true') === 'true' && <Typography sx={{ fontSize: receiptFontPx }}>15.00 TL</Typography>}</Box>
              <Box sx={{ borderTop: '1px dashed #000', my: 0.5 }} />
              {s('receipt_show_total', 'true') === 'true' && (<><Box sx={{ display: 'flex', justifyContent: 'space-between' }}><Typography sx={{ fontSize: receiptFontPx + 4, fontWeight: 700 }}>TOPLAM:</Typography><Typography sx={{ fontSize: receiptFontPx + 4, fontWeight: 700 }}>135.00 TL</Typography></Box><Box sx={{ borderTop: '1px dashed #000', my: 0.5 }} /></>)}
              <Box sx={{ textAlign: 'center', fontSize: receiptFontPx - 2 }}>Ödeme: Nakit</Box>
              <Box sx={{ textAlign: 'center', fontSize: receiptFontPx - 2 }}>Not: Acılı olsun</Box>
              <Box sx={{ borderTop: '1px dashed #000', my: 0.5 }} />
              <Box sx={{ textAlign: 'center', fontSize: receiptFontPx - 2, mt: 0.5 }}>{s('receipt_footer', 'Afiyet Olsun!')}</Box>
              <Box sx={{ textAlign: 'center', fontSize: receiptFontPx - 3, mt: 0.3 }}>--- SON ---</Box>
            </Card>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', textAlign: 'center', mt: 1 }}>* Kağıt genişliğine göre görüntü değişebilir.</Typography>
          </Box>
        </Box>
      </Section>

      {/* 5. İletişim & Konum */}
      <Section icon="📍" title="İletişim &amp; Konum">
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2, mb: 2 }}>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>Adres Metni</Typography>
            <TextField fullWidth size="small" multiline rows={2} value={s('contact_address')} onChange={e => upd('contact_address', e.target.value)} />
          </Box>
          <Box>
            <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>İletişim Telefonu</Typography>
            <TextField fullWidth size="small" value={s('contact_phone', s('store_phone'))} onChange={e => upd('contact_phone', e.target.value)}
              InputProps={{ startAdornment: <Typography sx={{ mr: 1 }}>📞</Typography> }} />
            <Box sx={{ mt: 1.5 }}>
              <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>İletişim E-postası</Typography>
              <TextField fullWidth size="small" value={s('contact_email', 'bilgi@ugaburger.com')} onChange={e => upd('contact_email', e.target.value)}
                InputProps={{ startAdornment: <Typography sx={{ mr: 1 }}>✉️</Typography> }} />
            </Box>
            <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1, mt: 1.5 }}>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>Enlem (Lat)</Typography>
                <TextField fullWidth size="small" value={s('contact_lat', '36.807804')} onChange={e => upd('contact_lat', e.target.value)} />
              </Box>
              <Box>
                <Typography variant="caption" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>Boylam (Lng)</Typography>
                <TextField fullWidth size="small" value={s('contact_lng', '34.637124')} onChange={e => upd('contact_lng', e.target.value)} />
              </Box>
            </Box>
            <Button fullWidth variant="outlined" size="small" sx={{ mt: 1.5, color: '#3b82f6' }} onClick={initMap}>📍 Haritadan Seç</Button>
          </Box>
        </Box>
        {contactMapVisible && <Box ref={mapRef} sx={{ height: 300, borderRadius: 2, border: '1px solid #eee', mt: 2, touchAction: 'none' }} />}
      </Section>

      {/* 6. Teslimat Bölgeleri (Kademe) */}
      <Section icon="🚩" title="Teslimat Bölgeleri (Kademe)">
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
          Restoranın konumunu merkez alarak teslimat bölgeleri tanımlayın. Her bölge için minimum sipariş tutarı belirleyin.
          Bölge dışındaki konumlara teslimat yapılmaz.
        </Typography>
        {zones.map((z, i) => {
          const colors = ['#dc2626', '#f59e0b', '#3b82f6', '#16a34a', '#8b5cf6'];
          return (
          <Stack key={i} direction="row" spacing={2} alignItems="center" sx={{ mb: 1.5, p: 1.5, bgcolor: '#f9fafb', borderRadius: 2, borderLeft: `4px solid ${colors[i % colors.length]}` }}>
            <Typography sx={{ fontWeight: 700, minWidth: 90 }}>{i + 1}. Bölge</Typography>
            <TextField size="small" type="number" label="Yarıçap (km)" value={z.radius} onChange={e => updateZone(i, 'radius', e.target.value)} sx={{ width: 130 }} />
            <TextField size="small" type="number" label="Min. Sepet (TL)" value={z.min_order} onChange={e => updateZone(i, 'min_order', e.target.value)} sx={{ width: 140 }} />
            <Button size="small" color="error" onClick={() => removeZone(i)}>×</Button>
          </Stack>
          );
        })}
        <Stack direction="row" spacing={1} sx={{ mt: 1, mb: 2 }}>
          <Button variant="outlined" size="small" onClick={addZone}>+ Bölge Ekle</Button>
          <Button variant="outlined" size="small" onClick={initZoneMap} sx={{ color: '#3b82f6' }}>📍 Haritada Göster</Button>
        </Stack>
        {zoneMapVisible && <Box ref={zoneMapRef} sx={{ height: 350, borderRadius: 2, border: '1px solid #eee', touchAction: 'none' }} />}
        {zones.length === 0 && (
          <Box sx={{ p: 2, bgcolor: '#fef3c7', borderRadius: 2, border: '1px solid #fde68a', mt: 1 }}>
            <Typography variant="caption" sx={{ color: '#92400e', fontWeight: 600 }}>
              ⚠️ Henüz teslimat bölgesi tanımlanmadı. Bölge eklemezseniz müşteriler her konumdan sipariş verebilir ve genel minimum sipariş tutarı uygulanır.
            </Typography>
          </Box>
        )}
      </Section>

      {/* 7. Çalışma Saatleri */}
      <Section icon="🕒" title="Çalışma Saatleri (Haftalık Plan)">
        <Box sx={{ overflowX: 'auto' }}>
          <Stack direction="row" sx={{ minWidth: 500, mb: 1, pb: 1, borderBottom: '2px solid #eee' }}>
            <Typography sx={{ fontWeight: 700, width: 120, color: '#64748b', fontSize: 12, textTransform: 'uppercase' }}>GÜN</Typography>
            <Typography sx={{ fontWeight: 700, width: 120, color: '#64748b', fontSize: 12, textTransform: 'uppercase' }}>DURUM</Typography>
            <Typography sx={{ fontWeight: 700, width: 160, color: '#64748b', fontSize: 12, textTransform: 'uppercase' }}>AÇILIŞ</Typography>
            <Typography sx={{ fontWeight: 700, width: 160, color: '#64748b', fontSize: 12, textTransform: 'uppercase' }}>KAPANIŞ</Typography>
          </Stack>
          {DAYS.map((day, i) => (
            <Stack key={i} direction="row" alignItems="center" sx={{ minWidth: 500, py: 1, borderBottom: '1px solid #f0f0f0' }}>
              <Typography sx={{ width: 120, fontWeight: 600 }}>{day}</Typography>
              <Stack direction="row" alignItems="center" spacing={1} sx={{ width: 120 }}>
                <Switch size="small" checked={s('hours_' + i + '_open', 'true') === 'true'} onChange={e => upd('hours_' + i + '_open', e.target.checked ? 'true' : 'false')}
                  sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#16a34a' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#16a34a' } }} />
                <Typography variant="body2" sx={{ color: s('hours_' + i + '_open', 'true') === 'true' ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                  {s('hours_' + i + '_open', 'true') === 'true' ? 'Açık' : 'Kapalı'}
                </Typography>
              </Stack>
              <Box sx={{ width: 160 }}>
                <TextField size="small" type="time" value={s('hours_' + i + '_start', '10:00')} onChange={e => upd('hours_' + i + '_start', e.target.value)}
                  disabled={s('hours_' + i + '_open', 'true') !== 'true'} sx={{ width: 130 }} />
              </Box>
              <Box sx={{ width: 160 }}>
                <TextField size="small" type="time" value={s('hours_' + i + '_end', '22:00')} onChange={e => upd('hours_' + i + '_end', e.target.value)}
                  disabled={s('hours_' + i + '_open', 'true') !== 'true'} sx={{ width: 130 }} />
              </Box>
            </Stack>
          ))}
        </Box>
      </Section>

      {/* 8. Online Sipariş Durumu */}
      <Section icon="⚡" title="Online Sipariş Durumu">
        <Stack direction="row" justifyContent="space-between" alignItems="center">
          <Box sx={{ flex: 1, mr: 2 }}>
            <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>Sipariş Alımı</Typography>
            <Typography variant="body2" color="text.secondary">Bu ayar kapatıldığında, çalışma saatleri açık olsa bile restoran &quot;Kapalı&quot; olarak görünecektir. Acil durumlar veya yoğunluk anında kullanabilirsiniz.</Typography>
          </Box>
          <Stack direction="row" alignItems="center" spacing={1}>
            <Switch checked={isOnline} onChange={() => upd('online_order_active', isOnline ? 'false' : 'true')}
              sx={{ '& .MuiSwitch-switchBase.Mui-checked': { color: '#16a34a' }, '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': { bgcolor: '#16a34a' } }} />
            <Typography variant="body2" sx={{ fontWeight: 700, color: isOnline ? '#16a34a' : '#dc2626', minWidth: 120 }}>
              {isOnline ? 'AÇIK' : 'KAPALI (Sipariş Durduruldu)'}
            </Typography>
          </Stack>
        </Stack>
      </Section>

      {/* 9. Promosyon Kodları */}
      <Section icon="🎟️" title="Promosyon Kodları">
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Müşterilerin sipariş sırasında kullanabileceği indirim kodları oluşturun.</Typography>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr 1fr' }, gap: 1.5, mb: 2, p: 2, bgcolor: '#f9fafb', borderRadius: 2 }}>
          <TextField size="small" label="Kod" value={newPromo.code} onChange={e => setNewPromo(p => ({ ...p, code: e.target.value.toUpperCase() }))} placeholder="YENI10" />
          <Select size="small" value={newPromo.discount_type} onChange={e => setNewPromo(p => ({ ...p, discount_type: e.target.value }))}>
            <MenuItem value="percentage">Yüzde (%)</MenuItem>
            <MenuItem value="fixed">Sabit (TL)</MenuItem>
          </Select>
          <TextField size="small" label={newPromo.discount_type === 'percentage' ? 'İndirim (%)' : 'İndirim (TL)'} type="number" value={newPromo.discount_value} onChange={e => setNewPromo(p => ({ ...p, discount_value: e.target.value }))} />
          <TextField size="small" label="Min. Sipariş (TL)" type="number" value={newPromo.min_order_amount} onChange={e => setNewPromo(p => ({ ...p, min_order_amount: e.target.value }))} />
          <TextField size="small" label="Maks. Kullanım" type="number" value={newPromo.max_uses} onChange={e => setNewPromo(p => ({ ...p, max_uses: e.target.value }))} helperText="Boş = sınırsız" />
          <TextField size="small" label="Son Kullanma" type="date" value={newPromo.expires_at} onChange={e => setNewPromo(p => ({ ...p, expires_at: e.target.value }))} InputLabelProps={{ shrink: true }} helperText="Boş = süresiz" />
        </Box>
        <Button variant="contained" size="small" onClick={addPromo} sx={{ mb: 2, fontWeight: 700 }}>+ Kod Oluştur</Button>

        {promoCodes.length > 0 && (
          <MuiTable size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: '#f8f8f8', fontSize: 12 } }}>
                <TableCell>Kod</TableCell>
                <TableCell>İndirim</TableCell>
                <TableCell>Min. Sipariş</TableCell>
                <TableCell>Kullanım</TableCell>
                <TableCell>Son Kullanma</TableCell>
                <TableCell>Durum</TableCell>
                <TableCell></TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {promoCodes.map(p => (
                <TableRow key={p.id} hover>
                  <TableCell sx={{ fontWeight: 700 }}>{p.code}</TableCell>
                  <TableCell>{p.discount_type === 'percentage' ? `%${parseFloat(p.discount_value)}` : `${parseFloat(p.discount_value).toFixed(2)} TL`}</TableCell>
                  <TableCell>{parseFloat(p.min_order_amount || 0).toFixed(2)} TL</TableCell>
                  <TableCell>{p.used_count}{p.max_uses ? `/${p.max_uses}` : ''}</TableCell>
                  <TableCell>{p.expires_at ? new Date(p.expires_at).toLocaleDateString('tr-TR') : 'Süresiz'}</TableCell>
                  <TableCell>
                    <Chip label={p.is_active ? 'Aktif' : 'Pasif'} size="small" onClick={() => togglePromo(p.id, p.is_active)}
                      sx={{ fontWeight: 600, fontSize: 11, cursor: 'pointer', bgcolor: p.is_active ? '#dcfce7' : '#fee2e2', color: p.is_active ? '#16a34a' : '#dc2626' }} />
                  </TableCell>
                  <TableCell>
                    <IconButton size="small" color="error" onClick={() => deletePromo(p.id)}><DeleteIcon fontSize="small" /></IconButton>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </MuiTable>
        )}
      </Section>

      {/* 10. KVKK & Hukuki Metinler */}
      <Section icon="📜" title="KVKK &amp; Hukuki Metinler">
        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>Kayıt ve ödeme sırasında kullanıcılara gösterilecek yasal metinler.</Typography>
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>✅ KVKK AYDINLATMA METNİ</Typography>
        <TextField fullWidth multiline rows={6} size="small" value={s('kvkk_text', 'Veri Sorumlusu:\nAhment Muhittin Ark ve Ulaş Kantarcı Adi Ortaklığı\nAdres: Uga Burger, İnönü Mah. No:2, Yenişehir / Mersin\nE-posta: bilgi@ugaburger.com')} onChange={e => upd('kvkk_text', e.target.value)} sx={{ mb: 2 }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>✅ GİZLİLİK POLİTİKASI</Typography>
        <TextField fullWidth multiline rows={4} size="small" value={s('privacy_text', 'Uga Burger, kullanıcı bilgilerinin gizliliğini korur.')} onChange={e => upd('privacy_text', e.target.value)} sx={{ mb: 2 }} />
        <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 0.5 }}>✅ MESAFELİ SATIŞ SÖZLEŞMESİ</Typography>
        <TextField fullWidth multiline rows={4} size="small" value={s('sales_agreement', 'Satıcı: Ahment Muhittin Ark ve Ulaş Kantarcı Adi Ortaklığı\nAdres: Uga Burger, İnönü Mah. No:2, Yenişehir / Mersin')} onChange={e => upd('sales_agreement', e.target.value)} sx={{ mb: 2 }} />
      </Section>

      {/* Save All FAB */}
      <Fab variant="extended" color="primary" onClick={saveAll} disabled={loading}
        sx={{ position: 'fixed', bottom: 24, right: 24, fontWeight: 700, zIndex: 1000, px: 3 }}>
        💾 Tüm Ayarları Kaydet
      </Fab>
    </Box>
  );
}
