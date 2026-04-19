import apiClient from '@/shared/api/axios.client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const reservasApi = {
  listar: (params) => apiClient.get('/reservas', { params }),
  crear: (data) => apiClient.post('/reservas', data),
  aprobar: (id) => apiClient.post(`/reservas/${id}/aprobar`),
  rechazar: (id) => apiClient.post(`/reservas/${id}/rechazar`),
  cancelar: (id) => apiClient.post(`/reservas/${id}/cancelar`),
  disponibilidad: (params) => apiClient.get('/reservas/disponibilidad', { params }),
  validar: (data) => apiClient.post('/reservas/validar', data),
};

export function useReservas(params) {
  return useQuery({
    queryKey: ['reservas', params],
    queryFn: () => reservasApi.listar(params).then((r) => r.data.data),
  });
}

export function useCrearReserva() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reservasApi.crear,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservas'] }),
  });
}

export function useAprobarReserva() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reservasApi.aprobar,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservas'] }),
  });
}

export function useRechazarReserva() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reservasApi.rechazar,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservas'] }),
  });
}

export function useCancelarReserva() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reservasApi.cancelar,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reservas'] }),
  });
}

export function useDisponibilidad(nombre_salon, fecha) {
  return useQuery({
    queryKey: ['reservas', 'disponibilidad', nombre_salon, fecha],
    queryFn: () => reservasApi.disponibilidad({ nombre_salon, fecha }).then((r) => r.data.data),
    enabled: !!nombre_salon && !!fecha,
  });
}
