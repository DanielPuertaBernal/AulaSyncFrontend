import apiClient from '@/shared/api/axios.client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const notificacionesApi = {
  enviarDevolucion: (data) => apiClient.post('/notificaciones/devolucion-llaves', data),
  historial: (params) => apiClient.get('/notificaciones/historial', { params }),
  estadisticas: () => apiClient.get('/notificaciones/estadisticas'),
  reenviar: (id) => apiClient.post(`/notificaciones/reenviar/${id}`),
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

export function useEstadisticasNotificaciones() {
  return useQuery({
    queryKey: ['notificaciones', 'estadisticas'],
    queryFn: () => notificacionesApi.estadisticas().then((r) => {
      const pe = r.data.data.por_estado || {};
      return {
        enviados: pe.enviado || 0,
        pendientes: pe.pendiente || 0,
        fallidos: pe.fallido || 0,
        por_tipo: r.data.data.por_tipo || {},
      };
    }),
  });
}

export function useReenviarNotificacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: notificacionesApi.reenviar,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['notificaciones'] }),
  });
}
