import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || '';

export function getImageUrl(path) {
  if (!path) return '';
  // data: (base64), http(s):, blob: URL'lerini olduğu gibi döndür
  if (path.startsWith('data:') || path.startsWith('http') || path.startsWith('blob:')) return path;
  return `${API_URL}${path}`;
}

const api = axios.create({
  baseURL: `${API_URL}/api`,
  headers: { 'Content-Type': 'application/json' },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      if (window.location.pathname !== '/login') {
        window.location.href = '/login';
      }
    }
    return Promise.reject(err);
  }
);

export default api;
