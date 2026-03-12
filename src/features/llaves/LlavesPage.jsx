import { useState, useEffect, useRef } from 'react';
import { useForm } from 'react-hook-form';
import DataTable from '@/shared/components/DataTable';
import { useLlavesPendientes, useEntregarLlave, useDevolverLlave, llavesApi } from './llavesApi';
import { docentesApi } from '@/features/docentes/docentesApi';
import { useNFCSocket } from '@/features/nfc/useNFCSocket';
import { useNFCStore } from '@/features/nfc/nfcStore';
import { showSuccess, showError } from '@/shared/utils/alert';
import Swal from 'sweetalert2';

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
      let res;
      if (idCarnet.length > 10) {
        res = await docentesApi.buscarPorCarnet(idCarnet);
      } else {
        res = await docentesApi.buscarPorDocumento(idCarnet);
      }
      const doc = res.data.data.docente;
      setDocenteEncontrado(doc);
      setValue('nroidenti', doc.numero_documento || '');
      setValue('profesor', doc.nombre || '');
      setValue('facultad', doc.facultad || '');
    } catch {
      showError('Persona no encontrada');
      setValue('nroidenti', '');
      setValue('profesor', '');
      setValue('facultad', '');
    } finally {
      setBuscandoCarnet(false);
    }
  }

  async function onEntregar(data) {
    const ahora = new Date();
    const horaInicio = (data.hora_inicio || '').trim();
    if (horaInicio) {
      const [h, m] = horaInicio.split(':').map((v) => parseInt(v, 10));
      if (!Number.isNaN(h) && !Number.isNaN(m)) {
        const minutosInicio = h * 60 + m;
        const minutosAhora = ahora.getHours() * 60 + ahora.getMinutes();
        const esAnticipado = minutosAhora < (minutosInicio - 30);

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
      }
    }

    const confirm = await Swal.fire({
      title: 'Confirmar entrega manual',
      html: `
        <div style="text-align:left;font-size:14px;line-height:2">
          <b>Docente:</b> ${data.profesor || '—'}<br/>
          <b>Documento:</b> ${data.nroidenti || '—'}<br/>
          <b>Aula:</b> ${data.aula || '—'}<br/>
          <b>Horario:</b> ${(data.hora_inicio || '—')} - ${(data.hora_fin || '—')}<br/>
          <b>Motivo:</b> ${data.motivo || '—'}
        </div>
      `,
      icon: 'question',
      showCancelButton: true,
      confirmButtonText: 'Si, entregar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#2563eb',
      cancelButtonColor: '#6b7280',
    });
    if (!confirm.isConfirmed) return;

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
          <div className={`flex items-center gap-2 text-sm mb-2 px-3 py-2 rounded-lg ${docenteEncontrado ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-blue-50 border border-blue-200 text-blue-800'}`}>
            <i className={`fa-solid ${docenteEncontrado ? 'fa-circle-check' : 'fa-id-card'}`} />
            {buscandoCarnet
              ? 'Buscando docente...'
              : docenteEncontrado
                ? `Docente: ${docenteEncontrado.nombre}`
                : 'Acerque el carnet del docente al lector'}
          </div>

          {/* Fallback manual */}
          {!docenteEncontrado && (
            <div className="flex gap-2 mb-4">
              <input
                id="fallback_doc"
                placeholder="O ingrese nro. documento..."
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); buscarDocente(e.target.value); } }}
              />
              <button type="button" onClick={() => buscarDocente(document.getElementById('fallback_doc').value)} disabled={buscandoCarnet} className="bg-primary text-white px-3 py-2 rounded-lg text-sm hover:bg-primary-dark disabled:opacity-60">
                {buscandoCarnet ? <i className="fa-solid fa-spinner fa-spin" /> : <i className="fa-solid fa-search" />}
              </button>
            </div>
          )}

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
