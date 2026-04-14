import apiClient from '@/shared/api/axios.client';
import { useQuery } from '@tanstack/react-query';

export const comunidadApi = {
  listar: (tipo) => apiClient.get('/comunidad', { params: tipo ? { tipo } : {} }),
  buscarPorCarnet: (idCarnet) => apiClient.get(`/comunidad/carnet/${idCarnet}`),
  buscarPorDocumento: (documento) => apiClient.get(`/comunidad/${documento}`),
};

export function useComunidad(tipo) {
  return useQuery({
    queryKey: ['comunidad', tipo],
    queryFn: () => comunidadApi.listar(tipo).then((r) => r.data.data.personas),
  });
}
