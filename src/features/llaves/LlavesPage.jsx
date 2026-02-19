import { useState } from 'react';
import { useForm } from 'react-hook-form';
import DataTable from '@/shared/components/DataTable';
import { useLlavesPendientes, useEntregarLlave, useDevolverLlave, llavesApi } from './llavesApi';

const COLS_PENDIENTES = [
  { key: 'documento', label: 'Documento' },
  { key: 'docente', label: 'Docente' },
  { key: 'aula', label: 'Aula' },
  { key: 'horario', label: 'Horario' },
  { key: 'fechaEntrega', label: 'F. Entrega' },
  { key: 'horaEntrega', label: 'H. Entrega' },
  {
    key: 'estado',
    label: 'Estado',
    render: (v) => (
      <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-800">{v}</span>
    ),
  },
  {
    key: '_accion',
    label: 'Acción',
    render: (_, row) => <DevolucionBtn documento={row.documento} nombre={row.docente} />,
  },
];

function DevolucionBtn({ documento, nombre }) {
  const devolver = useDevolverLlave();
  return (
    <button
      onClick={() => devolver.mutate(documento)}
      disabled={devolver.isPending}
      className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 disabled:opacity-60"
    >
      Devolver
    </button>
  );
}

export default function LlavesPage() {
  const [tab, setTab] = useState('pendientes');
  const { data: pendientes = [], isLoading } = useLlavesPendientes();
  const entregar = useEntregarLlave();
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  async function onEntregar(data) {
    try {
      await entregar.mutateAsync(data);
      reset();
    } catch { /* error manejado en UI */ }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-800">🔑 Gestión de Llaves</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {['pendientes', 'entregar'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'pendientes' ? `🔒 Pendientes (${pendientes.length})` : '🔓 Entregar Llave'}
          </button>
        ))}
      </div>

      {tab === 'pendientes' && (
        <DataTable
          columns={COLS_PENDIENTES}
          data={pendientes}
          loading={isLoading}
          searchable
          exportable
          exportFileName="llaves_pendientes"
        />
      )}

      {tab === 'entregar' && (
        <div className="bg-white rounded-lg shadow p-6 max-w-lg">
          <h2 className="font-semibold text-gray-800 mb-4">Registrar entrega de llave</h2>
          {entregar.isSuccess && (
            <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm px-3 py-2 rounded-lg">
              ✅ {entregar.data?.data?.message}
            </div>
          )}
          {entregar.isError && (
            <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">
              ❌ {entregar.error?.response?.data?.message || 'Error'}
            </div>
          )}
          <form onSubmit={handleSubmit(onEntregar)} className="space-y-3">
            {[
              { name: 'nroidenti', label: 'Nro. Documento', required: true },
              { name: 'profesor', label: 'Nombre Docente', required: true },
              { name: 'aula', label: 'Aula', required: true },
              { name: 'horario', label: 'Horario (ej: 07:00 A 09:00)' },
              { name: 'facultad', label: 'Facultad' },
              { name: 'materia', label: 'Materia' },
            ].map(({ name, label, required }) => (
              <div key={name}>
                <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
                <input
                  {...register(name, required ? { required: `${label} es requerido` } : {})}
                  className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                {errors[name] && <p className="text-red-500 text-xs mt-1">{errors[name].message}</p>}
              </div>
            ))}
            <button
              type="submit"
              disabled={entregar.isPending}
              className="w-full bg-primary text-white py-2 rounded-lg font-medium hover:bg-primary-dark disabled:opacity-60"
            >
              {entregar.isPending ? 'Registrando...' : 'Registrar Entrega'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
