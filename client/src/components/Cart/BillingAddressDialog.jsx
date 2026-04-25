import { useState, useEffect } from 'react';
import {
  Dialog, DialogContent, Box, Typography, Button, TextField, Stack, IconButton,
  ToggleButtonGroup, ToggleButton, Autocomplete, Checkbox, FormControlLabel, Alert,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import PersonIcon from '@mui/icons-material/Person';
import BusinessIcon from '@mui/icons-material/Business';
import toast from 'react-hot-toast';

const TCKN_RE = /^[1-9][0-9]{10}$/;
const VKN_RE = /^[0-9]{10}$/;

// TC kimlik doğrulaması (algoritma)
const isValidTCKN = (tckn) => {
  if (!TCKN_RE.test(tckn)) return false;
  const d = tckn.split('').map(Number);
  const odd = d[0] + d[2] + d[4] + d[6] + d[8];
  const even = d[1] + d[3] + d[5] + d[7];
  const d10 = (odd * 7 - even) % 10;
  if (d10 !== d[9]) return false;
  const d11 = (odd + even + d[9]) % 10;
  return d11 === d[10];
};

export default function BillingAddressDialog({ open, onClose, onSave, editAddress }) {
  const [invoiceType, setInvoiceType] = useState('bireysel');
  const [addrTitle, setAddrTitle] = useState('Fatura Adresi');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [tckn, setTckn] = useState('');
  // Kurumsal
  const [companyTitle, setCompanyTitle] = useState('');
  const [taxNumber, setTaxNumber] = useState('');
  const [taxOffice, setTaxOffice] = useState('');
  const [isEinvoicePayer, setIsEinvoicePayer] = useState(false);
  // Ortak iletişim
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  // Adres
  const [city, setCity] = useState('');
  const [district, setDistrict] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [street, setStreet] = useState('');
  const [buildingNo, setBuildingNo] = useState('');
  const [floor, setFloor] = useState('');
  const [doorNo, setDoorNo] = useState('');

  const [cities, setCities] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [neighborhoods, setNeighborhoods] = useState([]);

  // İller
  useEffect(() => {
    fetch('https://api.turkiyeapi.dev/v1/provinces?fields=name')
      .then(r => r.json())
      .then(d => setCities((d.data || []).map(p => p.name).sort((a, b) => a.localeCompare(b, 'tr'))))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!city) { setDistricts([]); return; }
    fetch(`https://api.turkiyeapi.dev/v1/districts?province=${encodeURIComponent(city)}&fields=name`)
      .then(r => r.json())
      .then(d => setDistricts((d.data || []).map(x => x.name).sort((a, b) => a.localeCompare(b, 'tr'))))
      .catch(() => setDistricts([]));
  }, [city]);

  useEffect(() => {
    if (!city || !district) { setNeighborhoods([]); return; }
    fetch(`https://api.turkiyeapi.dev/v1/neighborhoods?province=${encodeURIComponent(city)}&district=${encodeURIComponent(district)}&fields=name`)
      .then(r => r.json())
      .then(d => setNeighborhoods((d.data || []).map(x => x.name).sort((a, b) => a.localeCompare(b, 'tr'))))
      .catch(() => setNeighborhoods([]));
  }, [city, district]);

  // Edit modunda doldur
  useEffect(() => {
    if (!editAddress) return;
    setInvoiceType(editAddress.invoiceType || 'bireysel');
    setAddrTitle(editAddress.title || 'Fatura Adresi');
    setFirstName(editAddress.firstName || '');
    setLastName(editAddress.lastName || '');
    setTckn(editAddress.tckn || '');
    setCompanyTitle(editAddress.companyTitle || '');
    setTaxNumber(editAddress.taxNumber || '');
    setTaxOffice(editAddress.taxOffice || '');
    setIsEinvoicePayer(!!editAddress.isEinvoicePayer);
    setEmail(editAddress.email || '');
    setPhone(editAddress.phone || '');
    setCity(editAddress.city || '');
    setDistrict(editAddress.district || '');
    setNeighborhood(editAddress.neighborhood || '');
    setStreet(editAddress.street || '');
    setBuildingNo(editAddress.buildingNo || '');
    setFloor(editAddress.floor || '');
    setDoorNo(editAddress.doorNo || '');
  }, [editAddress, open]);

  const buildAddressString = () => {
    const p = [];
    if (neighborhood) p.push(neighborhood + ' Mah.');
    if (street) p.push(street);
    if (buildingNo) p.push('No:' + buildingNo);
    if (floor) p.push('Kat:' + floor);
    if (doorNo) p.push('D:' + doorNo);
    if (district) p.push(district);
    if (city) p.push(city);
    return p.join(' ');
  };

  const handleSave = () => {
    // Ortak zorunlu alanlar
    if (!phone.trim()) return toast.error('Telefon zorunludur');
    if (!city) return toast.error('İl seçiniz');
    if (!district) return toast.error('İlçe seçiniz');
    if (!neighborhood.trim()) return toast.error('Mahalle zorunludur');
    if (!street.trim()) return toast.error('Adres (cadde/sokak) zorunludur');

    if (invoiceType === 'bireysel') {
      if (!firstName.trim() || !lastName.trim()) return toast.error('Ad ve Soyad zorunludur');
      if (!TCKN_RE.test(tckn)) return toast.error('Geçerli bir TC Kimlik No giriniz (11 hane)');
      if (!isValidTCKN(tckn)) return toast.error('TC Kimlik No doğrulanamadı');
    } else {
      if (!companyTitle.trim()) return toast.error('Firma ünvanı zorunludur');
      if (!VKN_RE.test(taxNumber)) return toast.error('Geçerli bir VKN giriniz (10 hane)');
      if (!taxOffice.trim()) return toast.error('Vergi dairesi zorunludur');
    }

    const data = {
      invoiceType,
      title: addrTitle || (invoiceType === 'kurumsal' ? companyTitle : `${firstName} ${lastName}`),
      firstName, lastName, tckn,
      companyTitle, taxNumber, taxOffice, isEinvoicePayer,
      email, phone,
      city, district, neighborhood, street, buildingNo, floor, doorNo,
      address: buildAddressString(),
    };
    onSave(data);
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth
      PaperProps={{ sx: { borderRadius: 4, maxHeight: '95vh' } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', p: 2, pb: 0 }}>
        <Typography variant="h6" sx={{ fontWeight: 800 }}>
          {editAddress ? 'Fatura Adresini Düzenle' : 'Fatura Adresi Ekle'}
        </Typography>
        <IconButton onClick={onClose}><CloseIcon /></IconButton>
      </Box>

      <DialogContent sx={{ pt: 2 }}>
        {/* Fatura Türü */}
        <Typography variant="caption" sx={{ fontWeight: 700, display: 'block', mb: 0.8 }}>
          Fatura Türü *
        </Typography>
        <ToggleButtonGroup
          value={invoiceType}
          exclusive
          fullWidth
          onChange={(_, v) => v && setInvoiceType(v)}
          sx={{ mb: 2 }}
        >
          <ToggleButton value="bireysel" sx={{ textTransform: 'none', fontWeight: 700,
            '&.Mui-selected': { bgcolor: '#fee2e2', color: '#dc2626', borderColor: '#dc2626' } }}>
            <PersonIcon sx={{ mr: 0.8, fontSize: 20 }} /> Bireysel
          </ToggleButton>
          <ToggleButton value="kurumsal" sx={{ textTransform: 'none', fontWeight: 700,
            '&.Mui-selected': { bgcolor: '#fee2e2', color: '#dc2626', borderColor: '#dc2626' } }}>
            <BusinessIcon sx={{ mr: 0.8, fontSize: 20 }} /> Kurumsal
          </ToggleButton>
        </ToggleButtonGroup>

        {/* Kimlik / Firma Bilgileri */}
        {invoiceType === 'bireysel' ? (
          <>
            <Stack direction="row" spacing={1.2} sx={{ mb: 1.2 }}>
              <TextField fullWidth size="small" label="Ad *" value={firstName}
                onChange={e => setFirstName(e.target.value)} />
              <TextField fullWidth size="small" label="Soyad *" value={lastName}
                onChange={e => setLastName(e.target.value)} />
            </Stack>
            <TextField fullWidth size="small" label="TC Kimlik No *" value={tckn}
              onChange={e => setTckn(e.target.value.replace(/\D/g, '').slice(0, 11))}
              inputProps={{ inputMode: 'numeric', maxLength: 11 }}
              placeholder="11 haneli TC kimlik numarası"
              sx={{ mb: 1.2 }} />
          </>
        ) : (
          <>
            <TextField fullWidth size="small" label="Firma Ünvanı *" value={companyTitle}
              onChange={e => setCompanyTitle(e.target.value)}
              sx={{ mb: 1.2 }} />
            <Stack direction="row" spacing={1.2} sx={{ mb: 1.2 }}>
              <TextField fullWidth size="small" label="VKN *" value={taxNumber}
                onChange={e => setTaxNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                inputProps={{ inputMode: 'numeric', maxLength: 10 }}
                placeholder="10 haneli vergi no" />
              <TextField fullWidth size="small" label="Vergi Dairesi *" value={taxOffice}
                onChange={e => setTaxOffice(e.target.value)} />
            </Stack>
            <FormControlLabel
              control={<Checkbox checked={isEinvoicePayer} onChange={e => setIsEinvoicePayer(e.target.checked)} size="small" />}
              label={<Typography variant="caption">Firmamız e-Fatura mükellefidir</Typography>}
              sx={{ mb: 1 }}
            />
            {isEinvoicePayer && (
              <Alert severity="info" sx={{ mb: 1.2, fontSize: 12 }}>
                e-Fatura mükellefi firmalara e-Fatura düzenlenecektir.
              </Alert>
            )}
          </>
        )}

        {/* İletişim */}
        <Stack direction="row" spacing={1.2} sx={{ mb: 1.2 }}>
          <TextField fullWidth size="small" label="Telefon *" value={phone}
            onChange={e => setPhone(e.target.value)}
            placeholder="5xx xxx xx xx" />
          <TextField fullWidth size="small" label="E-posta" type="email" value={email}
            onChange={e => setEmail(e.target.value)}
            placeholder="fatura@ornek.com" />
        </Stack>

        {/* İl / İlçe */}
        <Stack direction="row" spacing={1.2} sx={{ mb: 1.2 }}>
          <Autocomplete fullWidth freeSolo options={cities} value={city || ''}
            onChange={(_, v) => { setCity(v || ''); setDistrict(''); setNeighborhood(''); }}
            renderInput={(p) => <TextField {...p} size="small" label="İl *" />} />
          <Autocomplete fullWidth freeSolo options={districts} value={district || ''}
            onChange={(_, v) => { setDistrict(v || ''); setNeighborhood(''); }}
            disabled={!city}
            renderInput={(p) => <TextField {...p} size="small" label="İlçe *" />} />
        </Stack>

        <Autocomplete freeSolo options={neighborhoods} value={neighborhood || ''}
          onChange={(_, v) => setNeighborhood(v || '')}
          disabled={!district}
          renderInput={(p) => <TextField {...p} size="small" label="Mahalle *" />}
          sx={{ mb: 1.2 }} />

        <TextField fullWidth size="small" label="Cadde / Sokak *" value={street}
          onChange={e => setStreet(e.target.value)}
          placeholder="Cadde, mahalle, sokak, bina adı..."
          sx={{ mb: 1.2 }} />

        <Stack direction="row" spacing={1.2} sx={{ mb: 1.5 }}>
          <TextField size="small" label="Bina No" value={buildingNo}
            onChange={e => setBuildingNo(e.target.value)} sx={{ flex: 1 }} />
          <TextField size="small" label="Kat" value={floor}
            onChange={e => setFloor(e.target.value)} sx={{ flex: 1 }} />
          <TextField size="small" label="Daire" value={doorNo}
            onChange={e => setDoorNo(e.target.value)} sx={{ flex: 1 }} />
        </Stack>

        <TextField fullWidth size="small" label="Adres Başlığı"
          value={addrTitle} onChange={e => setAddrTitle(e.target.value)}
          placeholder="Örn: Ev, İş, Ofis"
          sx={{ mb: 2 }} />

        <Button fullWidth variant="contained" onClick={handleSave}
          sx={{ py: 1.4, fontWeight: 700, fontSize: 15, borderRadius: 3,
            bgcolor: '#dc2626', '&:hover': { bgcolor: '#b91c1c' } }}>
          Kaydet
        </Button>
      </DialogContent>
    </Dialog>
  );
}
