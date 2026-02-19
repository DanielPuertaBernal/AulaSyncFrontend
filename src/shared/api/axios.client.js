import axios from 'axios';
import { useAuthStore } from '@/features/auth/authStore';

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 15000,
});

// Adjunta JWT en cada request
apiClient.interceptors.request.use((config) => {
  const token = useAuthStore.getState().token;
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Maneja 401 → logout automático
apiClient.interceptors.response.use(
  (res) => res,
  (error) => {
    if (error.response?.status === 401) {
      useAuthStore.getState().logout();
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default apiClient;
