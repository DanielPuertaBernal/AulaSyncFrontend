import { CalendarDays, Clock, Loader2, CreditCard, CheckCircle2, Search } from 'lucide-react';
import Button from '@/shared/components/ui/Button';
import { FormField, Input, Select } from '@/shared/components/ui/FormField';
import { cn } from '@/shared/lib/utils';
import DisponibilidadAgenda from '@/shared/components/DisponibilidadAgenda';

export default function ReservasNuevaTab({
  form, setForm,
  bloques, salonesFiltrados,
  disponibilidad,
  solicitanteEncontrado, setSolicitanteEncontrado,
  responsableEncontrado, setResponsableEncontrado,
  buscandoPersona,
  objetivoEscaneo,
  enCola, posicionCola, intencionActiva,
  handleCrear, cerrarForm,
  handleSlotClick,
  buscarPersona,
  isPendingCrear,
  editando,
  handleGuardarEdicion,
  isPendingEditar,
}) {
  const editModo = editando?.modo ?? null;
  const isReadonly = editModo === 'en_curso';
  return (
    <div className="bg-card border-2 border-primary/30 rounded-xl p-5">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* ── Columna izquierda: formulario ── */}
        <div className="space-y-4">
          <div>
            <h2 className="font-semibold">
              {editModo === 'en_curso' ? 'Editando reserva en curso' : editModo === 'completo' ? 'Editando reserva' : 'Nueva reserva'}
            </h2>
            {!isReadonly && (
              <p className="text-xs text-muted-foreground">Atajo: presiona F1 para buscar por nombre cuando no tengas documento o NFC.</p>
            )}
          </div>

          {/* Indicador NFC */}
          {isReadonly ? (
            <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg border bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400">
              <CheckCircle2 className="h-4 w-4 shrink-0" />
              Modo edición restringida — solo la hora de fin es modificable
            </div>
          ) : (
            <div className={cn(
              'flex items-center gap-2 text-sm px-3 py-2 rounded-lg border',
              (objetivoEscaneo === 'responsable' ? responsableEncontrado : solicitanteEncontrado)
                ? 'bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800 text-green-700 dark:text-green-400'
                : enCola
                  ? 'bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-400'
                  : intencionActiva
                    ? 'bg-primary/5 border-primary/20 text-primary'
                    : 'bg-muted border-border text-muted-foreground'
            )}>
              {(objetivoEscaneo === 'responsable' ? responsableEncontrado : solicitanteEncontrado)
                ? <CheckCircle2 className="h-4 w-4 shrink-0" />
                : enCola
                  ? <Clock className="h-4 w-4 shrink-0" />
                  : intencionActiva
                    ? <CreditCard className="h-4 w-4 shrink-0" />
                    : <Loader2 className="h-4 w-4 animate-spin shrink-0" />}
              {buscandoPersona
                ? 'Buscando...'
                : (objetivoEscaneo === 'responsable' ? responsableEncontrado : solicitanteEncontrado)
                  ? `${objetivoEscaneo === 'responsable' ? 'Profesor responsable' : 'Solicitante'}: ${(objetivoEscaneo === 'responsable' ? responsableEncontrado : solicitanteEncontrado)?.nombre}`
                  : enCola
                    ? `En cola, posición ${posicionCola || '—'} — esperando lector...`
                    : intencionActiva
                      ? `Lector listo — acerque el carnet de ${objetivoEscaneo === 'responsable' ? 'profesor responsable' : 'solicitante'}`
                      : 'Conectando con lector NFC...'}
            </div>
          )}

          {/* Campos del formulario */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <FormField label="Documento solicitante">
              <div className="flex gap-1">
                <Input
                  value={form.solicitante_documento}
                  onChange={(e) => {
                    setForm((f) => ({
                      ...f,
                      solicitante_documento: e.target.value,
                      solicitante_nombre: '',
                      tipo_solicitante: 'docente',
                      responsable_documento: '',
                      responsable_nombre: '',
                    }));
                    setSolicitanteEncontrado(null);
                    setResponsableEncontrado(null);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && buscarPersona(form.solicitante_documento, 'solicitante')}
                  placeholder="Escanee carnet o escriba documento"
                  disabled={isReadonly}
                />
                <button
                  type="button"
                  onClick={() => buscarPersona(form.solicitante_documento, 'solicitante')}
                  disabled={buscandoPersona || isReadonly}
                  className="px-2 rounded border border-border bg-muted hover:bg-accent transition-colors disabled:opacity-50"
                  title="Buscar persona"
                >
                  {buscandoPersona ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                </button>
              </div>
            </FormField>
            <FormField label="Nombre solicitante">
              <div className="relative">
                <Input
                  value={form.solicitante_nombre}
                  onChange={(e) => setForm((f) => ({ ...f, solicitante_nombre: e.target.value }))}
                  placeholder="Nombre completo"
                  disabled={isReadonly}
                />
                {solicitanteEncontrado && (
                  <CheckCircle2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                )}
              </div>
            </FormField>
            {form.tipo_solicitante === 'estudiante' && (
              <>
                <FormField label="NFC / Documento profesor responsable">
                  <div className="flex gap-1">
                    <Input
                      value={form.responsable_documento}
                      onChange={(e) => { setForm((f) => ({ ...f, responsable_documento: e.target.value })); setResponsableEncontrado(null); }}
                      onKeyDown={(e) => e.key === 'Enter' && buscarPersona(form.responsable_documento, 'responsable')}
                      placeholder="Escanee NFC o escriba documento"
                      disabled={isReadonly}
                    />
                    <button
                      type="button"
                      onClick={() => buscarPersona(form.responsable_documento, 'responsable')}
                      disabled={buscandoPersona || isReadonly}
                      className="px-2 rounded border border-border bg-muted hover:bg-accent transition-colors disabled:opacity-50"
                      title="Buscar profesor responsable"
                    >
                      {buscandoPersona ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
                    </button>
                  </div>
                </FormField>
                <FormField label="Nombre profesor responsable">
                  <div className="relative">
                    <Input
                      value={form.responsable_nombre}
                      onChange={(e) => setForm((f) => ({ ...f, responsable_nombre: e.target.value }))}
                      placeholder="Nombre del profesor responsable"
                      disabled={isReadonly}
                    />
                    {responsableEncontrado && (
                      <CheckCircle2 className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-green-500" />
                    )}
                  </div>
                </FormField>
              </>
            )}
            <FormField label="Bloque">
              <Select
                value={form.nombre_bloque}
                onChange={(e) => setForm((f) => ({ ...f, nombre_bloque: e.target.value, nombre_salon: '' }))}
                disabled={isReadonly}
              >
                <option value="">Seleccionar bloque</option>
                {bloques.map((b) => (
                  <option key={b.nombre_bloque} value={b.nombre_bloque}>{b.nombre_bloque}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Salón">
              <Select
                value={form.nombre_salon}
                onChange={(e) => setForm((f) => ({ ...f, nombre_salon: e.target.value }))}
                disabled={!form.nombre_bloque || isReadonly}
              >
                <option value="">Seleccionar salón</option>
                {salonesFiltrados.map((s) => (
                  <option key={s.nombre_salon} value={s.nombre_salon}>{s.nombre_salon}</option>
                ))}
              </Select>
            </FormField>
            <FormField label="Fecha">
              <Input
                type="date"
                value={form.fecha}
                onChange={(e) => setForm((f) => ({ ...f, fecha: e.target.value }))}
                disabled={isReadonly}
              />
            </FormField>
            <FormField label="Motivo">
              <Input
                value={form.motivo}
                onChange={(e) => setForm((f) => ({ ...f, motivo: e.target.value }))}
                placeholder="Ej: Reunión, clase extra..."
                disabled={isReadonly}
              />
            </FormField>
            {editModo === null && <FormField label="Entrega de llave al momento" className="sm:col-span-2">
              <button
                type="button"
                onClick={() => setForm((f) => ({ ...f, entregar_llave: !f.entregar_llave }))}
                className={cn(
                  'flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-colors w-full',
                  form.entregar_llave ? 'border-primary bg-primary/5 text-primary' : 'border-border bg-muted text-muted-foreground'
                )}
              >
                <span className={cn('w-8 h-4 rounded-full transition-colors relative shrink-0', form.entregar_llave ? 'bg-primary' : 'bg-muted-foreground/30')}>
                  <span className={cn('absolute top-0.5 w-3 h-3 rounded-full bg-white transition-all', form.entregar_llave ? 'left-4' : 'left-0.5')} />
                </span>
                {form.entregar_llave ? 'Sí, entregar llave ahora' : 'No — reclamará por NFC después'}
              </button>
            </FormField>}
          </div>

          <div className="flex gap-2 pt-2">
            {editModo !== null ? (
              <Button onClick={handleGuardarEdicion} disabled={isPendingEditar}>
                {isPendingEditar ? 'Guardando...' : 'Guardar cambios'}
              </Button>
            ) : (
              <Button onClick={handleCrear} disabled={isPendingCrear}>
                {isPendingCrear ? 'Creando...' : 'Crear reserva'}
              </Button>
            )}
            <Button variant="outline" onClick={cerrarForm}>Cancelar</Button>
          </div>
        </div>

        {/* ── Columna derecha: disponibilidad ── */}
        <div className="space-y-3">
          {!form.nombre_salon || !form.fecha ? (
            <div className="flex flex-col items-center justify-center h-full min-h-[300px] border-2 border-dashed border-border rounded-xl text-muted-foreground text-sm text-center p-8 gap-2">
              <CalendarDays className="h-8 w-8 opacity-30" />
              <p>Selecciona un <strong>salón</strong> y una <strong>fecha</strong> para ver la disponibilidad</p>
            </div>
          ) : !disponibilidad?.slots ? (
            <div className="flex items-center justify-center h-full min-h-[300px] border border-border rounded-xl">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : (
            <>
              {/* Inputs de tiempo */}
              <div>
                <p className="text-sm font-semibold mb-2">Horario de la reserva</p>
                <div className="flex gap-3 items-end flex-wrap">
                  <FormField label="Hora inicio" className="flex-1 min-w-[120px]">
                    <Input
                      type="time"
                      value={form.hora_inicio}
                      min="06:00"
                      max="23:30"
                      step="1800"
                      onChange={(e) => setForm((f) => ({ ...f, hora_inicio: e.target.value }))}
                      disabled={isReadonly}
                    />
                  </FormField>
                  <FormField label="Hora fin" className="flex-1 min-w-[120px]">
                    <Input
                      type="time"
                      value={form.hora_fin}
                      min={form.hora_inicio || '06:30'}
                      step="1800"
                      onChange={(e) => setForm((f) => ({ ...f, hora_fin: e.target.value }))}
                    />
                  </FormField>
                  {form.hora_inicio && form.hora_fin && (() => {
                    const [h1, m1] = form.hora_inicio.split(':').map(Number);
                    const [h2, m2] = form.hora_fin.split(':').map(Number);
                    const mins = h2 * 60 + m2 - h1 * 60 - m1;
                    if (mins <= 0) return (
                      <p className="text-sm text-destructive self-end pb-2 whitespace-nowrap">
                        La hora fin debe ser posterior a la hora inicio
                      </p>
                    );
                    const hrs = Math.floor(mins / 60);
                    const minRest = mins % 60;
                    return (
                      <p className="text-sm text-muted-foreground self-end pb-2 whitespace-nowrap">
                        {hrs > 0 ? `${hrs}h ` : ''}{minRest > 0 ? `${minRest} min` : ''}
                      </p>
                    );
                  })()}
                </div>
              </div>

              <DisponibilidadAgenda
                slots={disponibilidad.slots}
                horaInicio={form.hora_inicio}
                horaFin={form.hora_fin}
                onSlotClick={handleSlotClick}
              />
            </>
          )}
        </div>

      </div>
    </div>

  );
}
