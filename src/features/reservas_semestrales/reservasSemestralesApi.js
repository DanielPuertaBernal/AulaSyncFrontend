import apiClient from '@/shared/api/axios.client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

export const reservasSemestralesApi = {
  disponibilidad: (nombre_salon, dia) =>
    apiClient.get('/programacion/reservas-semestrales/disponibilidad', {
      params: { nombre_salon, dia },
    }),
  validar: (data) =>
    apiClient.post('/programacion/reservas-semestrales/validar', data),
  crear: (data) =>
    apiClient.post('/programacion/reservas-semestrales', data),
  todas: () =>
    apiClient.get('/programacion/reservas-semestrales/todas'),
  cancelarGrupo: (grupo_id) =>
    apiClient.delete(`/programacion/reservas-semestrales/grupo/${encodeURIComponent(grupo_id)}`),
  salonesDisponibles: (dia, hora_inicio, hora_fin) =>
    apiClient.get('/programacion/reservas-semestrales/salones-disponibles', {
      params: { dia, hora_inicio, hora_fin },
    }),
};

export function useDisponibilidadSemestral(nombre_salon, dia) {
  return useQuery({
    queryKey: ['reservas-semestrales', 'disponibilidad', nombre_salon, dia],
    queryFn: () =>
      reservasSemestralesApi.disponibilidad(nombre_salon, dia).then((r) => r.data.data),
    enabled: !!nombre_salon && !!dia,
    staleTime: 30 * 1000,
  });
}

export function useTodasReservasSemestrales() {
  return useQuery({
    queryKey: ['reservas-semestrales', 'todas'],
    queryFn: () =>
      reservasSemestralesApi.todas().then((r) => r.data.data.reservas),
  });
}

export function useCrearReservaSemestral() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reservasSemestralesApi.crear,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservas-semestrales'] });
    },
  });
}

export function useCancelarGrupoSemestral() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: reservasSemestralesApi.cancelarGrupo,
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['reservas-semestrales'] });
    },
  });
}

export function useValidarConflictosSemestral() {
  return useMutation({
    mutationFn: reservasSemestralesApi.validar,
  });
}

export function useSalonesDisponiblesSemestral(params) {
  return useQuery({
    queryKey: ['reservas-semestrales', 'salones-disponibles', params],
    queryFn: () =>
      reservasSemestralesApi
        .salonesDisponibles(params.dia, params.hora_inicio, params.hora_fin)
        .then((r) => r.data.data.salones || []),
    enabled: !!(params?.dia && params?.hora_inicio && params?.hora_fin),
  });
}
