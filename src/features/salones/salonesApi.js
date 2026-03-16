import apiClient from '@/shared/api/axios.client';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';

export const salonesApi = {
  listar: () => apiClient.get('/salones'),
  crear: (data) => apiClient.post('/salones', data),
  actualizar: (id, data) => apiClient.patch(`/salones/${id}`, data),
  eliminar: (id) => apiClient.delete(`/salones/${id}`),
};

export function useSalones(options = {}) {
  const { enabled = true } = options;
  return useQuery({
    queryKey: ['salones'],
    enabled,
    queryFn: () => salonesApi.listar().then((r) => r.data.data.salones),
  });
}

export function useCrearSalon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: salonesApi.crear,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salones'] }),
  });
}

export function useActualizarSalon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => salonesApi.actualizar(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salones'] }),
  });
}

export function useEliminarSalon() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => salonesApi.eliminar(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['salones'] }),
  });
}
