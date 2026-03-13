import { useState } from 'react';
import DataTable from '@/shared/components/DataTable';
import { useHistorialLlaves, useDevolverLlave, llavesApi } from '@/features/llaves/llavesApi';
import Swal from 'sweetalert2';

export default function HistorialPage() {
  const [filters, setFilters] = useState({ fecha: '', estado: '' });
  const { data: registros = [], isLoading, refetch } = useHistorialLlaves(filters);
  const devolverLlave = useDevolverLlave();

  async function handleDevolucion(row) {
    const result = await Swal.fire({
      title: 'Registrar devolución',
      html: `
        <div style="text-align:left;font-size:14px;line-height:2">
          <b>Docente:</b> ${row.docente ?? '—'}<br/>
          <b>Documento:</b> ${row.documento ?? '—'}<br/>
          <b>Aula:</b> ${row.aula ?? '—'}<br/>
          <b>Horario:</b> ${row.horario ?? '—'}<br/>
          <b>Materia:</b> ${row.materia ?? '—'}
        </div>
      `,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, devolver',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#16a34a',
      cancelButtonColor: '#6b7280',
    });
    if (!result.isConfirmed) return;
    try {
      await devolverLlave.mutateAsync(row.documento);
      Swal.fire({ icon: 'success', title: 'Devolución registrada', timer: 1800, showConfirmButton: false });
      refetch();
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message ?? 'No se pudo registrar la devolución' });
    }
  }

  const COLS = [
    { key: 'documento', label: 'Documento' },
    { key: 'docente', label: 'Docente' },
    { key: 'aula', label: 'Aula' },
    { key: 'horario', label: 'Horario' },
    { key: 'fechaEntrega', label: 'F. Entrega' },
    { key: 'horaEntrega', label: 'H. Entrega' },
    { key: 'fechaDevolucion', label: 'F. Devolución' },
    { key: 'horaDevolucion', label: 'H. Devolución' },
    { key: 'duracion', label: 'Duración' },
    {
      key: 'seReclamoATiempo',
      label: 'Reclamo a tiempo',
      render: (v) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          v ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'
        }`}>
          {v ? 'Si' : 'No'}
        </span>
      ),
    },
    {
      key: 'tiempoRetraso',
      label: 'Tiempo Retraso',
      render: (v) => (
        <span className="text-xs text-gray-700">
          {v ? v : '—'}
        </span>
      ),
    },
    {
      key: 'tipoEntrega',
      label: 'Tipo Entrega',
      render: (v) => (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
          v === 'manual' ? 'bg-blue-100 text-blue-800'
          : v === 'carnet' ? 'bg-purple-100 text-purple-800'
          : 'bg-gray-100 text-gray-800'
        }`}>
          {v === 'manual' ? 'Manual' : v === 'carnet' ? 'Carnet NFC' : '—'}
        </span>
      ),
    },
    {
      key: 'estado',
      label: 'Estado',
      render: (v, row) => {
        const badge = (
          <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
            v === 'en_prestamo' ? 'bg-yellow-100 text-yellow-800'
            : v === 'demora_entrega' ? 'bg-red-100 text-red-800'
            : 'bg-green-100 text-green-800'
          }`}>
            {v === 'en_prestamo' ? 'En Préstamo' : v === 'demora_entrega' ? 'Demora' : 'Entregado'}
          </span>
        );
        if (v === 'en_prestamo') {
          return (
            <button
              title="Registrar devolución"
              onClick={() => handleDevolucion(row)}
              className="cursor-pointer hover:opacity-75 transition-opacity"
            >
              {badge}
            </button>
          );
        }
        return badge;
      },
    },
  ];

  async function handleExport() {
    const res = await llavesApi.exportarHistorial(filters);
    const url = URL.createObjectURL(res.data);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'historial_llaves.xlsx';
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800"><i className="fa-solid fa-chart-column mr-2" />Historial de Llaves</h1>
          <p className="text-gray-500 text-sm">{registros.length} registros</p>
        </div>
        <button
          onClick={handleExport}
          className="text-sm bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700"
        >
          <i className="fa-solid fa-file-export mr-1" />Exportar Excel
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-lg shadow p-4 flex gap-4 flex-wrap">
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
          <input
            type="date"
            value={filters.fecha}
            onChange={(e) => setFilters((f) => ({ ...f, fecha: e.target.value }))}
            className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-600 mb-1">Estado</label>
          <select
            value={filters.estado}
            onChange={(e) => setFilters((f) => ({ ...f, estado: e.target.value }))}
            className="border rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          >
            <option value="">Todos</option>
            <option value="en_prestamo">En Préstamo</option>
            <option value="entregado">Entregado</option>
            <option value="demora_entrega">Demora Entrega</option>
          </select>
        </div>
        <div className="flex items-end">
          <button
            onClick={() => { setFilters({ fecha: '', estado: '' }); }}
            className="text-sm text-gray-500 hover:text-gray-700 underline pb-1"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      <DataTable columns={COLS} data={registros} loading={isLoading} searchable exportable exportFileName="historial" />
    </div>
  );
}
