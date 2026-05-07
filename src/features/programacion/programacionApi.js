import apiClient from '@/shared/api/axios.client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const programacionApi = {
  listar: (semestre = null) =>
    apiClient.get('/programacion', semestre ? { params: { semestre } } : {}),
  listarPorDia: (dia, clasesConLlave = [], semestre = null) =>
    apiClient.get(`/programacion/dia/${dia}`, {
      params: {
        clasesConLlave: JSON.stringify(clasesConLlave),
        ...(semestre ? { semestre } : {}),
      },
    }),
  listarSemestres: () => apiClient.get('/programacion/semestres'),
  listarSemestreVigente: () => apiClient.get('/programacion/semestres/vigente'),
  eliminarSemestre: (codigo) => apiClient.delete(`/programacion/semestres/${encodeURIComponent(codigo)}`),
  actualizarFechasSemestre: (codigo, data) =>
    apiClient.patch(`/programacion/semestres/${encodeURIComponent(codigo)}/fechas`, data),
  importar: (file) => {
    const fd = new FormData();
    fd.append('archivo', file);
    return apiClient.post('/programacion/importar', fd);
  },
  exportar: (semestre = null) =>
    apiClient.get('/programacion/exportar', {
      responseType: 'blob',
      ...(semestre ? { params: { semestre } } : {}),
    }),
};

export function useProgramacion(semestre = null) {
  return useQuery({
    queryKey: ['programacion', semestre],
    queryFn: () => programacionApi.listar(semestre).then((r) => r.data.data.registros),
  });
}

export function useProgramacionDia(dia, semestre = null) {
  return useQuery({
    queryKey: ['programacion', 'dia', dia, semestre],
    queryFn: () => programacionApi.listarPorDia(dia, [], semestre).then((r) => r.data.data.registros),
    enabled: !!dia,
  });
}

export function useSemestres() {
  return useQuery({
    queryKey: ['programacion', 'semestres'],
    queryFn: () => programacionApi.listarSemestres().then((r) => r.data.data.semestres),
  });
}

export function useSemestreVigente() {
  return useQuery({
    queryKey: ['programacion', 'semestres', 'vigente'],
    queryFn: () => programacionApi.listarSemestreVigente().then((r) => r.data.data.semestre),
  });
}

export function useImportarProgramacion() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: programacionApi.importar,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['programacion'] });
    },
  });
}

export function useEliminarSemestre() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (codigo) => programacionApi.eliminarSemestre(codigo),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['programacion'] });
    },
  });
}

export function useActualizarFechasSemestre() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ codigo, fecha_inicio, fecha_fin }) =>
      programacionApi.actualizarFechasSemestre(codigo, { fecha_inicio, fecha_fin }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['programacion', 'semestres'] });
    },
  });
}
