import { useState } from 'react';
import { useForm } from 'react-hook-form';
import DataTable from '@/shared/components/DataTable';
import { useEquipos, useCrearEquipo, useActualizarEquipo } from './equiposApi';
import { showSuccess, showError } from '@/shared/utils/alert';

const COLS = [
  { key: 'nombre', label: 'Nombre' },
  { key: 'marca', label: 'Marca' },
  { key: 'codigo_inventario', label: 'Código Inventario' },
  { key: 'codigo_barras', label: 'Código Barras' },
  { key: 'consecutivo', label: 'Consecutivo' },
  {
    key: 'estado',
    label: 'Estado',
    render: (v) => (
      <span
        className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          v === 'activo' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
        }`}
      >
        {v}
      </span>
    ),
  },
];

export default function EquiposPage() {
  const [showForm, setShowForm] = useState(false);
  const { data: equipos = [], isLoading } = useEquipos();
  const crear = useCrearEquipo();
  const actualizar = useActualizarEquipo();
  const { register, handleSubmit, reset, formState: { errors } } = useForm();

  async function onCrear(data) {
    try {
      await crear.mutateAsync(data);
      reset();
      setShowForm(false);
      showSuccess('Equipo registrado correctamente');
    } catch (err) {
      showError(err.response?.data?.message || 'Error al crear equipo');
    }
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-800"><i className="fa-solid fa-desktop mr-2" />Equipos</h1>
          <p className="text-gray-500 text-sm">{equipos.length} equipos en inventario</p>
        </div>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="bg-primary text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary-dark"
        >
          {showForm ? 'Cancelar' : '+ Nuevo Equipo'}
        </button>
      </div>

      {showForm && (
        <div className="bg-white rounded-lg shadow p-6 max-w-lg">
          <h2 className="font-semibold text-gray-800 mb-4">Registrar nuevo equipo</h2>
          <form onSubmit={handleSubmit(onCrear)} className="space-y-3">
            {[
              { name: 'nombre', label: 'Nombre del equipo', required: true },
              { name: 'marca', label: 'Marca' },
              { name: 'consecutivo', label: 'Consecutivo (número)', required: true },
              { name: 'codigo_inventario', label: 'Código de inventario', required: true },
              { name: 'descripcion', label: 'Descripción' },
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
              disabled={crear.isPending}
              className="w-full bg-primary text-white py-2 rounded-lg font-medium hover:bg-primary-dark disabled:opacity-60"
            >
              {crear.isPending ? 'Guardando...' : 'Registrar Equipo'}
            </button>
          </form>
        </div>
      )}

      <DataTable columns={COLS} data={equipos} loading={isLoading} searchable exportable exportFileName="equipos" />
    </div>
  );
}
