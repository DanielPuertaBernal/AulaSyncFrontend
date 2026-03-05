import { useState } from 'react';
import DataTable from '@/shared/components/DataTable';
import FileUploader from '@/shared/components/FileUploader';
import { useAuthStore } from '@/features/auth/authStore';
import { ROLES } from '@/shared/constants';
import { useProgramacion, useProgramacionDia, useImportarProgramacion, programacionApi } from './programacionApi';
import { showSuccess, showError } from '@/shared/utils/alert';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const COLUMNAS = [
  { key: 'numero_documento', label: 'Documento' },
  { key: 'docente', label: 'Docente' },
  { key: 'dia', label: 'Día' },
  { key: 'horario', label: 'Horario' },
  { key: 'aula', label: 'Aula' },
  { key: 'facultad', label: 'Facultad' },
  { key: 'materia', label: 'Materia' },
];

export default function ProgramacionPage() {
  const { usuario } = useAuthStore();
  const isAdmin = usuario?.rol === ROLES.ADMIN;
  const [vistaCompleta, setVistaCompleta] = useState(isAdmin);
  const today = DIAS[new Date().getDay() - 1] || 'Lunes';
  const [diaSeleccionado, setDiaSeleccionado] = useState(today);

  const { data: completa = [], isLoading: loadingCompleta } = useProgramacion();
  const { data: porDia = [], isLoading: loadingDia } = useProgramacionDia(
    vistaCompleta ? null : diaSeleccionado
  );
  const importar = useImportarProgramacion();

  const registros = vistaCompleta ? completa : porDia;
  const loading = vistaCompleta ? loadingCompleta : loadingDia;

  function handleImportar(file) {
    importar.mutate(file, {
      onSuccess: (res) => showSuccess(res.data?.message || 'Importación exitosa'),
      onError: (err) => showError(err.response?.data?.message || 'Error al importar'),
    });
  }

  async function handleExportar() {
    const res = await programacionApi.exportar();
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'programacion.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800"><i className="fa-solid fa-calendar-days mr-2" />Programación Académica</h1>
          <p className="text-gray-500 text-sm">{registros.length} clases cargadas</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <>
              <FileUploader
                onFile={handleImportar}
                loading={importar.isPending}
                label="Importar Excel"
              />
              <button
                onClick={handleExportar}
                className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                <i className="fa-solid fa-file-export mr-1" />Exportar
              </button>
            </>
          )}
          {isAdmin && (
            <button
              onClick={() => setVistaCompleta((v) => !v)}
              className="text-sm border px-4 py-2 rounded-lg hover:bg-gray-100"
            >
              {vistaCompleta ? 'Ver por día' : 'Ver completa'}
            </button>
          )}
        </div>
      </div>

      {/* Filtro por día (solo en vista auxiliar o cuando se filtra) */}
      {!vistaCompleta && (
        <div className="flex gap-2 flex-wrap">
          {DIAS.map((dia) => (
            <button
              key={dia}
              onClick={() => setDiaSeleccionado(dia)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                diaSeleccionado === dia
                  ? 'bg-primary text-white'
                  : 'bg-white border hover:bg-gray-50'
              }`}
            >
              {dia}
            </button>
          ))}
        </div>
      )}

      <DataTable columns={COLUMNAS} data={registros} loading={loading} searchable exportable exportFileName="programacion" />
    </div>
  );
}
