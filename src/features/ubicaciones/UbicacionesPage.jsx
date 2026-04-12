import { useState } from 'react';
import DataTable from '@/shared/components/DataTableV2';
import {
  useUbicaciones,
  useCrearUbicacion,
  useActualizarUbicacion,
  useEliminarUbicacion,
} from './ubicacionesApi';
import { showError, showSuccess, showConfirm } from '@/shared/utils/alert';
import { MapPin, Info } from 'lucide-react';
import StatusBadge from '@/shared/components/ui/StatusBadge';
import Button from '@/shared/components/ui/Button';
import { FormField, Input, Textarea, Checkbox } from '@/shared/components/ui/FormField';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/shared/components/ui/Sheet';

function PermisosCell({ ubicacion }) {
  const permisos = [
    ubicacion.permite_identificacion && 'Identificación',
    ubicacion.permite_prestamo_llaves && 'Préstamo llaves',
    ubicacion.permite_devolucion_llaves && 'Devolución llaves',
    ubicacion.permite_prestamo_equipos && 'Préstamo equipos',
  ].filter(Boolean);

  if (!permisos.length) {
    return <span className="text-xs text-muted-foreground">Sin permisos operativos</span>;
  }

  return (
    <div className="flex flex-wrap gap-1">
      {permisos.map((permiso) => (
        <StatusBadge key={permiso} variant="info">{permiso}</StatusBadge>
      ))}
    </div>
  );
}

export default function UbicacionesPage() {
  const { data: ubicaciones = [], isLoading } = useUbicaciones({ incluirInactivas: true });
  const crear = useCrearUbicacion();
  const actualizar = useActualizarUbicacion();
  const eliminar = useEliminarUbicacion();

  const [sheetOpen, setSheetOpen] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState({});
  const [errors, setErrors] = useState({});

  function openSheet(ubicacion = null) {
    setEditItem(ubicacion);
    setErrors({});
    setForm({
      clave: ubicacion?.clave || '',
      nombre: ubicacion?.nombre || '',
      descripcion: ubicacion?.descripcion || '',
      activa: ubicacion?.activa ?? true,
      permite_identificacion: ubicacion?.permite_identificacion ?? false,
      permite_prestamo_llaves: ubicacion?.permite_prestamo_llaves ?? false,
      permite_devolucion_llaves: ubicacion?.permite_devolucion_llaves ?? false,
      permite_prestamo_equipos: ubicacion?.permite_prestamo_equipos ?? false,
    });
    setSheetOpen(true);
  }

  function closeSheet() {
    setSheetOpen(false);
    setEditItem(null);
    setForm({});
    setErrors({});
  }

  function updateForm(key, value) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function guardar() {
    const errs = {};
    if (!editItem && !form.clave?.trim()) errs.clave = 'La clave es requerida';
    if (!form.nombre?.trim()) errs.nombre = 'El nombre es requerido';
    if (Object.keys(errs).length) { setErrors(errs); return; }

    const payload = {
      ...(editItem ? {} : { clave: form.clave.trim() }),
      nombre: form.nombre.trim(),
      descripcion: form.descripcion?.trim() || '',
      activa: form.activa,
      permite_identificacion: form.permite_identificacion,
      permite_prestamo_llaves: form.permite_prestamo_llaves,
      permite_devolucion_llaves: form.permite_devolucion_llaves,
      permite_prestamo_equipos: form.permite_prestamo_equipos,
    };

    try {
      if (editItem?._id) {
        await actualizar.mutateAsync({ id: editItem._id, ...payload });
        showSuccess('Ubicación actualizada correctamente');
      } else {
        await crear.mutateAsync(payload);
        showSuccess('Ubicación creada correctamente');
      }
      closeSheet();
    } catch (error) {
      showError(error.response?.data?.message || 'No se pudo guardar la ubicación');
    }
  }

  async function onEliminar(ubicacion) {
    const { isConfirmed } = await showConfirm('Eliminar ubicación', `¿Desea eliminar la ubicación ${ubicacion.nombre}?`);
    if (!isConfirmed) return;
    try {
      await eliminar.mutateAsync(ubicacion._id);
      showSuccess('Ubicación eliminada correctamente');
    } catch (error) {
      showError(error.response?.data?.message || 'No se pudo eliminar la ubicación');
    }
  }

  const isSaving = crear.isPending || actualizar.isPending;

  const columns = [
    { key: 'clave', label: 'Clave' },
    { key: 'nombre', label: 'Nombre' },
    { key: 'descripcion', label: 'Descripción' },
    {
      key: 'activa',
      label: 'Estado',
      render: (value) => (
        <StatusBadge variant={value ? 'success' : 'neutral'}>
          {value ? 'Activa' : 'Inactiva'}
        </StatusBadge>
      ),
    },
    {
      key: '_permisos',
      label: 'Permisos',
      render: (_value, row) => <PermisosCell ubicacion={row} />,
    },
    {
      key: '_acciones',
      label: 'Acciones',
      className: 'text-center',
      render: (_value, row) => (
        <div className="flex gap-2 justify-center">
          <Button variant="warning" size="sm" onClick={() => openSheet(row)}>Editar</Button>
          <Button variant="destructive" size="sm" onClick={() => onEliminar(row)}>Borrar</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <MapPin className="h-6 w-6" />
            Ubicaciones operativas
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Administra los puntos autorizados para identificación NFC, préstamo y devolución de llaves.
          </p>
        </div>
        <Button onClick={() => openSheet()}>+ Nueva ubicación</Button>
      </div>

      <div className="flex items-start gap-2 bg-primary/5 border border-primary/10 rounded-xl p-4 text-sm text-foreground">
        <Info className="h-4 w-4 mt-0.5 text-primary shrink-0" />
        Solo el <strong className="mx-1">administrador</strong> puede crear, editar, activar o eliminar estos puntos operativos.
      </div>

      <DataTable columns={columns} data={ubicaciones} loading={isLoading} searchable />

      {/* Sheet lateral */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>{editItem ? 'Editar' : 'Nueva'} ubicación operativa</SheetTitle>
            <SheetDescription>Complete los datos de la ubicación.</SheetDescription>
          </SheetHeader>

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Clave" required={!editItem} error={errors.clave}>
                <Input
                  placeholder="Ej: porteria_inferior"
                  value={form.clave || ''}
                  onChange={(e) => updateForm('clave', e.target.value)}
                  disabled={!!editItem}
                />
              </FormField>
              <FormField label="Nombre" required error={errors.nombre}>
                <Input
                  placeholder="Ej: Portería Inferior"
                  value={form.nombre || ''}
                  onChange={(e) => updateForm('nombre', e.target.value)}
                />
              </FormField>
            </div>
            <FormField label="Descripción">
              <Textarea
                placeholder="Descripción operativa"
                value={form.descripcion || ''}
                onChange={(e) => updateForm('descripcion', e.target.value)}
              />
            </FormField>
            <div className="bg-muted rounded-lg p-4 space-y-3">
              <p className="text-sm font-medium text-foreground">Permisos y estado</p>
              <div className="grid grid-cols-2 gap-3">
                <Checkbox label="Ubicación activa" checked={form.activa || false} onChange={(e) => updateForm('activa', e.target.checked)} />
                <Checkbox label="Permite identificación NFC" checked={form.permite_identificacion || false} onChange={(e) => updateForm('permite_identificacion', e.target.checked)} />
                <Checkbox label="Permite préstamo de llaves" checked={form.permite_prestamo_llaves || false} onChange={(e) => updateForm('permite_prestamo_llaves', e.target.checked)} />
                <Checkbox label="Permite devolución de llaves" checked={form.permite_devolucion_llaves || false} onChange={(e) => updateForm('permite_devolucion_llaves', e.target.checked)} />
                <Checkbox label="Permite préstamo de equipos" checked={form.permite_prestamo_equipos || false} onChange={(e) => updateForm('permite_prestamo_equipos', e.target.checked)} />
              </div>
            </div>
          </div>

          <SheetFooter>
            <Button variant="outline" onClick={closeSheet}>Cancelar</Button>
            <Button onClick={guardar} disabled={isSaving}>
              {isSaving ? 'Guardando...' : editItem ? 'Guardar cambios' : 'Crear ubicación'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
