import apiClient from '@/shared/api/axios.client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const notificacionesApi = {
  enviarDevolucion: (data) => apiClient.post('/notificaciones/devolucion-llaves', data),
  historial: (params) => apiClient.get('/notificaciones/historial', { params }),
};

export function useEnviarNotificacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificacionesApi.enviarDevolucion,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificaciones'] }),
  });
}

export function useHistorialNotificaciones(params) {
  return useQuery({
    queryKey: ['notificaciones', 'historial', params],
    queryFn: () => notificacionesApi.historial(params).then((r) => r.data.data.registros),
  });
}
