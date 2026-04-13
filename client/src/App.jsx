import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { CircularProgress, Box } from '@mui/material';
import theme from './theme';
import { AuthProvider, useAuth } from './context/AuthContext';
import { CartProvider } from './context/CartContext';
import Navbar from './components/Layout/Navbar';
import Footer from './components/Layout/Footer';
import HomePage from './components/Home/HomePage';
import ContactPage from './components/Contact/ContactPage';
import LoginPage from './components/Auth/LoginPage';
import RegisterPage from './components/Auth/RegisterPage';
import MenuPage from './components/Menu/MenuPage';
import ProfilePage from './components/Profile/ProfilePage';
import AdminLayout from './components/Admin/AdminLayout';

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
      <Route path="/menu" element={<><Navbar /><MenuPage /><Footer /></>} />
      <Route path="/profile" element={user ? <><Navbar /><ProfilePage /><Footer /></> : <Navigate to="/login" />} />
      <Route path="/admin/*" element={<ProtectedAdmin><AdminLayout /></ProtectedAdmin>} />
    </Routes>
  );
}

export default function App() {
  return (
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
}
