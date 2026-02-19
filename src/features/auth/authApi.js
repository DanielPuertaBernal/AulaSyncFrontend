import apiClient from '@/shared/api/axios.client';

export const authApi = {
  login: (credentials) => apiClient.post('/auth/login', credentials),
  logout: () => apiClient.post('/auth/logout'),
  me: () => apiClient.get('/auth/me'),
  refresh: (refreshToken) => apiClient.post('/auth/refresh', { refreshToken }),
};
