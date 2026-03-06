import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import DataTable from '@/shared/components/DataTable';
import { useLlavesPendientes, useEntregarLlave, useDevolverLlave, llavesApi } from './llavesApi';
import { docentesApi } from '@/features/docentes/docentesApi';
import { useNFCSocket } from '@/features/nfc/useNFCSocket';
import { useNFCStore } from '@/features/nfc/nfcStore';
import { showSuccess, showError } from '@/shared/utils/alert';

const COLS_PENDIENTES = [
  { key: 'documento', label: 'Documento' },
  { key: 'docente', label: 'Docente' },
  { key: 'aula', label: 'Aula' },
  { key: 'horario', label: 'Horario' },
  { key: 'fechaEntrega', label: 'F. Entrega' },
  { key: 'horaEntrega', label: 'H. Entrega' },
  {
    key: 'estado',
    label: 'Estado',
    render: (v) => (
      <span className="px-2 py-0.5 rounded-full text-xs bg-yellow-100 text-yellow-800">{v}</span>
    ),
  },
  {
    key: '_accion',
    label: 'Acción',
    render: (_, row) => <DevolucionBtn documento={row.documento} nombre={row.docente} />,
  },
];

function DevolucionBtn({ documento, nombre }) {
  const devolver = useDevolverLlave();
  return (
    <button
      onClick={() => devolver.mutate(documento)}
      disabled={devolver.isPending}
      className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 disabled:opacity-60"
    >
      Devolver
    </button>
  );
}

export default function LlavesPage() {
  const [tab, setTab] = useState('pendientes');
  const { data: pendientes = [], isLoading } = useLlavesPendientes();
  const entregar = useEntregarLlave();
  const { register, handleSubmit, reset, setValue, formState: { errors } } = useForm();
  const [buscandoCarnet, setBuscandoCarnet] = useState(false);
  const [docenteEncontrado, setDocenteEncontrado] = useState(null);

  const { setModo } = useNFCSocket();
  const ultimoCarnet = useNFCStore((s) => s.ultimoCarnet);
  const carnetProcesadoRef = useRef(null);

  // Cambiar modo NFC según tab activa
  useEffect(() => {
    if (tab === 'entregar') {
      setModo('identificacion');
    } else {
      setModo('auto');
    }
    return () => setModo('auto');
  }, [tab]);

  // Auto-buscar docente cuando se lee un carnet por NFC
  useEffect(() => {
    if (!ultimoCarnet || tab !== 'entregar') return;
    if (carnetProcesadoRef.current === ultimoCarnet.timestamp) return;
    carnetProcesadoRef.current = ultimoCarnet.timestamp;
    buscarDocente(ultimoCarnet.id_carnet);
  }, [ultimoCarnet, tab]);

  async function buscarDocente(idCarnet) {
    const carnet = idCarnet.trim();
    if (!carnet) return;
    setBuscandoCarnet(true);
    setDocenteEncontrado(null);
    try {
      const res = await docentesApi.buscarPorCarnet(carnet);
      const doc = res.data.data.docente;
      setDocenteEncontrado(doc);
      setValue('nroidenti', doc.numero_documento || '');
      setValue('profesor', doc.nombre || '');
      setValue('facultad', doc.facultad || '');
    } catch {
      showError('Docente no encontrado para este carnet');
      setValue('nroidenti', '');
      setValue('profesor', '');
      setValue('facultad', '');
    } finally {
      setBuscandoCarnet(false);
    }
  }

  async function onEntregar(data) {
    try {
      const res = await entregar.mutateAsync(data);
      reset();
      setDocenteEncontrado(null);
      showSuccess(res.data?.message || 'Llave entregada correctamente');
    } catch (err) {
      showError(err.response?.data?.message || 'Error al entregar llave');
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-800"><i className="fa-solid fa-key mr-2" />Gestión de Llaves</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {['pendientes', 'entregar'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'pendientes' ? <><i className="fa-solid fa-lock mr-1" />Pendientes ({pendientes.length})</> : <><i className="fa-solid fa-lock-open mr-1" />Entregar Llave</>}
          </button>
        ))}
      </div>

      {tab === 'pendientes' && (
        <DataTable
          columns={COLS_PENDIENTES}
          data={pendientes}
          loading={isLoading}
          searchable
          exportable
          exportFileName="llaves_pendientes"
        />
      )}

      {tab === 'entregar' && (
        <div className="bg-white rounded-lg shadow p-6 max-w-lg">
          <h2 className="font-semibold text-gray-800 mb-4">Registrar entrega de llave</h2>

          {/* Indicador NFC */}
          <div className={`flex items-center gap-2 text-sm mb-4 px-3 py-2 rounded-lg ${docenteEncontrado ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-blue-50 border border-blue-200 text-blue-800'}`}>
            <i className={`fa-solid ${docenteEncontrado ? 'fa-circle-check' : 'fa-id-card'}`} />
            {buscandoCarnet
              ? 'Buscando docente...'
              : docenteEncontrado
                ? `Docente: ${docenteEncontrado.nombre}`
                : 'Acerque el carnet del docente al lector'}
          </div>

          <form onSubmit={handleSubmit(onEntregar)} className="space-y-3">

            {/* Campos autocompletados (readonly) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nro. Documento</label>
              <input {...register('nroidenti', { required: 'Documento es requerido' })} readOnly className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600" />
              {errors.nroidenti && <p className="text-red-500 text-xs mt-1">{errors.nroidenti.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Docente</label>
              <input {...register('profesor', { required: 'Nombre es requerido' })} readOnly className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600" />
              {errors.profesor && <p className="text-red-500 text-xs mt-1">{errors.profesor.message}</p>}
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Facultad</label>
              <input {...register('facultad')} readOnly className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-600" />
            </div>

            {/* Campos editables */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Aula</label>
              <input {...register('aula', { required: 'Aula es requerida' })} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              {errors.aula && <p className="text-red-500 text-xs mt-1">{errors.aula.message}</p>}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hora Inicio</label>
                <input type="time" {...register('hora_inicio')} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Hora Fin</label>
                <input type="time" {...register('hora_fin')} className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
              <input {...register('motivo')} placeholder="Motivo del préstamo..." className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
            </div>

            <button
              type="submit"
              disabled={entregar.isPending}
              className="w-full bg-primary text-white py-2 rounded-lg font-medium hover:bg-primary-dark disabled:opacity-60"
            >
              {entregar.isPending ? 'Registrando...' : 'Registrar Entrega'}
            </button>
          </form>
        </div>
      )}
    </div>
  );
}
