import apiClient from '@/shared/api/axios.client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const docentesApi = {
  listar: () => apiClient.get('/docentes'),
  buscarPorCarnet: (idCarnet) => apiClient.get(`/docentes/carnet/${idCarnet}`),
  importar: (file) => {
    const fd = new FormData();
    fd.append('archivo', file);
    return apiClient.post('/docentes/importar', fd);
  },
};

export function useDocentes() {
  return useQuery({
    queryKey: ['docentes'],
    queryFn: () => docentesApi.listar().then((r) => r.data.data.docentes),
  });
}

export function useImportarDocentes() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: docentesApi.importar,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['docentes'] }),
  });
}
