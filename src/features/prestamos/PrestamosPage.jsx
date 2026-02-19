import { useState } from 'react';
import { useForm } from 'react-hook-form';
import DataTable from '@/shared/components/DataTable';
import { usePrestamosActivos, useCrearPrestamo, useRegistrarDevolucion } from './prestamosApi';
import { useEquiposDisponibles } from '@/features/equipos/equiposApi';

function EstadoBadge({ estado }) {
  const map = {
    activo: 'bg-yellow-100 text-yellow-800',
    parcialmente_devuelto: 'bg-orange-100 text-orange-800',
    completamente_devuelto: 'bg-green-100 text-green-800',
  };
  return (
    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${map[estado] || ''}`}>
      {estado?.replace(/_/g, ' ')}
    </span>
  );
}

const COLS = [
  { key: 'docente_nombre', label: 'Docente' },
  { key: 'docente_codigo_nfc', label: 'Código NFC' },
  { key: 'auxiliar_prestamista', label: 'Auxiliar' },
  {
    key: 'equipos',
    label: 'Equipos',
    render: (v) => <span>{Array.isArray(v) ? v.map((e) => e.equipo_nombre).join(', ') : '—'}</span>,
  },
  { key: 'estado', label: 'Estado', render: (v) => <EstadoBadge estado={v} /> },
  {
    key: '_accion',
    label: 'Devolver',
    render: (_, row) =>
      row.estado !== 'completamente_devuelto' ? <DevolucionBtn prestamo={row} /> : null,
  },
];

function DevolucionBtn({ prestamo }) {
  const devolver = useRegistrarDevolucion();
  return (
    <button
      onClick={() =>
        devolver.mutate({
          prestamo_id: String(prestamo._id),
          docente_codigo_nfc: prestamo.docente_codigo_nfc,
          docente_nombre: prestamo.docente_nombre,
          equipos: [],
        })
      }
      disabled={devolver.isPending}
      className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 disabled:opacity-60"
    >
      Devolver todo
    </button>
  );
}

export default function PrestamosPage() {
  const [showForm, setShowForm] = useState(false);
  const { data: prestamos = [], isLoading } = usePrestamosActivos();
  const { data: equiposDisponibles = [] } = useEquiposDisponibles();
  const crear = useCrearPrestamo();
  const [equiposSeleccionados, setEquiposSeleccionados] = useState([]);
  const { register, handleSubmit, reset } = useForm();

  function toggleEquipo(id) {
    setEquiposSeleccionados((prev) =>
      prev.includes(id) ? prev.filter((e) => e !== id) : [...prev, id]
    );
  }

  async function onCrear(data) {
    if (!equiposSeleccionados.length) return alert('Seleccione al menos un equipo');
    try {
      await crear.mutateAsync({ ...data, equipos: equiposSeleccionados });
      reset();
      setEquiposSeleccionados([]);
      setShowForm(false);
    } catch { /* manejado en UI */ }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">📦 Préstamos de Equipos</h1>
          <p className="text-gray-500 text-sm">{prestamos.length} activos</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark"
        >
          {showForm ? 'Cancelar' : '+ Nuevo Préstamo'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 max-w-xl">
          <h2 className="font-semibold text-gray-800 mb-4">Registrar préstamo</h2>
          {crear.isError && (
            <div className="mb-3 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              ❌ {crear.error?.response?.data?.message}
            </div>
          )}
          <form onSubmit={handleSubmit(onCrear)} className="space-y-3">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Código NFC Docente</label>
              <input {...register('docente_codigo_nfc', { required: true })} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Docente</label>
              <input {...register('docente_nombre', { required: true })} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Equipos disponibles</label>
              <div className="max-h-40 overflow-y-auto border rounded-lg p-2 space-y-1">
                {equiposDisponibles.map((eq) => (
                  <label key={String(eq._id)} className="flex items-center gap-2 text-sm cursor-pointer">
                    <input
                      type="checkbox"
                      checked={equiposSeleccionados.includes(String(eq._id))}
                      onChange={() => toggleEquipo(String(eq._id))}
                      className="accent-primary"
                    />
                    {eq.nombre} — {eq.marca} ({eq.codigo_inventario})
                  </label>
                ))}
                {!equiposDisponibles.length && (
                  <p className="text-gray-400 text-sm py-2 text-center">No hay equipos disponibles</p>
                )}
              </div>
            </div>
            <button
              type="submit"
              disabled={crear.isPending}
              className="w-full bg-primary text-white py-2 rounded-lg font-medium hover:bg-primary-dark disabled:opacity-60"
            >
              {crear.isPending ? 'Registrando...' : 'Registrar Préstamo'}
            </button>
          </form>
        </div>
      )}

      <DataTable columns={COLS} data={prestamos} loading={isLoading} searchable />
    </div>
  );
}
