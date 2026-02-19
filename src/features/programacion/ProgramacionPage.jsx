import { useState } from 'react';
import DataTable from '@/shared/components/DataTable';
import FileUploader from '@/shared/components/FileUploader';
import { useAuthStore } from '@/features/auth/authStore';
import { ROLES } from '@/shared/constants';
import { useProgramacion, useProgramacionDia, useImportarProgramacion, programacionApi } from './programacionApi';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const COLUMNAS = [
  { key: 'Número de Documento', label: 'Documento' },
  { key: 'Docente', label: 'Docente' },
  { key: 'Día', label: 'Día' },
  { key: 'Horario', label: 'Horario' },
  { key: 'Aula', label: 'Aula' },
  { key: 'Facultad', label: 'Facultad' },
  { key: 'Materia de la Clase', label: 'Materia' },
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
          <h1 className="text-2xl font-bold text-gray-800">📅 Programación Académica</h1>
          <p className="text-gray-500 text-sm">{registros.length} clases cargadas</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <>
              <FileUploader
                onFile={(f) => importar.mutate(f)}
                loading={importar.isPending}
                label="Importar Excel"
              />
              <button
                onClick={handleExportar}
                className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
              >
                📥 Exportar
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

      {/* Feedback importación */}
      {importar.isSuccess && (
        <div className="bg-green-50 border border-green-200 text-green-700 px-4 py-2 rounded-lg text-sm">
          ✅ {importar.data?.data?.message}
        </div>
      )}
      {importar.isError && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-2 rounded-lg text-sm">
          ❌ {importar.error?.response?.data?.message || 'Error al importar'}
        </div>
      )}

      <DataTable columns={COLUMNAS} data={registros} loading={loading} searchable exportable exportFileName="programacion" />
    </div>
  );
}
