import { useState, useEffect, useRef, useCallback } from 'react';
import {
  Dialog, DialogContent, Box, Typography, Button, TextField, Stack, IconButton,
  Chip, CircularProgress, Autocomplete
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import MyLocationIcon from '@mui/icons-material/MyLocation';
import HomeIcon from '@mui/icons-material/Home';
import WorkIcon from '@mui/icons-material/Work';
import LocationOnIcon from '@mui/icons-material/LocationOn';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import api from '../../api/api';
import toast from 'react-hot-toast';

// Haversine mesafe hesaplama (km)
const haversineDistance = (lat1, lon1, lat2, lon2) => {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
};

// Leaflet default marker icon fix
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png',
});

// Haritada tıklayınca konum seç
function LocationPicker({ position, setPosition }) {
  useMapEvents({
    click(e) {
      setPosition([e.latlng.lat, e.latlng.lng]);
    },
  });
  return position ? <Marker position={position} /> : null;
}

// Haritayı konuma götür
function FlyToLocation({ position }) {
  const map = useMap();
  useEffect(() => {
    if (position) map.flyTo(position, 16);
  }, [position, map]);
  return null;
}

export default function AddressFormDialog({ open, onClose, onSave, editAddress }) {
  const [addrTitle, setAddrTitle] = useState('Ev');
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [street, setStreet] = useState('');
  const [buildingName, setBuildingName] = useState('');
  const [buildingNo, setBuildingNo] = useState('');
  const [floor, setFloor] = useState('');
  const [doorNo, setDoorNo] = useState('');
  const [description, setDescription] = useState('');
  const [phone, setPhone] = useState('');
  const [position, setPosition] = useState(null);
  const [locating, setLocating] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [storeSettings, setStoreSettings] = useState({});
  const [zoneInfo, setZoneInfo] = useState(null);
  const [cities, setCities] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [neighborhoods, setNeighborhoods] = useState([]);
  const skipReverseGeocode = useRef(false);
  const mapRef = useRef(null);

  // Ayarları çek
  useEffect(() => { api.get('/settings').then(res => setStoreSettings(res.data)); }, []);

  // İlleri çek (turkiyeapi.dev)
  useEffect(() => {
    fetch('https://api.turkiyeapi.dev/v1/provinces?fields=name')
      .then(r => r.json())
      .then(data => setCities((data.data || []).map(p => p.name).sort((a, b) => a.localeCompare(b, 'tr'))))
      .catch(() => {});
  }, []);

  // İl değişince ilçeleri çek
  useEffect(() => {
    if (!city) { setDistricts([]); return; }
    fetch(`https://api.turkiyeapi.dev/v1/districts?province=${encodeURIComponent(city)}&fields=name`)
      .then(r => r.json())
      .then(data => {
        setDistricts((data.data || []).map(d => d.name).sort((a, b) => a.localeCompare(b, 'tr')));
      })
      .catch(() => setDistricts([]));
  }, [city]);

  // İlçe değişince mahalleleri çek
  useEffect(() => {
    if (!city || !district) { setNeighborhoods([]); return; }
    fetch(`https://api.turkiyeapi.dev/v1/neighborhoods?province=${encodeURIComponent(city)}&district=${encodeURIComponent(district)}&fields=name`)
      .then(r => r.json())
      .then(data => {
        setNeighborhoods((data.data || []).map(n => n.name).sort((a, b) => a.localeCompare(b, 'tr')));
      })
      .catch(() => setNeighborhoods([]));
  }, [city, district]);



  // Konum değişince bölge kontrolü yap
  useEffect(() => {
    if (!position || !storeSettings.contact_lat || !storeSettings.contact_lng) return;
    const zones = storeSettings.delivery_zones ? JSON.parse(storeSettings.delivery_zones) : [];
    if (zones.length === 0) { setZoneInfo(null); return; }
    const dist = haversineDistance(position[0], position[1], parseFloat(storeSettings.contact_lat), parseFloat(storeSettings.contact_lng));
    const sortedZones = [...zones].sort((a, b) => a.radius - b.radius);
    const matched = sortedZones.find(z => dist <= z.radius);
    if (matched) {
      const idx = zones.indexOf(matched);
      setZoneInfo({ zone: idx + 1, min_order: matched.min_order, distance: dist.toFixed(1) });
    } else {
      setZoneInfo({ outside: true, distance: dist.toFixed(1) });
    }
  }, [position, storeSettings]);

  // Forward geocoding: dropdown seçiminde haritayı güncelle
  const forwardGeocode = useCallback((cityVal, districtVal, neighborhoodVal) => {
    if (!cityVal || !districtVal) return;
    const q = [neighborhoodVal, districtVal, cityVal, 'Turkey'].filter(Boolean).join(' ');
    fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(q)}&limit=1&accept-language=tr`)
      .then(r => r.json())
      .then(data => {
        if (data?.[0]) {
          skipReverseGeocode.current = true;
          setPosition([parseFloat(data[0].lat), parseFloat(data[0].lon)]);
        }
      })
      .catch(() => {});
  }, []);

  // Reverse geocoding: koordinattan il/ilçe/mahalle/sokak otomatik doldur
  const reverseGeocode = useCallback(async (lat, lng) => {
    setGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1&accept-language=tr`
      );
      const data = await res.json();
      if (data?.address) {
        const a = data.address;
        setCity(a.province || a.state || a.city || '');
        setDistrict(a.town || a.county || a.city_district || a.district || '');
        setNeighborhood(a.neighbourhood || a.suburb || a.quarter || '');
        setStreet(a.road || a.pedestrian || a.street || '');
      }
    } catch {} finally {
      setGeocoding(false);
    }
  }, []);

  // Konum değişince reverse geocoding yap (harita tıklama / GPS)
  useEffect(() => {
    if (position) {
      if (skipReverseGeocode.current) {
        skipReverseGeocode.current = false;
        return;
      }
      reverseGeocode(position[0], position[1]);
    }
  }, [position, reverseGeocode]);

  const getCurrentLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setPosition([pos.coords.latitude, pos.coords.longitude]);
        setLocating(false);
      },
      () => {
        // Varsayılan: Mersin merkez
        setPosition([36.8121, 34.6415]);
        setLocating(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  // Edit modunda doldur, yeni adres ise konum al
  useEffect(() => {
    if (editAddress) {
      setAddrTitle(editAddress.title || 'Ev');
      setCity(editAddress.city || '');
      setDistrict(editAddress.district || '');
      setNeighborhood(editAddress.neighborhood || '');
      setStreet(editAddress.street || '');
      setBuildingName(editAddress.buildingName || '');
      setBuildingNo(editAddress.buildingNo || '');
      setFloor(editAddress.floor || '');
      setDoorNo(editAddress.doorNo || '');
      setDescription(editAddress.description || '');
      setPhone(editAddress.phone || '');
      if (editAddress.lat && editAddress.lng) {
        setPosition([editAddress.lat, editAddress.lng]);
      }
    } else {
      getCurrentLocation();
    }
  }, [editAddress, open]);

  const buildAddressString = () => {
    const parts = [];
    if (neighborhood) parts.push(neighborhood + ' Mah.');
    if (street) parts.push(street);
    if (buildingName) parts.push(buildingName);
    if (buildingNo) parts.push('No:' + buildingNo);
    if (floor) parts.push('Kat:' + floor);
    if (doorNo) parts.push('D:' + doorNo);
    if (district) parts.push(district);
    if (city) parts.push(city);
    return parts.join(' ');
  };

  const handleSave = () => {
    if (zoneInfo?.outside) {
      toast.error('Bu konuma teslimat yapılamamaktadır. Lütfen teslimat bölgesi içinde bir konum seçin.');
      return;
    }
    if (!city.trim()) { toast.error('İl seçiniz'); return; }
    if (!district.trim()) { toast.error('İlçe seçiniz'); return; }
    if (!neighborhood.trim()) { toast.error('Mahalle seçiniz'); return; }
    if (!street.trim()) { toast.error('Cadde/Sokak giriniz'); return; }
    if (!phone.trim()) { toast.error('Telefon numarası zorunludur'); return; }

    const addressData = {
      title: addrTitle,
      address: buildAddressString(),
      city, district, neighborhood, street,
      buildingName, buildingNo, floor, doorNo,
      description, phone,
      lat: position?.[0] || null,
      lng: position?.[1] || null,
    };
    onSave(addressData);
  };

  const titleIcons = { 'Ev': <HomeIcon />, 'İş': <WorkIcon />, 'Diğer': <LocationOnIcon /> };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 4, maxHeight: '95vh' } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, pb: 0 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          {editAddress ? 'Adresi Düzenle' : 'Yeni Adres Ekle'}
        </Typography>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </Box>

      <DialogContent sx={{ pt: 1 }}>
        {/* Harita */}
        <Box sx={{ mb: 2, borderRadius: 3, overflow: 'hidden', border: '2px solid #e5e7eb', position: 'relative' }}>
          <Box sx={{ height: 200, width: '100%' }}>
            {position ? (
              <MapContainer
                center={position}
                zoom={16}
                style={{ height: '100%', width: '100%' }}
                ref={mapRef}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <LocationPicker position={position} setPosition={setPosition} />
                <FlyToLocation position={position} />
              </MapContainer>
            ) : (
              <Box sx={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f3f4f6' }}>
                {locating ? <CircularProgress size={32} /> : <Typography color="text.secondary">Konum yükleniyor...</Typography>}
              </Box>
            )}
          </Box>
          <Button
            startIcon={locating ? <CircularProgress size={16} /> : <MyLocationIcon />}
            onClick={getCurrentLocation}
            disabled={locating}
            size="small"
            sx={{
              position: 'absolute', bottom: 8, right: 8, zIndex: 1000,
              bgcolor: '#fff', color: '#3b82f6', fontWeight: 600, fontSize: 12,
              boxShadow: 2, '&:hover': { bgcolor: '#eff6ff' },
            }}
          >
            Konumum
          </Button>
        </Box>
        {geocoding && (
          <Typography variant="caption" sx={{ color: '#3b82f6', fontWeight: 600, display: 'block', mt: 0.5, textAlign: 'center' }}>
            📍 Adres bilgileri haritadan yükleniyor...
          </Typography>
        )}
        {!geocoding && position && city && !zoneInfo?.outside && (
          <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 500, display: 'block', mt: 0.5, textAlign: 'center' }}>
            ✅ Haritadan tıklayarak konumu değiştirebilirsiniz
          </Typography>
        )}
        {zoneInfo && !zoneInfo.outside && (
          <Box sx={{ mt: 1, p: 1.2, bgcolor: '#f0fdf4', borderRadius: 2, border: '1px solid #bbf7d0', textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: '#16a34a', fontWeight: 700 }}>
              ✅ {zoneInfo.zone}. Bölge — Min. Sipariş: {zoneInfo.min_order} TL ({zoneInfo.distance} km)
            </Typography>
          </Box>
        )}
        {zoneInfo?.outside && (
          <Box sx={{ mt: 1, p: 1.2, bgcolor: '#fef2f2', borderRadius: 2, border: '1px solid #fecaca', textAlign: 'center' }}>
            <Typography variant="caption" sx={{ color: '#dc2626', fontWeight: 700 }}>
              ❌ Bu konuma teslimat yapılamamaktadır ({zoneInfo.distance} km)
            </Typography>
            <Typography variant="caption" sx={{ color: '#dc2626', display: 'block', mt: 0.3 }}>
              Lütfen haritadan teslimat bölgesi içinde bir konum seçin.
            </Typography>
          </Box>
        )}

        {/* Adres Başlığı */}
        <Typography variant="caption" color="text.secondary" sx={{ fontWeight: 600, mb: 0.5, display: 'block' }}>Adres Başlığı *</Typography>
        <Stack direction="row" spacing={1} sx={{ mb: 2 }}>
          {['Ev', 'İş', 'Diğer'].map(t => (
            <Chip
              key={t}
              icon={titleIcons[t]}
              label={t}
              variant={addrTitle === t ? 'filled' : 'outlined'}
              onClick={() => setAddrTitle(t)}
              sx={{
                fontWeight: 600, px: 0.5,
                ...(addrTitle === t ? { bgcolor: '#dc2626', color: '#fff', '& .MuiChip-icon': { color: '#fff' } } : {}),
              }}
            />
          ))}
        </Stack>

        {/* İl - İlçe */}
        <Stack direction="row" spacing={1.5} sx={{ mb: 1.5 }}>
          <Autocomplete
            freeSolo
            options={cities}
            value={city || ''}
            onChange={(_, v) => {
              const val = v || '';
              setCity(val);
              setDistrict('');
              setNeighborhood('');
              setStreet('');
              setDistricts([]);
              setNeighborhoods([]);
              if (val) forwardGeocode(val, '', '');
            }}
            disabled={geocoding}
            renderInput={(params) => <TextField {...params} size="small" label="İl *" placeholder="İl seçin" />}
            sx={{ flex: 1 }}
            size="small"
          />
          <Autocomplete
            freeSolo
            options={districts}
            value={district || ''}
            onChange={(_, v) => {
              const val = v || '';
              setDistrict(val);
              setNeighborhood('');
              setNeighborhoods([]);
              setStreet('');
              if (val) forwardGeocode(city, val, '');
            }}
            disabled={geocoding || !city}
            renderInput={(params) => <TextField {...params} size="small" label="İlçe *" placeholder="İlçe seçin" />}
            sx={{ flex: 1 }}
            size="small"
          />
        </Stack>

        {/* Mahalle */}
        <Autocomplete
          freeSolo
          options={neighborhoods}
          value={neighborhood || ''}
          onChange={(_, v) => {
            const val = v || '';
            setNeighborhood(val);
            setStreet('');
            if (val) forwardGeocode(city, district, val);
          }}
          disabled={geocoding || !district}
          renderInput={(params) => <TextField {...params} size="small" label="Mahalle *" placeholder="Mahalle seçin" />}
          sx={{ mb: 1.5 }}
          size="small"
        />

        {/* Cadde/Sokak */}
        <TextField
          fullWidth size="small" label="Cadde/Sokak *" value={street}
          onChange={e => setStreet(e.target.value)}
          sx={{ mb: 1.5 }}
        />

        {/* Bina Adı */}
        <TextField
          fullWidth size="small" label="Bina Adı" value={buildingName}
          onChange={e => setBuildingName(e.target.value)}
          placeholder="(opsiyonel)"
          sx={{ mb: 1.5 }}
        />

        {/* Bina No - Kat No - Daire No */}
        <Stack direction="row" spacing={1.5} sx={{ mb: 1.5 }}>
          <TextField
            size="small" label="Bina No" value={buildingNo}
            onChange={e => setBuildingNo(e.target.value)}
            placeholder="1B"
            sx={{ flex: 1 }}
          />
          <TextField
            size="small" label="Kat No" value={floor}
            onChange={e => setFloor(e.target.value)}
            placeholder="3"
            sx={{ flex: 1 }}
          />
          <TextField
            size="small" label="Daire No" value={doorNo}
            onChange={e => setDoorNo(e.target.value)}
            placeholder="0"
            sx={{ flex: 1 }}
          />
        </Stack>

        {/* Adres Tarifi */}
        <TextField
          fullWidth size="small" label="Adres Tarifi" value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="Apartmanın yanında market var..."
          multiline rows={2}
          sx={{ mb: 1.5 }}
        />

        {/* Telefon */}
        <TextField
          fullWidth size="small" label="Telefon No *" value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="5xx xxx xx xx"
          sx={{ mb: 2 }}
        />

        {/* Kaydet */}
        <Button
          fullWidth variant="contained" onClick={handleSave}
          disabled={!city || !district || !neighborhood || !street || !phone.trim() || zoneInfo?.outside}
          sx={{
            py: 1.5, fontWeight: 700, fontSize: 16, borderRadius: 3,
            bgcolor: '#dc2626', '&:hover': { bgcolor: '#b91c1c' },
            '&:disabled': { bgcolor: '#fca5a5' },
          }}
        >
          Adresi Güncelle
        </Button>
      </DialogContent>
    </Dialog>
  );
}
