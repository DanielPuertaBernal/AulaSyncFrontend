import { useState } from 'react';
import DataTable from '@/shared/components/DataTable';
import FileUploader from '@/shared/components/FileUploader';
import { useAuthStore } from '@/features/auth/authStore';
import { ROLES } from '@/shared/constants';
import {
  useProgramacion,
  useProgramacionDia,
  useImportarProgramacion,
  useSemestres,
  useSemestreVigente,
  useEliminarSemestre,
  useActualizarFechasSemestre,
  programacionApi,
} from './programacionApi';
import { useEntregarLlave } from '@/features/llaves/llavesApi';
import Swal from 'sweetalert2';
import { showSuccess, showError } from '@/shared/utils/alert';
import { CalendarDays, FileDown, Key, ChevronLeft, BookOpen, Trash2, Pencil } from 'lucide-react';
import Button from '@/shared/components/ui/Button';
import { FormField, Input } from '@/shared/components/ui/FormField';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/shared/components/ui/Dialog';
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

/** Formatea una fecha ISO a "dd/mm/yyyy" */
function formatFecha(fecha) {
  if (!fecha) return '—';
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleDateString('es-CO', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Convierte una fecha ISO a "YYYY-MM-DD" para inputs type=date */
function fechaToInput(fecha) {
  if (!fecha) return '';
  const d = new Date(fecha);
  if (Number.isNaN(d.getTime())) return '';
  return d.toISOString().slice(0, 10);
}

// ---------------------------------------------------------------------------
// Vista de tabla para un semestre específico (admin drilldown o aux vigente)
// ---------------------------------------------------------------------------
function VistaSemestre({ semestre, onVolver, isAdmin }) {
  const today = DIAS[new Date().getDay() - 1] || 'Lunes';
  const [vistaCompleta, setVistaCompleta] = useState(isAdmin);
  const [diaSeleccionado, setDiaSeleccionado] = useState(today);

  const { data: completa = [], isLoading: loadingCompleta } = useProgramacion(semestre.codigo);
  const { data: porDia = [], isLoading: loadingDia } = useProgramacionDia(
    vistaCompleta ? null : diaSeleccionado,
    semestre.codigo
  );
  const entregarLlave = useEntregarLlave();

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
    return String(clase.horario || '').toUpperCase().split(' A ')[0]?.trim() || '';
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
      confirmButtonColor: '#059669',
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

  async function handleExportarSemestre() {
    try {
      const res = await programacionApi.exportar(semestre.codigo);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = `programacion_${semestre.codigo}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      showError('Error al exportar la programación');
    }
  }

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          {isAdmin && (
            <Button variant="ghost" size="sm" onClick={onVolver} className="gap-1">
              <ChevronLeft className="h-4 w-4" />Semestres
            </Button>
          )}
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <CalendarDays className="h-6 w-6" />
              Programación — Semestre {semestre.codigo}
            </h1>
            <p className="text-muted-foreground text-sm">
              {formatFecha(semestre.fecha_inicio)} al {formatFecha(semestre.fecha_fin)}
              {' · '}{registros.length} clases
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {isAdmin && (
            <Button variant="success" onClick={handleExportarSemestre}>
              <FileDown className="h-4 w-4 mr-1" />Exportar semestre
            </Button>
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
        exportFileName={`programacion_${semestre.codigo}`}
      />
    </div>
  );
}

// ---------------------------------------------------------------------------
// Modal para editar fechas de un semestre
// ---------------------------------------------------------------------------
function ModalEditarFechas({ semestre, onClose }) {
  const editarFechas = useActualizarFechasSemestre();
  const [inicio, setInicio] = useState(fechaToInput(semestre?.fecha_inicio));
  const [fin, setFin] = useState(fechaToInput(semestre?.fecha_fin));
  const [error, setError] = useState('');

  async function handleGuardar(e) {
    e.preventDefault();
    setError('');
    if (!inicio || !fin) { setError('Completa ambas fechas'); return; }
    if (inicio >= fin) { setError('La fecha de inicio debe ser anterior a la fecha de fin'); return; }
    try {
      await editarFechas.mutateAsync({ codigo: semestre.codigo, fecha_inicio: inicio, fecha_fin: fin });
      showSuccess('Fechas actualizadas correctamente');
      onClose();
    } catch (err) {
      setError(err.response?.data?.message || 'Error al actualizar las fechas');
    }
  }

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <CalendarDays className="h-4 w-4 text-primary" />
          Editar fechas — Semestre {semestre?.codigo}
        </DialogTitle>
        <DialogDescription>
          Ajusta el rango de fechas del semestre. Este rango determina cuándo se considera vigente.
        </DialogDescription>
      </DialogHeader>

      <form onSubmit={handleGuardar} className="space-y-4">
        <FormField label="Fecha de inicio" htmlFor="edit-fecha-inicio" required>
          <Input
            id="edit-fecha-inicio"
            type="date"
            value={inicio}
            onChange={(e) => { setInicio(e.target.value); setError(''); }}
          />
        </FormField>

        <FormField label="Fecha de fin" htmlFor="edit-fecha-fin" required>
          <Input
            id="edit-fecha-fin"
            type="date"
            value={fin}
            onChange={(e) => { setFin(e.target.value); setError(''); }}
          />
        </FormField>

        {error && (
          <p className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-md px-3 py-2">
            {error}
          </p>
        )}

        <DialogFooter>
          <DialogClose asChild>
            <Button type="button" variant="outline" size="sm">Cancelar</Button>
          </DialogClose>
          <Button type="submit" size="sm" disabled={editarFechas.isPending}>
            {editarFechas.isPending ? 'Guardando…' : 'Guardar cambios'}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

// ---------------------------------------------------------------------------
// Tarjetas de semestres (solo admin)
// ---------------------------------------------------------------------------
function TarjetasSemestres({ semestres, loading, onSeleccionar, importar, onImportar }) {
  const eliminar = useEliminarSemestre();
  const [semestreEditando, setSemestreEditando] = useState(null);

  async function handleEliminar(sem, e) {
    e.stopPropagation();
    const confirm = await Swal.fire({
      title: `¿Eliminar semestre ${sem.codigo}?`,
      text: `Se eliminarán ${sem.total_registros} registros de programación. Esta acción no se puede deshacer.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: 'Sí, eliminar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
    });
    if (!confirm.isConfirmed) return;
    try {
      await eliminar.mutateAsync(sem.codigo);
      showSuccess(`Semestre ${sem.codigo} eliminado`);
    } catch (err) {
      showError(err.response?.data?.message || 'Error al eliminar el semestre');
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-36 bg-card border border-border rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <>
      {/* Modal editar fechas */}
      <Dialog open={!!semestreEditando} onOpenChange={(open) => !open && setSemestreEditando(null)}>
        {semestreEditando && (
          <ModalEditarFechas
            semestre={semestreEditando}
            onClose={() => setSemestreEditando(null)}
          />
        )}
      </Dialog>

      <div className="space-y-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
              <CalendarDays className="h-6 w-6" />
              Programación Académica
            </h1>
            <p className="text-muted-foreground text-sm">{semestres.length} semestres cargados</p>
          </div>
          <FileUploader
            onFile={onImportar}
            loading={importar.isPending}
            label="Importar Excel"
          />
        </div>

        {semestres.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <BookOpen className="h-12 w-12 opacity-30" />
            <p className="text-sm">No hay semestres cargados. Importa un archivo Excel para comenzar.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {semestres.map((sem) => (
              <div
                key={sem.codigo}
                onClick={() => onSeleccionar(sem)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => e.key === 'Enter' && onSeleccionar(sem)}
                className="group text-left p-5 bg-card border border-border rounded-xl hover:border-primary hover:shadow-md transition-all space-y-3 cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-primary"
              >
                <div className="flex items-start justify-between gap-2">
                  <span className="text-xl font-bold text-foreground group-hover:text-primary transition-colors">
                    {sem.codigo}
                  </span>
                  <div className="flex items-center gap-1">
                    <span className="text-[11px] bg-primary/10 text-primary px-2 py-0.5 rounded-full font-medium">
                      {sem.total_registros} registros
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setSemestreEditando(sem); }}
                      title="Editar fechas"
                      className="p-1 rounded text-muted-foreground hover:text-primary hover:bg-primary/10 transition-colors"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      onClick={(e) => handleEliminar(sem, e)}
                      title="Eliminar semestre"
                      disabled={eliminar.isPending}
                      className="p-1 rounded text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors disabled:opacity-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p>
                    <span className="font-medium text-foreground/70">Inicio:</span>{' '}
                    {formatFecha(sem.fecha_inicio)}
                  </p>
                  <p>
                    <span className="font-medium text-foreground/70">Fin:</span>{' '}
                    {formatFecha(sem.fecha_fin)}
                  </p>
                </div>
                <p className="text-[11px] text-muted-foreground/60">
                  Cargado: {formatFecha(sem.fecha_carga)}
                  {sem.cargado_por ? ` · ${sem.cargado_por}` : ''}
                </p>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// ---------------------------------------------------------------------------
// Página principal
// ---------------------------------------------------------------------------
export default function ProgramacionPage() {
  const { usuario } = useAuthStore();
  const isAdmin = usuario?.rol === ROLES.ADMIN;

  // Admin: navega entre semestres
  const [semestreSeleccionado, setSemestreSeleccionado] = useState(null);
  const { data: semestres = [], isLoading: loadingSemestres } = useSemestres();

  // Aux: obtiene el semestre vigente automáticamente
  const { data: vigente } = useSemestreVigente();

  const importar = useImportarProgramacion();

  function handleImportar(file) {
    importar.mutate(file, {
      onSuccess: (res) => showSuccess(res.data?.message || 'Importación exitosa'),
      onError: (err) => showError(err.response?.data?.message || 'Error al importar'),
    });
  }

  // Auxiliar: siempre ve el semestre vigente
  if (!isAdmin) {
    if (!vigente) {
      return (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <CalendarDays className="h-12 w-12 opacity-30" />
          <p className="text-sm">No hay semestre vigente disponible.</p>
        </div>
      );
    }
    return <VistaSemestre semestre={vigente} onVolver={null} isAdmin={false} />;
  }

  // Admin: drilldown en semestre seleccionado
  if (semestreSeleccionado) {
    return (
      <VistaSemestre
        semestre={semestreSeleccionado}
        onVolver={() => setSemestreSeleccionado(null)}
        isAdmin
      />
    );
  }

  // Admin: vista de tarjetas de semestres
  return (
    <TarjetasSemestres
      semestres={semestres}
      loading={loadingSemestres}
      onSeleccionar={setSemestreSeleccionado}
      importar={importar}
      onImportar={handleImportar}
    />
  );
}
