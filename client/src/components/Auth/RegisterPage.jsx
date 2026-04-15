import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import toast from 'react-hot-toast';
import { Box, Card, Typography, TextField, Button, Divider, FormControlLabel, Checkbox, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material';
import GoogleIcon from '@mui/icons-material/Google';
import api from '../../api/api';

export default function RegisterPage() {
  const [form, setForm] = useState({ first_name: '', last_name: '', email: '', phone: '', password: '', password2: '' });
  const [loading, setLoading] = useState(false);
  const [kvkkAccepted, setKvkkAccepted] = useState(false);
  const [kvkkDialog, setKvkkDialog] = useState(false);
  const [privacyDialog, setPrivacyDialog] = useState(false);
  const [salesDialog, setSalesDialog] = useState(false);
  const [legalTexts, setLegalTexts] = useState({});
  const { register } = useAuth();
  const navigate = useNavigate();

  const defaultKvkk = `Veri Sorumlusu:\nAhment Muhittin Ark ve Ulaş Kantarcı Adi Ortaklığı\nAdres: Uga Burger, İnönü Mah. No:2, Yenişehir / Mersin\nE-posta: bilgi@ugaburger.com\n\nKişisel verileriniz; sipariş süreçlerinin yürütülmesi, iletişim faaliyetlerinin sağlanması ve hukuki yükümlülüklerin yerine getirilmesi amacıyla 6698 sayılı KVKK kapsamında işlenmektedir.\n\nToplanan kişisel veriler: Ad, Soyad, Telefon, E-posta, Adres bilgileri.\n\nVerileriniz yasal zorunluluklar dışında üçüncü kişilerle paylaşılmamaktadır. KVKK'nın 11. maddesi gereğince bilgi edinme, düzeltme ve silme haklarınız saklıdır.`;
  const defaultPrivacy = `Uga Burger olarak kişisel verilerinizin güvenliğini önemsiyoruz.\n\nToplanan bilgiler yalnızca sipariş süreçleri ve müşteri iletişimi amacıyla kullanılır. Kredi kartı bilgileriniz sunucularımızda saklanmaz.\n\nÇerez Politikası: Sitemiz, kullanıcı deneyimini iyileştirmek için çerezler kullanmaktadır.\n\nBilgileriniz üçüncü taraflarla paylaşılmaz ve yasal gereklilikler dışında kullanılmaz.`;
  const defaultSales = `SATICI BİLGİLERİ\nSatıcı: Ahment Muhittin Ark ve Ulaş Kantarcı Adi Ortaklığı\nAdres: Uga Burger, İnönü Mah. No:2, Yenişehir / Mersin\n\nSipariş onaylandıktan sonra hazırlanmaya başlanır. Hazırlığa başlanmış siparişler iptal edilemez.\n\nTeslimat süresi bölgeye ve yoğunluğa göre değişiklik gösterebilir.\n\nÖdeme, sipariş onayı sonrasında tahsil edilir. İade ve cayma hakkı, tüketici mevzuatı çerçevesinde uygulanır.`;

  useEffect(() => {
    api.get('/settings').then(r => setLegalTexts(r.data)).catch(() => {});
  }, []);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.first_name || !form.last_name || !form.email || !form.phone || !form.password) {
      toast.error('Tüm alanları doldurunuz'); return;
    }
    if (form.password !== form.password2) { toast.error('Şifreler eşleşmiyor'); return; }
    if (form.password.length < 6) { toast.error('Şifre en az 6 karakter olmalıdır'); return; }
    if (!kvkkAccepted) { toast.error('KVKK Aydınlatma Metni\'ni kabul etmelisiniz'); return; }
    setLoading(true);
    try {
      await register({ first_name: form.first_name, last_name: form.last_name, email: form.email, phone: form.phone, password: form.password });
      toast.success('Kayıt başarılı!');
      navigate('/menu');
    } catch (err) {
      toast.error(err.response?.data?.error || 'Kayıt hatası');
    } finally { setLoading(false); }
  };

  return (
    <Box sx={{ minHeight: 'calc(100vh - 100px)', display: 'flex', alignItems: 'center', justifyContent: 'center', p: 3, bgcolor: '#f5f5f5' }}>
      <Card sx={{ p: { xs: 3, md: 5 }, width: '100%', maxWidth: 480 }}>
        <Typography variant="h5" sx={{ fontWeight: 800, textAlign: 'center', mb: 3.5 }}>Kayıt Ol</Typography>
        <form onSubmit={handleSubmit}>
          <Typography variant="subtitle2" sx={{ fontWeight: 700, mb: 2, pb: 1, borderBottom: '1px solid #eee' }}>Kişisel Bilgiler</Typography>
          <TextField fullWidth label="İsim" name="first_name" value={form.first_name} onChange={handleChange} sx={{ mb: 2 }} size="medium" />
          <TextField fullWidth label="Soyisim" name="last_name" value={form.last_name} onChange={handleChange} sx={{ mb: 2 }} size="medium" />
          <TextField fullWidth label="E-posta" name="email" type="email" value={form.email} onChange={handleChange} sx={{ mb: 2 }} size="medium" />
          <TextField fullWidth label="Telefon Numarası" name="phone" type="tel" value={form.phone} onChange={handleChange} sx={{ mb: 2 }} size="medium" />
          <TextField fullWidth label="Şifre" name="password" type="password" value={form.password} onChange={handleChange} sx={{ mb: 2 }} size="medium" />
          <TextField fullWidth label="Şifre Tekrar" name="password2" type="password" value={form.password2} onChange={handleChange} sx={{ mb: 2 }} size="medium" />
          <FormControlLabel
            control={<Checkbox checked={kvkkAccepted} onChange={e => setKvkkAccepted(e.target.checked)} sx={{ '&.Mui-checked': { color: '#dc2626' } }} />}
            label={
              <Typography variant="body2">
                <Typography component="span" onClick={e => { e.preventDefault(); setKvkkDialog(true); }} sx={{ color: '#3b82f6', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}>KVKK Aydınlatma Metni</Typography>,{' '}
                <Typography component="span" onClick={e => { e.preventDefault(); setPrivacyDialog(true); }} sx={{ color: '#3b82f6', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}>Gizlilik Politikası</Typography> ve{' '}
                <Typography component="span" onClick={e => { e.preventDefault(); setSalesDialog(true); }} sx={{ color: '#3b82f6', cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}>Mesafeli Satış Sözleşmesi</Typography>'ni okudum, kabul ediyorum.
              </Typography>
            }
            sx={{ mb: 2, alignItems: 'flex-start' }}
          />
          <Button fullWidth type="submit" variant="contained" color="primary" disabled={loading || !kvkkAccepted}
            sx={{ py: 1.5, fontSize: 15, fontWeight: 700, mt: 1 }}>
            {loading ? 'Kayıt yapılıyor...' : 'Kayıt Ol'}
          </Button>
        </form>
        <Divider sx={{ my: 2 }} />
        <Button fullWidth variant="outlined" startIcon={<GoogleIcon />}
          onClick={() => toast('Google kayıt yakında aktif olacak')}
          sx={{ color: '#333', borderColor: '#ddd', fontWeight: 600, py: 1.2 }}>
          Google ile Kayıt Ol
        </Button>
        <Typography variant="body2" sx={{ textAlign: 'center', mt: 2.5, color: '#666' }}>
          Zaten hesabın var mı? <Typography component={Link} to="/login" sx={{ color: '#dc2626', fontWeight: 600, textDecoration: 'none' }}>Giriş Yap</Typography>
        </Typography>
      </Card>

      <Dialog open={kvkkDialog} onClose={() => setKvkkDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>KVKK Aydınlatma Metni</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
            {legalTexts.kvkk_text || defaultKvkk}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => { setKvkkAccepted(true); setKvkkDialog(false); }} variant="contained" sx={{ fontWeight: 600 }}>Okudum, Kabul Ediyorum</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={privacyDialog} onClose={() => setPrivacyDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Gizlilik Politikası</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
            {legalTexts.privacy_text || defaultPrivacy}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPrivacyDialog(false)} variant="contained" sx={{ fontWeight: 600 }}>Kapat</Button>
        </DialogActions>
      </Dialog>

      <Dialog open={salesDialog} onClose={() => setSalesDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 700 }}>Mesafeli Satış Sözleşmesi</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ whiteSpace: 'pre-line' }}>
            {legalTexts.sales_agreement || defaultSales}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSalesDialog(false)} variant="contained" sx={{ fontWeight: 600 }}>Kapat</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
