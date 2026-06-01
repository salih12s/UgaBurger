import { BrowserRouter, Routes, Route, Navigate, useSearchParams, useNavigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { CircularProgress, Box, Typography } from '@mui/material';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { useEffect, lazy, Suspense } from 'react';
import theme from './theme';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Layout/Navbar';
import Footer from './components/Layout/Footer';
import HomePage from './components/Home/HomePage';

// Performans: ana sayfa dışındaki büyük rotalar lazy yüklensin (initial JS bundle küçülür → LCP iyileşir)
const ContactPage = lazy(() => import('./components/Contact/ContactPage'));
const LoginPage = lazy(() => import('./components/Auth/LoginPage'));
const RegisterPage = lazy(() => import('./components/Auth/RegisterPage'));
const ResetPasswordPage = lazy(() => import('./components/Auth/ResetPasswordPage'));
const MenuPage = lazy(() => import('./components/Menu/MenuPage'));
const ProfilePage = lazy(() => import('./components/Profile/ProfilePage'));
const AdminLayout = lazy(() => import('./components/Admin/AdminLayout'));

const RouteFallback = () => (
  <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '60vh' }}>
    <CircularProgress />
  </Box>
);

// PayTR ödeme sonuç sayfaları (iframe içinde gösterilir)
function PaymentSuccess() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  useEffect(() => {
    const orderId = params.get('order');
    // Ana pencereye (OrderDialog) haber ver (iframe içindeyken)
    try { window.parent?.postMessage({ type: 'paytr_success', orderId }, '*'); } catch {}
    // Iframe dışında tam sayfa olarak açıldıysa, birkaç saniye sonra siteye yönlendir
    const isStandalone = window.parent === window;
    const timer = setTimeout(() => {
      if (isStandalone) {
        navigate('/profile', { replace: true });
      }
    }, 2500);
    return () => clearTimeout(timer);
  }, [params, navigate]);
  return (
    <Box sx={{ textAlign: 'center', py: 8, px: 3 }}>
      <Typography sx={{ fontSize: 56, mb: 2 }}>✅</Typography>
      <Typography variant="h5" sx={{ fontWeight: 800, color: '#16a34a', mb: 1 }}>Ödeme Başarılı!</Typography>
      <Typography variant="body2" color="text.secondary">Siparişiniz onaylandı. Yönlendiriliyorsunuz...</Typography>
    </Box>
  );
}

function PaymentFail() {
  const navigate = useNavigate();
  useEffect(() => {
    try { window.parent?.postMessage({ type: 'paytr_fail' }, '*'); } catch {}
    const isStandalone = window.parent === window;
    const timer = setTimeout(() => {
      if (isStandalone) navigate('/menu', { replace: true });
    }, 3000);
    return () => clearTimeout(timer);
  }, [navigate]);
  return (
    <Box sx={{ textAlign: 'center', py: 8, px: 3 }}>
      <Typography sx={{ fontSize: 56, mb: 2 }}>❌</Typography>
      <Typography variant="h5" sx={{ fontWeight: 800, color: '#dc2626', mb: 1 }}>Ödeme Başarısız</Typography>
      <Typography variant="body2" color="text.secondary">Ödemeniz işlenemedi. Menüye yönlendiriliyorsunuz...</Typography>
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
      <Route path="/contact" element={<Suspense fallback={<RouteFallback />}><><Navbar /><ContactPage /><Footer /></></Suspense>} />
      <Route path="/login" element={user ? <Navigate to={user.role === 'admin' ? '/admin' : '/menu'} /> : <Suspense fallback={<RouteFallback />}><><Navbar /><LoginPage /><Footer /></></Suspense>} />
      <Route path="/register" element={user ? <Navigate to="/menu" /> : <Suspense fallback={<RouteFallback />}><><Navbar /><RegisterPage /><Footer /></></Suspense>} />
      <Route path="/reset-password/:token" element={<Suspense fallback={<RouteFallback />}><ResetPasswordPage /></Suspense>} />
      <Route path="/menu" element={<Suspense fallback={<RouteFallback />}><><Navbar /><MenuPage /><Footer /></></Suspense>} />
      <Route path="/profile" element={user ? <Suspense fallback={<RouteFallback />}><><Navbar /><ProfilePage /><Footer /></></Suspense> : <Navigate to="/login" />} />
      <Route path="/odeme-basarili" element={<PaymentSuccess />} />
      <Route path="/odeme-hatasi" element={<PaymentFail />} />
      <Route path="/admin/*" element={<ProtectedAdmin><Suspense fallback={<RouteFallback />}><AdminLayout /></Suspense></ProtectedAdmin>} />
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
