import { useState } from 'react';
import DataTable from '@/shared/components/DataTable';
import { useHistorialLlaves, useDevolverLlave, llavesApi } from '@/features/llaves/llavesApi';
import { useUbicacionesOperativas } from '@/shared/hooks/useUbicacionesOperativas';
import { UBICACIONES } from '@/shared/constants';
import Swal from 'sweetalert2';
import { BarChart3, FileDown } from 'lucide-react';
import StatusBadge from '@/shared/components/ui/StatusBadge';
import Button from '@/shared/components/ui/Button';
import { FormField, Input, Select } from '@/shared/components/ui/FormField';

export default function HistorialPage() {
  const [filters, setFilters] = useState({ fecha: '', estado: '' });
  const { data: registros = [], isLoading, refetch } = useHistorialLlaves(filters);
  const { getUbicacionLabel } = useUbicacionesOperativas();
  const devolverLlave = useDevolverLlave();

  function textoReclamoATiempo(v) {
    return v ? 'Si' : 'No';
  }

  function textoTipoEntrega(v) {
    if (v === 'manual') return 'Manual';
    if (v === 'carnet') return 'Carnet NFC';
    return '—';
  }

  function abrirDetalles(row) {
    Swal.fire({
      title: 'Detalles del registro',
      html: `
        <div style="text-align:left;font-size:14px;line-height:1.9">
          <b>Ubic. Préstamo:</b> ${getUbicacionLabel(row.ubicacionPrestamo)}<br/>
          <b>Ubic. Devolución:</b> ${getUbicacionLabel(row.ubicacionDevolucion)}<br/>
          <b>Duración:</b> ${row.duracion || '—'}<br/>
          <b>Reclamo a tiempo:</b> ${textoReclamoATiempo(row.seReclamoATiempo)}<br/>
          <b>Tiempo Retraso:</b> ${row.tiempoRetraso || '—'}<br/>
          <b>Tipo Entrega:</b> ${textoTipoEntrega(row.tipoEntrega)}
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#059669',
    });
  }

  async function handleDevolucion(row) {
    const result = await Swal.fire({
      title: 'Registrar devolución',
      html: `
        <div style="text-align:left;font-size:14px;line-height:2">
          <b>Docente:</b> ${row.docente ?? '—'}<br/>
          <b>Documento:</b> ${row.documento ?? '—'}<br/>
          <b>Aula:</b> ${row.aula ?? '—'}<br/>
          <b>Horario:</b> ${row.horario ?? '—'}<br/>
          <b>Materia:</b> ${row.materia ?? '—'}<br/>
          <b>Ubicación devolución:</b> ${getUbicacionLabel(UBICACIONES.OFICINA)}<br/>
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
      await devolverLlave.mutateAsync({ documento: row.documento, ubicacion: UBICACIONES.OFICINA });
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
    {
      key: 'estado',
      label: 'Estado',
      render: (v, row) => {
        const badge = (
          <StatusBadge variant={
            v === 'en_prestamo' ? 'warning'
            : v === 'en_mora' ? 'orange'
            : v === 'demora_entrega' ? 'danger'
            : 'success'
          }>
            {v === 'en_prestamo' ? 'En Préstamo' : v === 'en_mora' ? 'En Mora' : v === 'demora_entrega' ? 'Entrega en mora' : 'Entregado'}
          </StatusBadge>
        );
        if (v === 'en_prestamo' || v === 'en_mora' || v === 'demora_entrega') {
          return (
            <button
              title="Registrar devolución"
              onClick={(e) => { e.stopPropagation(); handleDevolucion(row); }}
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
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <BarChart3 className="h-6 w-6" />
            Historial de Llaves
          </h1>
          <p className="text-muted-foreground text-sm">{registros.length} registros</p>
        </div>
        <Button variant="success" onClick={handleExport}>
          <FileDown className="h-4 w-4 mr-1" />Exportar Excel
        </Button>
      </div>

      {/* Filtros */}
      <div className="bg-card border border-border rounded-lg p-4 flex gap-4 flex-wrap">
        <FormField label="Fecha">
          <Input
            type="date"
            value={filters.fecha}
            onChange={(e) => setFilters((f) => ({ ...f, fecha: e.target.value }))}
          />
        </FormField>
        <FormField label="Estado">
          <Select
            value={filters.estado}
            onChange={(e) => setFilters((f) => ({ ...f, estado: e.target.value }))}
          >
            <option value="">Todos</option>
            <option value="en_prestamo">En Préstamo</option>
            <option value="en_mora">En Mora</option>
            <option value="entregado">Entregado</option>
            <option value="demora_entrega">Entrega en mora</option>
          </Select>
        </FormField>
        <div className="flex items-end">
          <button
            onClick={() => { setFilters({ fecha: '', estado: '' }); }}
            className="text-sm text-muted-foreground hover:text-foreground underline pb-1"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      <DataTable columns={COLS} data={registros} loading={isLoading} searchable exportable exportFileName="historial" onRowClick={abrirDetalles} />
      <p className="text-xs text-muted-foreground text-center">Clic en una fila para ver detalles completos</p>
    </div>
  );
}
