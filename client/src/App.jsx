import { BrowserRouter, Routes, Route, Navigate, useSearchParams } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { CircularProgress, Box, Typography } from '@mui/material';
import { GoogleOAuthProvider } from '@react-oauth/google';
import theme from './theme';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Layout/Navbar';
import Footer from './components/Layout/Footer';
import HomePage from './components/Home/HomePage';
import ContactPage from './components/Contact/ContactPage';
import LoginPage from './components/Auth/LoginPage';
import RegisterPage from './components/Auth/RegisterPage';
import ResetPasswordPage from './components/Auth/ResetPasswordPage';
import MenuPage from './components/Menu/MenuPage';
import ProfilePage from './components/Profile/ProfilePage';
import AdminLayout from './components/Admin/AdminLayout';

// PayTR ödeme sonuç sayfaları (iframe içinde gösterilir)
function PaymentSuccess() {
  return (
    <Box sx={{ textAlign: 'center', py: 8, px: 3 }}>
      <Typography sx={{ fontSize: 56, mb: 2 }}>✅</Typography>
      <Typography variant="h5" sx={{ fontWeight: 800, color: '#16a34a', mb: 1 }}>Ödeme Başarılı!</Typography>
      <Typography variant="body2" color="text.secondary">Siparişiniz onaylandı. Bu pencere kısa süre içinde kapanacaktır.</Typography>
    </Box>
  );
}

function PaymentFail() {
  return (
    <Box sx={{ textAlign: 'center', py: 8, px: 3 }}>
      <Typography sx={{ fontSize: 56, mb: 2 }}>❌</Typography>
      <Typography variant="h5" sx={{ fontWeight: 800, color: '#dc2626', mb: 1 }}>Ödeme Başarısız</Typography>
      <Typography variant="body2" color="text.secondary">Ödemeniz işlenemedi. Lütfen tekrar deneyin.</Typography>
    </Box>
  );
}

function ProtectedAdmin({ children }) {
  const { user, loading } = useAuth();
  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', p: 5 }}><CircularProgress /></Box>;
  if (!user || user.role !== 'admin') return <Navigate to="/login" />;
  return children;
}

function AppRoutes() {
  const { user } = useAuth();

  return (
    <Routes>
      <Route path="/" element={<HomePage />} />
      <Route path="/contact" element={<><Navbar /><ContactPage /><Footer /></>} />
      <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/menu'} /> : <><Navbar /><LoginPage /><Footer /></>} />
      <Route path="/register" element={user ? <Navigate to="/menu" /> : <><Navbar /><RegisterPage /><Footer /></>} />
      <Route path="/reset-password/:token" element={<ResetPasswordPage />} />
      <Route path="/menu" element={<><Navbar /><MenuPage /><Footer /></>} />
      <Route path="/profile" element={user ? <><Navbar /><ProfilePage /><Footer /></> : <Navigate to="/login" />} />
      <Route path="/odeme-basarili" element={<PaymentSuccess />} />
      <Route path="/odeme-hatasi" element={<PaymentFail />} />
      <Route path="/admin/*" element={<ProtectedAdmin><AdminLayout /></ProtectedAdmin>} />
    </Routes>
  );
}

const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

export default function App() {
  const content = (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <AuthProvider>
          <CartProvider>
            <Toaster position="top-center" />
            <AppRoutes />
          </CartProvider>
        </AuthProvider>
      </BrowserRouter>
    </ThemeProvider>
  );

  return <GoogleOAuthProvider clientId={googleClientId || ''}>{content}</GoogleOAuthProvider>;
}
