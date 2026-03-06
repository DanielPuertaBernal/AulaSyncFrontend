import DataTable from '@/shared/components/DataTable';
import FileUploader from '@/shared/components/FileUploader';
import { useDocentes, useImportarDocentes } from './docentesApi';
import { showSuccess, showError } from '@/shared/utils/alert';

const COLUMNAS = [
  { key: 'numero_documento', label: 'Documento' },
  { key: 'nombre', label: 'Nombre' },
  { key: 'facultad', label: 'Facultad', className: 'whitespace-normal max-w-[200px]' },
  { key: 'correo', label: 'Correo' },
  { key: 'id_carnet', label: 'ID Carnet' },
];

export default function DocentesPage() {
  const { data: docentes = [], isLoading } = useDocentes();
  const importar = useImportarDocentes();

  function handleImportar(file) {
    importar.mutate(file, {
      onSuccess: (res) => showSuccess(res.data?.message || 'Importación exitosa'),
      onError: (err) => showError(err.response?.data?.message || 'Error al importar'),
    });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-800">
            <i className="fa-solid fa-chalkboard-user mr-2" />Docentes
          </h1>
          <p className="text-gray-500 text-sm">{docentes.length} docentes registrados</p>
        </div>
        <FileUploader onFile={handleImportar} loading={importar.isPending} label="Importar Docentes" />
      </div>

      <DataTable
        columns={COLUMNAS}
        data={docentes}
        loading={isLoading}
        searchable
        exportable
        exportFileName="docentes"
      />
    </div>
  );
}
