import apiClient from '@/shared/api/axios.client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const programacionApi = {
  listar: () => apiClient.get('/programacion'),
  listarPorDia: (dia, clasesConLlave = []) =>
    apiClient.get(`/programacion/dia/${dia}`, {
      params: { clasesConLlave: JSON.stringify(clasesConLlave) },
    }),
  importar: (file) => {
    const fd = new FormData();
    fd.append('archivo', file);
    return apiClient.post('/programacion/importar', fd);
  },
  exportar: () => apiClient.get('/programacion/exportar', { responseType: 'blob' }),
};

export function useProgramacion() {
  return useQuery({
    queryKey: ['programacion'],
    queryFn: () => programacionApi.listar().then((r) => r.data.data.registros),
  });
}

export function useProgramacionDia(dia) {
  return useQuery({
    queryKey: ['programacion', 'dia', dia],
    queryFn: () => programacionApi.listarPorDia(dia).then((r) => r.data.data.registros),
    enabled: !!dia,
  });
}

export function useImportarProgramacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: programacionApi.importar,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['programacion'] }),
  });
}
