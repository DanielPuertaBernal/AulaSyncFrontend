import apiClient from '@/shared/api/axios.client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const equiposApi = {
  listar: () => apiClient.get('/equipos'),
  disponibles: () => apiClient.get('/equipos/disponibles'),
  crear: (data) => apiClient.post('/equipos', data),
  actualizar: (id, data) => apiClient.patch(`/equipos/${id}`, data),
  buscarBarcode: (codigo) => apiClient.get(`/equipos/barcode/${codigo}`),
};

export function useEquipos() {
  return useQuery({
    queryKey: ['equipos'],
    queryFn: () => equiposApi.listar().then((r) => r.data.data.equipos),
  });
}

export function useEquiposDisponibles() {
  return useQuery({
    queryKey: ['equipos', 'disponibles'],
    queryFn: () => equiposApi.disponibles().then((r) => r.data.data.equipos),
  });
}

export function useCrearEquipo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: equiposApi.crear,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['equipos'] }),
  });
}

export function useActualizarEquipo() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, ...data }) => equiposApi.actualizar(id, data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['equipos'] }),
  });
}
