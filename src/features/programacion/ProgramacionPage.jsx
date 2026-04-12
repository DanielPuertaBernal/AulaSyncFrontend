import { useState } from 'react';
import DataTable from '@/shared/components/DataTable';
import FileUploader from '@/shared/components/FileUploader';
import { useAuthStore } from '@/features/auth/authStore';
import { ROLES } from '@/shared/constants';
import { useProgramacion, useProgramacionDia, useImportarProgramacion, programacionApi } from './programacionApi';
import { useEntregarLlave } from '@/features/llaves/llavesApi';
import Swal from 'sweetalert2';
import { showSuccess, showError } from '@/shared/utils/alert';
import { CalendarDays, FileDown, Key } from 'lucide-react';
import Button from '@/shared/components/ui/Button';
import { cn } from '@/shared/lib/utils';

const DIAS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

const COLUMNAS_BASE = [
  { key: 'numero_documento', label: 'Documento' },
  { key: 'docente', label: 'Docente' },
  { key: 'dia', label: 'Día' },
  { key: 'horario', label: 'Horario' },
  { key: 'aula', label: 'Aula' },
  { key: 'facultad', label: 'Facultad', className: 'whitespace-normal max-w-[200px]' },
  { key: 'materia', label: 'Materia', className: 'whitespace-normal max-w-[200px]' },
];

export default function ProgramacionPage() {
  const { usuario } = useAuthStore();
  const isAdmin = usuario?.rol === ROLES.ADMIN;
  const [vistaCompleta, setVistaCompleta] = useState(isAdmin);
  const today = DIAS[new Date().getDay() - 1] || 'Lunes';
  const [diaSeleccionado, setDiaSeleccionado] = useState(today);

  const { data: completa = [], isLoading: loadingCompleta } = useProgramacion();
  const entregarLlave = useEntregarLlave();
  const { data: porDia = [], isLoading: loadingDia } = useProgramacionDia(
    vistaCompleta ? null : diaSeleccionado
  );
  const importar = useImportarProgramacion();

  const registros = vistaCompleta ? completa : porDia;
  const loading = vistaCompleta ? loadingCompleta : loadingDia;

  function parseHoraAminutos(hora) {
    const parts = String(hora || '').trim().split(':');
    if (parts.length < 2) return null;
    const h = parseInt(parts[0], 10);
    const m = parseInt(parts[1], 10);
    if (Number.isNaN(h) || Number.isNaN(m)) return null;
    return h * 60 + m;
  }

  function obtenerInicioClase(clase) {
    if (clase.hora_inicio) return clase.hora_inicio;
    const partesHorario = String(clase.horario || '').toUpperCase().split(' A ');
    return partesHorario[0]?.trim() || '';
  }

  async function handleEntregarDesdeTabla(clase) {
    const inicio = obtenerInicioClase(clase);
    const minutosInicio = parseHoraAminutos(inicio);
    const ahora = new Date();
    const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
    const esAnticipado = minutosInicio !== null && minutosAhora < (minutosInicio - 30);

    if (esAnticipado) {
      const alertaAnticipado = await Swal.fire({
        title: 'Reclamo muy temprano',
        text: 'Este reclamo es con mas de 30 minutos de anticipacion a la clase. Desea continuar?',
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: 'Si, continuar',
        cancelButtonText: 'Cancelar',
        confirmButtonColor: '#d97706',
        cancelButtonColor: '#6b7280',
      });
      if (!alertaAnticipado.isConfirmed) return;
    }

    const confirm = await Swal.fire({
      title: 'Entregar llave',
      html: `
        <div style="text-align:left;font-size:14px;line-height:2">
          <b>Docente:</b> ${clase.docente || '—'}<br/>
          <b>Documento:</b> ${clase.numero_documento || '—'}<br/>
          <b>Materia:</b> ${clase.materia || '—'}<br/>
          <b>Aula:</b> ${clase.aula || '—'}<br/>
          <b>Horario:</b> ${clase.horario || '—'}<br/>
          <b>Día:</b> ${clase.dia || '—'}
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Sí, entregar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#6b7280',
    });
    if (!confirm.isConfirmed) return;
    try {
      await entregarLlave.mutateAsync({
        nroidenti: clase.numero_documento,
        profesor: clase.docente,
        aula: clase.aula,
        facultad: clase.facultad || '',
        hora_inicio: clase.hora_inicio || '',
        hora_fin: clase.hora_fin || '',
        motivo: clase.materia || '',
        origen: 'programacion',
      });
      showSuccess(`Llave entregada a ${clase.docente}`);
    } catch (err) {
      showError(err.response?.data?.message || 'Error al entregar la llave');
    }
  }

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
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <CalendarDays className="h-6 w-6" />
            Programación Académica
          </h1>
          <p className="text-muted-foreground text-sm">{registros.length} clases cargadas</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <>
              <FileUploader
                onFile={handleImportar}
                loading={importar.isPending}
                label="Importar Excel"
              />
              <Button variant="success" onClick={handleExportar}>
                <FileDown className="h-4 w-4 mr-1" />Exportar
              </Button>
            </>
          )}
          {isAdmin && (
            <Button variant="outline" onClick={() => setVistaCompleta((v) => !v)}>
              {vistaCompleta ? 'Ver por día' : 'Ver completa'}
            </Button>
          )}
        </div>
      </div>

      {/* Filtro por día */}
      {!vistaCompleta && (
        <div className="flex gap-2 flex-wrap">
          {DIAS.map((dia) => (
            <button
              key={dia}
              onClick={() => setDiaSeleccionado(dia)}
              className={cn(
                'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                diaSeleccionado === dia
                  ? 'bg-primary text-primary-foreground'
                  : 'bg-card border border-border text-foreground hover:bg-muted'
              )}
            >
              {dia}
            </button>
          ))}
        </div>
      )}

      <DataTable
        columns={[
          ...COLUMNAS_BASE,
          ...(!vistaCompleta ? [{
            key: '_entregar',
            label: 'Llave',
            render: (_v, row) => (
              <Button variant="outline" size="sm" onClick={() => handleEntregarDesdeTabla(row)} disabled={entregarLlave.isPending}>
                <Key className="h-3.5 w-3.5 mr-1" />Entregar
              </Button>
            ),
          }] : []),
        ]}
        data={registros}
        loading={loading}
        searchable
        exportable
        exportFileName="programacion"
      />
    </div>
  );
}
