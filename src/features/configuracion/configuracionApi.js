import apiClient from '@/shared/api/axios.client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const configuracionApi = {
  listar: () => apiClient.get('/configuracion'),
  defaults: () => apiClient.get('/configuracion/defaults'),
  porBloque: (bloque) => apiClient.get(`/configuracion/${bloque}`),
  guardar: (bloque, data) => apiClient.put(`/configuracion/${bloque}`, data),
  eliminar: (bloque) => apiClient.delete(`/configuracion/${bloque}`),
};

export function useConfiguraciones() {
  return useQuery({
    queryKey: ['configuracion'],
    queryFn: () => configuracionApi.listar().then((r) => r.data.data.configuraciones),
  });
}

export function useConfiguracionDefaults() {
  return useQuery({
    queryKey: ['configuracion', 'defaults'],
    queryFn: () => configuracionApi.defaults().then((r) => r.data.data),
  });
}

export function useGuardarConfiguracion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ bloque, ...data }) => configuracionApi.guardar(bloque, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['configuracion'] }),
  });
}

export function useEliminarConfiguracion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (bloque) => configuracionApi.eliminar(bloque),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['configuracion'] }),
  });
}
