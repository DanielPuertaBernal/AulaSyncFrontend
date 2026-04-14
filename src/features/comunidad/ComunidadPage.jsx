import DataTable from '@/shared/components/DataTable';
import { useComunidad } from './comunidadApi';
import { Users } from 'lucide-react';
import StatusBadge from '@/shared/components/ui/StatusBadge';

const TIPO_VARIANTE = {
  docente: 'info',
  estudiante: 'success',
  empleado: 'warning',
};

const COLUMNAS = [
  { key: 'numero_documento', label: 'Documento' },
  { key: 'nombre', label: 'Nombre' },
  {
    key: 'tipo',
    label: 'Tipo',
    render: (value) => (
      <StatusBadge variant={TIPO_VARIANTE[value] || 'neutral'}>
        {value}
      </StatusBadge>
    ),
  },
  { key: 'facultad', label: 'Facultad', className: 'whitespace-normal max-w-[200px]' },
  { key: 'correo', label: 'Correo' },
  { key: 'id_carnet', label: 'ID Carnet' },
];

export default function ComunidadPage() {
  const { data: personas = [], isLoading } = useComunidad();

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Users className="h-6 w-6" />
            Comunidad
          </h1>
          <p className="text-muted-foreground text-sm">{personas.length} personas registradas</p>
        </div>
      </div>

      <DataTable
        columns={COLUMNAS}
        data={personas}
        loading={isLoading}
        searchable
        exportable
        exportFileName="comunidad"
      />
    </div>
  );
}
