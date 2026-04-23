import { useState } from 'react';
import { Link } from 'react-router-dom';
import DataTable from '@/shared/components/DataTable';
import {
  useHistorialNotificaciones,
  useEstadisticasNotificaciones,
  useReenviarNotificacion,
} from '../notificacionesApi';
import Swal from 'sweetalert2';
import { RefreshCw, MailCheck, MailX, Clock, ExternalLink } from 'lucide-react';
import StatusBadge from '@/shared/components/ui/StatusBadge';
import Button from '@/shared/components/ui/Button';
import { FormField, Input, Select } from '@/shared/components/ui/FormField';

export default function HistorialTab() {
  const [filters, setFilters] = useState({
    estado_envio: '',
    tipo_notificacion: '',
    busqueda: '',
  });
  const { data: registros = [], isLoading, refetch } = useHistorialNotificaciones(filters);
  const { data: stats } = useEstadisticasNotificaciones();
  const reenviar = useReenviarNotificacion();

  async function handleReenviar(row) {
    const result = await Swal.fire({
      title: 'Reenviar notificación',
      html: `<p style="font-size:14px">¿Reenviar a <b>${row.destinatario_nombre}</b> (${row.destinatario_correo})?</p>`,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, reenviar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2563eb',
    });
    if (!result.isConfirmed) return;
    try {
      await reenviar.mutateAsync(row._id);
      Swal.fire({ icon: 'success', title: 'Reenviado', timer: 1800, showConfirmButton: false });
    } catch (err) {
      Swal.fire({ icon: 'error', title: 'Error', text: err.response?.data?.message ?? 'No se pudo reenviar' });
    }
  }

  function abrirDetalles(row) {
    Swal.fire({
      title: 'Detalle de notificación',
      html: `
        <div style="text-align:left;font-size:14px;line-height:1.9">
          <b>Destinatario:</b> ${row.destinatario_nombre}<br/>
          <b>Documento:</b> ${row.destinatario_documento}<br/>
          <b>Correo:</b> ${row.destinatario_correo}<br/>
          <b>Salón:</b> ${row.salon || '—'}<br/>
          <b>Asunto:</b> ${row.asunto}<br/>
          <b>Tipo:</b> ${tipoLabel(row.tipo_notificacion)}<br/>
          <b>Estado:</b> ${row.estado_envio}<br/>
          ${row.error_envio ? `<b>Error:</b> ${row.error_envio}<br/>` : ''}
          ${row.numero_recordatorio ? `<b>Recordatorio #:</b> ${row.numero_recordatorio}<br/>` : ''}
          <b>Enviado por:</b> ${row.enviado_por}<br/>
          <b>Fecha:</b> ${new Date(row.fecha_envio).toLocaleString('es-CO')}
        </div>
      `,
      icon: 'info',
      confirmButtonText: 'Cerrar',
      confirmButtonColor: '#2563eb',
    });
  }

  function tipoLabel(tipo) {
    const map = {
      manual: 'Manual',
      vencimiento_inicial: 'Vencimiento inicial',
      recordatorio: 'Recordatorio automático',
    };
    return map[tipo] || tipo || '—';
  }

  const COLS = [
    {
      key: 'fecha_envio',
      label: 'Fecha',
      render: (v) => v ? new Date(v).toLocaleString('es-CO', { dateStyle: 'short', timeStyle: 'short' }) : '—',
    },
    { key: 'destinatario_nombre', label: 'Destinatario' },
    { key: 'destinatario_correo', label: 'Correo' },
    { key: 'salon', label: 'Salón' },
    {
      key: 'tipo_notificacion',
      label: 'Tipo',
      render: (v) => tipoLabel(v),
    },
    {
      key: 'estado_envio',
      label: 'Estado',
      render: (v, row) => {
        const badge = (
          <StatusBadge variant={v === 'enviado' ? 'success' : v === 'pendiente' ? 'warning' : 'danger'}>
            {v === 'enviado' ? 'Enviado' : v === 'pendiente' ? 'Pendiente' : 'Fallido'}
          </StatusBadge>
        );
        if (v === 'fallido' || v === 'pendiente') {
          return (
            <button
              title="Reenviar"
              onClick={(e) => { e.stopPropagation(); handleReenviar(row); }}
              className="cursor-pointer hover:opacity-75 transition-opacity"
            >
              {badge}
            </button>
          );
        }
        return badge;
      },
    },
    { key: 'enviado_por', label: 'Enviado por' },
    {
      key: 'prestamo_llave_id',
      label: 'Contexto',
      render: (v) => v
        ? <Link to="/gestion-salones" title="Ver préstamos de llaves" className="inline-flex items-center gap-1 text-primary hover:underline text-xs"><ExternalLink className="h-3 w-3" />Llaves</Link>
        : <span className="text-muted-foreground text-xs">—</span>,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <p className="text-muted-foreground text-sm">{registros.length} registros</p>
        <Button variant="outline" onClick={() => refetch()}>
          <RefreshCw className="h-4 w-4 mr-1" />Actualizar
        </Button>
      </div>

      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
            <MailCheck className="h-8 w-8 text-green-500" />
            <div>
              <p className="text-2xl font-bold">{stats.enviados ?? 0}</p>
              <p className="text-sm text-muted-foreground">Enviados</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
            <Clock className="h-8 w-8 text-yellow-500" />
            <div>
              <p className="text-2xl font-bold">{stats.pendientes ?? 0}</p>
              <p className="text-sm text-muted-foreground">Pendientes</p>
            </div>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 flex items-center gap-3">
            <MailX className="h-8 w-8 text-red-500" />
            <div>
              <p className="text-2xl font-bold">{stats.fallidos ?? 0}</p>
              <p className="text-sm text-muted-foreground">Fallidos</p>
            </div>
          </div>
        </div>
      )}

      <div className="bg-card border border-border rounded-lg p-4 flex gap-4 flex-wrap">
        <FormField label="Buscar">
          <Input
            placeholder="Nombre, documento o correo"
            value={filters.busqueda}
            onChange={(e) => setFilters((f) => ({ ...f, busqueda: e.target.value }))}
          />
        </FormField>
        <FormField label="Estado">
          <Select
            value={filters.estado_envio}
            onChange={(e) => setFilters((f) => ({ ...f, estado_envio: e.target.value }))}
          >
            <option value="">Todos</option>
            <option value="enviado">Enviado</option>
            <option value="pendiente">Pendiente</option>
            <option value="fallido">Fallido</option>
          </Select>
        </FormField>
        <FormField label="Tipo">
          <Select
            value={filters.tipo_notificacion}
            onChange={(e) => setFilters((f) => ({ ...f, tipo_notificacion: e.target.value }))}
          >
            <option value="">Todos</option>
            <option value="manual">Manual</option>
            <option value="vencimiento_inicial">Vencimiento inicial</option>
            <option value="recordatorio">Recordatorio</option>
          </Select>
        </FormField>
        <div className="flex items-end">
          <button
            onClick={() => setFilters({ estado_envio: '', tipo_notificacion: '', busqueda: '' })}
            className="text-sm text-muted-foreground hover:text-foreground underline pb-1"
          >
            Limpiar filtros
          </button>
        </div>
      </div>

      <DataTable
        columns={COLS}
        data={registros}
        loading={isLoading}
        searchable
        onRowClick={abrirDetalles}
      />
      <p className="text-xs text-muted-foreground text-center">Clic en una fila para ver detalles · Clic en estado fallido/pendiente para reenviar</p>
    </div>
  );
}
