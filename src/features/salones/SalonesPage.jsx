import { useState } from 'react';
import DataTable from '@/shared/components/DataTableV2';
import {
  useSalones,
  useCrearSalon,
  useActualizarSalon,
  useEliminarSalon,
} from './salonesApi';
import {
  useBloques,
  useCrearBloque,
  useActualizarBloque,
  useEliminarBloque,
} from '@/features/bloques/bloquesApi';
import { showSuccess, showError, showConfirm } from '@/shared/utils/alert';
import { School, Building2, DoorOpen } from 'lucide-react';
import Button from '@/shared/components/ui/Button';
import { FormField, Input, Select } from '@/shared/components/ui/FormField';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/shared/components/ui/Sheet';
import { cn } from '@/shared/lib/utils';

export default function SalonesPage() {
  const [seccion, setSeccion] = useState('bloques');
  const { data: salones = [], isLoading: loadingSalones } = useSalones();
  const { data: bloques = [], isLoading: loadingBloques } = useBloques();

  const crearSalon = useCrearSalon();
  const actualizarSalon = useActualizarSalon();
  const eliminarSalon = useEliminarSalon();
  const crearBloque = useCrearBloque();
  const actualizarBloque = useActualizarBloque();
  const eliminarBloque = useEliminarBloque();

  // Sheet state
  const [sheetOpen, setSheetOpen] = useState(false);
  const [sheetType, setSheetType] = useState('bloque'); // 'bloque' | 'salon'
  const [editItem, setEditItem] = useState(null);

  // Form state
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});

  function openSheet(type, item = null) {
    setSheetType(type);
    setEditItem(item);
    setErrors({});
    if (type === 'bloque') {
      setForm({ nombre_bloque: item?.nombre_bloque || '' });
    } else {
      setForm({
        nombre_salon: item?.nombre_salon || '',
        nombre_bloque: item?.nombre_bloque || '',
        capacidad_estudiantes: item?.capacidad_estudiantes || '',
        tipo_silleteria: item?.tipo_silleteria || '',
      });
    }
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
    setEditItem(null);
    setForm({});
    setErrors({});
  }

  // ── BLOQUES ──────────────────────────────────────────────────
  async function guardarBloque() {
    const nombre = form.nombre_bloque?.trim();
    if (!nombre) {
      setErrors({ nombre_bloque: 'El nombre del bloque es requerido' });
      return;
    }
    try {
      if (editItem?._id) {
        await actualizarBloque.mutateAsync({ id: editItem._id, nombre_bloque: nombre });
        showSuccess('Bloque actualizado correctamente');
      } else {
        await crearBloque.mutateAsync({ nombre_bloque: nombre });
        showSuccess('Bloque creado correctamente');
      }
      closeSheet();
    } catch (e) {
      showError(e.response?.data?.message || 'Error al guardar bloque');
    }
  }

  async function onEliminarBloque(bloque) {
    const enUso = salones.some(
      (s) =>
        String(s.nombre_bloque || '').toUpperCase() ===
        String(bloque.nombre_bloque || '').toUpperCase()
    );
    if (enUso) {
      showError('No se puede eliminar un bloque que está asignado a salones');
      return;
    }
    const { isConfirmed } = await showConfirm('Eliminar bloque', `¿Desea eliminar el bloque ${bloque.nombre_bloque}?`);
    if (!isConfirmed) return;
    try {
      await eliminarBloque.mutateAsync(bloque._id);
      showSuccess('Bloque eliminado correctamente');
    } catch (e) {
      showError(e.response?.data?.message || 'Error al eliminar bloque');
    }
  }

  // ── SALONES ──────────────────────────────────────────────────
  async function guardarSalon() {
    const errs = {};
    if (!form.nombre_salon?.trim()) errs.nombre_salon = 'El nombre del salón es requerido';
    if (!form.nombre_bloque?.trim()) errs.nombre_bloque = 'Seleccione un bloque';
    if (!form.capacidad_estudiantes || Number(form.capacidad_estudiantes) < 1) errs.capacidad_estudiantes = 'La capacidad debe ser mayor que 0';
    if (!form.tipo_silleteria?.trim()) errs.tipo_silleteria = 'El tipo de silletería es requerido';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const payload = {
      nombre_salon: form.nombre_salon.trim(),
      nombre_bloque: form.nombre_bloque.trim(),
      capacidad_estudiantes: Number(form.capacidad_estudiantes),
      tipo_silleteria: form.tipo_silleteria.trim(),
    };

    try {
      if (editItem?._id) {
        await actualizarSalon.mutateAsync({ id: editItem._id, ...payload });
        showSuccess('Salón actualizado correctamente');
      } else {
        await crearSalon.mutateAsync(payload);
        showSuccess('Salón creado correctamente');
      }
      closeSheet();
    } catch (e) {
      showError(e.response?.data?.message || 'Error al guardar salón');
    }
  }

  async function onEliminarSalon(salon) {
    const { isConfirmed } = await showConfirm('Eliminar salón', `¿Desea eliminar el salón ${salon.nombre_salon}?`);
    if (!isConfirmed) return;
    try {
      await eliminarSalon.mutateAsync(salon._id);
      showSuccess('Salón eliminado correctamente');
    } catch (e) {
      showError(e.response?.data?.message || 'Error al eliminar salón');
    }
  }

  const bloqueColumns = [
    { key: 'nombre_bloque', label: 'Bloque' },
    {
      key: '_acciones',
      label: 'Acciones',
      className: 'text-center',
      render: (_v, row) => (
        <div className="flex gap-2 justify-center">
          <Button variant="warning" size="sm" onClick={() => openSheet('bloque', row)}>Editar</Button>
          <Button variant="destructive" size="sm" onClick={() => onEliminarBloque(row)}>Borrar</Button>
        </div>
      ),
    },
  ];

  const salonColumns = [
    { key: 'nombre_salon', label: 'Salón' },
    { key: 'nombre_bloque', label: 'Bloque' },
    { key: 'capacidad_estudiantes', label: 'Estudiantes' },
    { key: 'tipo_silleteria', label: 'Silletería' },
    {
      key: '_acciones',
      label: 'Acciones',
      className: 'text-center',
      render: (_v, row) => (
        <div className="flex gap-2 justify-center">
          <Button variant="warning" size="sm" onClick={() => openSheet('salon', row)}>Editar</Button>
          <Button variant="destructive" size="sm" onClick={() => onEliminarSalon(row)}>Borrar</Button>
        </div>
      ),
    },
  ];

  const isSaving = crearBloque.isPending || actualizarBloque.isPending || crearSalon.isPending || actualizarSalon.isPending;

  return (
    <div className="space-y-5">
      {/* Título */}
      <div>
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <School className="h-6 w-6" />
          Gestión de Salones
        </h1>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-border">
        {[
          { id: 'bloques', icon: Building2, label: 'Bloques', count: bloques.length },
          { id: 'salones', icon: DoorOpen, label: 'Salones', count: salones.length },
        ].map(({ id, icon: Icon, label, count }) => (
          <button
            key={id}
            onClick={() => setSeccion(id)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors',
              seccion === id
                ? 'border-b-2 border-primary text-primary'
                : 'text-muted-foreground hover:text-foreground'
            )}
          >
            <Icon className="h-4 w-4" />{label} ({count})
          </button>
        ))}
      </div>

      {/* Bloques */}
      {seccion === 'bloques' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <Building2 className="h-5 w-5" />Bloques
              </h2>
              <p className="text-muted-foreground text-sm">{bloques.length} registrados</p>
            </div>
            <Button onClick={() => openSheet('bloque')}>+ Nuevo bloque</Button>
          </div>
          <DataTable columns={bloqueColumns} data={bloques} loading={loadingBloques} searchable />
        </div>
      )}

      {/* Salones */}
      {seccion === 'salones' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg font-bold text-foreground flex items-center gap-2">
                <DoorOpen className="h-5 w-5" />Salones
              </h2>
              <p className="text-muted-foreground text-sm">{salones.length} registrados</p>
            </div>
            <Button onClick={() => openSheet('salon')}>+ Nuevo salón</Button>
          </div>
          <DataTable columns={salonColumns} data={salones} loading={loadingSalones} searchable />
        </div>
      )}

      {/* Sheet lateral para formularios */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>
              {editItem ? 'Editar' : 'Nuevo'} {sheetType === 'bloque' ? 'bloque' : 'salón'}
            </SheetTitle>
            <SheetDescription>
              {sheetType === 'bloque'
                ? 'Complete los datos del bloque.'
                : 'Complete los datos del salón.'}
            </SheetDescription>
          </SheetHeader>

          {sheetType === 'bloque' ? (
            <div className="space-y-4">
              <FormField label="Nombre del Bloque" required error={errors.nombre_bloque}>
                <Input
                  placeholder="Ej: Bloque A"
                  value={form.nombre_bloque || ''}
                  onChange={(e) => setForm({ ...form, nombre_bloque: e.target.value })}
                />
              </FormField>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Nombre Salón" required error={errors.nombre_salon}>
                <Input
                  placeholder="Ej: S-101"
                  value={form.nombre_salon || ''}
                  onChange={(e) => setForm({ ...form, nombre_salon: e.target.value })}
                />
              </FormField>
              <FormField label="Bloque" required error={errors.nombre_bloque}>
                <Select
                  value={form.nombre_bloque || ''}
                  onChange={(e) => setForm({ ...form, nombre_bloque: e.target.value })}
                >
                  <option value="">Seleccione un bloque...</option>
                  {bloques.map((b) => (
                    <option key={b._id} value={b.nombre_bloque}>{b.nombre_bloque}</option>
                  ))}
                </Select>
              </FormField>
              <FormField label="Capacidad (estudiantes)" required error={errors.capacidad_estudiantes}>
                <Input
                  type="number"
                  min="1"
                  placeholder="Ej: 30"
                  value={form.capacidad_estudiantes || ''}
                  onChange={(e) => setForm({ ...form, capacidad_estudiantes: e.target.value })}
                />
              </FormField>
              <FormField label="Tipo de Silletería" required error={errors.tipo_silleteria}>
                <Input
                  placeholder="Ej: Universitaria"
                  value={form.tipo_silleteria || ''}
                  onChange={(e) => setForm({ ...form, tipo_silleteria: e.target.value })}
                />
              </FormField>
            </div>
          )}

          <SheetFooter>
            <Button variant="outline" onClick={closeSheet}>Cancelar</Button>
            <Button
              onClick={sheetType === 'bloque' ? guardarBloque : guardarSalon}
              disabled={isSaving}
            >
              {isSaving ? 'Guardando...' : editItem ? 'Actualizar' : 'Agregar'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
