import apiClient from '@/shared/api/axios.client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const llavesApi = {
  pendientes: () => apiClient.get('/llaves/pendientes'),
  hoy: () => apiClient.get('/llaves/dia'),
  historial: (params) => apiClient.get('/llaves/historial', { params }),
  clasesProcesadasHoy: () => apiClient.get('/llaves/clases-hoy'),
  entregar: (data) => apiClient.post('/llaves/entregar', data),
  devolver: (documento) => apiClient.post(`/llaves/devolver/${documento}`),
  procesarNFC: (id_carnet) => apiClient.post('/llaves/procesar-nfc', { id_carnet }),
  confirmarAnticipado: (data) => apiClient.post('/llaves/confirmar-anticipado', data),
  exportarHistorial: (params) =>
    apiClient.get('/llaves/historial/exportar', { params, responseType: 'blob' }),
};

export function useLlavesPendientes() {
  return useQuery({
    queryKey: ['llaves', 'pendientes'],
    queryFn: () => llavesApi.pendientes().then((r) => r.data.data.llaves),
    refetchInterval: 30000,
  });
}

export function useLlavesHoy() {
  return useQuery({
    queryKey: ['llaves', 'hoy'],
    queryFn: () => llavesApi.hoy().then((r) => r.data.data.llaves),
    refetchInterval: 30000,
  });
}

export function useHistorialLlaves(params) {
  return useQuery({
    queryKey: ['llaves', 'historial', params],
    queryFn: () => llavesApi.historial(params).then((r) => r.data.data.registros),
  });
}

export function useEntregarLlave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: llavesApi.entregar,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['llaves'] });
      qc.invalidateQueries({ queryKey: ['programacion'] });
    },
  });
}

export function useDevolverLlave() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: llavesApi.devolver,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['llaves'] }),
  });
}
