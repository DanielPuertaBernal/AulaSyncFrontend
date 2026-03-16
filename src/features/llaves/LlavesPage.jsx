import { useState, useEffect, useMemo, useRef } from 'react';
import { Controller, useForm } from 'react-hook-form';
import dayjs from 'dayjs';
import customParseFormat from 'dayjs/plugin/customParseFormat';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDayjs } from '@mui/x-date-pickers/AdapterDayjs';
import { TimePicker } from '@mui/x-date-pickers/TimePicker';
import DataTable from '@/shared/components/DataTable';
import { useLlavesPendientes, useEntregarLlave, useDevolverLlave } from './llavesApi';
import { useSalones } from '@/features/salones/salonesApi';
import { docentesApi } from '@/features/docentes/docentesApi';
import { useNFCSocket } from '@/features/nfc/useNFCSocket';
import { useNFCStore } from '@/features/nfc/nfcStore';
import { showSuccess, showError } from '@/shared/utils/alert';
import { UBICACIONES, UBICACIONES_LABEL } from '@/shared/constants';
import Swal from 'sweetalert2';

dayjs.extend(customParseFormat);

function normalizarNombreSalon(value = '') {
  return String(value || '')
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '');
}

const COLS_PENDIENTES = [
  { key: 'documento', label: 'Documento' },
  { key: 'docente', label: 'Docente' },
  { key: 'aula', label: 'Aula' },
  { key: 'horario', label: 'Horario' },
  { key: 'fechaEntrega', label: 'F. Entrega' },
  { key: 'horaEntrega', label: 'H. Entrega' },
  {
    key: 'ubicacionPrestamo',
    label: 'Ubic. Préstamo',
    render: (v) => UBICACIONES_LABEL[v] || '—',
  },
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

  async function onDevolver() {
    const result = await Swal.fire({
      title: 'Registrar devolución',
      text: `Se registrará en ${UBICACIONES_LABEL[UBICACIONES.OFICINA]} para ${nombre || 'este docente'}`,
      showCancelButton: true,
      confirmButtonText: 'Registrar',
      cancelButtonText: 'Cancelar',
    });

    if (!result.isConfirmed) return;
    devolver.mutate({ documento, ubicacion: UBICACIONES.OFICINA });
  }

  return (
    <button
      onClick={onDevolver}
      disabled={devolver.isPending}
      className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 disabled:opacity-60"
    >
      Devolver
    </button>
  );
}

export default function LlavesPage() {
  const [tab, setTab] = useState('entregar');
  const { data: pendientes = [], isLoading } = useLlavesPendientes();
  const { data: salones = [] } = useSalones({ enabled: tab === 'entregar' });
  const entregar = useEntregarLlave();
  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    control,
    formState: { errors },
  } = useForm({
    defaultValues: {
      nroidenti: '',
      profesor: '',
      facultad: '',
      aula: '',
      hora_inicio: '',
      hora_fin: '',
      motivo: '',
      ubicacion: UBICACIONES.OFICINA,
    },
  });
  const [buscandoCarnet, setBuscandoCarnet] = useState(false);
  const [docenteEncontrado, setDocenteEncontrado] = useState(null);
  const [lookupValue, setLookupValue] = useState('');
  const [mostrarSugerenciasAula, setMostrarSugerenciasAula] = useState(false);

  const { setModo } = useNFCSocket();
  const ultimoCarnet = useNFCStore((s) => s.ultimoCarnet);
  const carnetProcesadoRef = useRef(null);
  const fallbackInputRef = useRef(null);
  const aulaBusqueda = watch('aula') || '';
  const sugerenciasAula = useMemo(() => {
    const query = normalizarNombreSalon(aulaBusqueda);
    if (!query) return [];

    return salones
      .filter((salon) => normalizarNombreSalon(salon.nombre_salon).includes(query))
      .slice(0, 8);
  }, [aulaBusqueda, salones]);

  // Cambiar modo NFC según tab activa
  useEffect(() => {
    if (tab === 'entregar') {
      setModo('identificacion');
      limpiarDocenteSeleccionado();
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

  function limpiarDocenteSeleccionado() {
    setDocenteEncontrado(null);
    setLookupValue('');
    setBuscandoCarnet(false);
    setMostrarSugerenciasAula(false);
    reset({
      nroidenti: '',
      profesor: '',
      facultad: '',
      aula: '',
      hora_inicio: '',
      hora_fin: '',
      motivo: '',
      ubicacion: UBICACIONES.OFICINA,
    });
    carnetProcesadoRef.current = null;
    setValue('nroidenti', '');
    setValue('profesor', '');
    setValue('facultad', '');
    setTimeout(() => fallbackInputRef.current?.focus(), 0);
  }

  async function buscarDocente(idCarnet) {
    const identificador = String(idCarnet || '').trim();
    if (!identificador) return;
    setBuscandoCarnet(true);
    setDocenteEncontrado(null);
    setLookupValue(identificador);
    try {
      let res;
      const esDocumento = /^\d+$/.test(identificador);

      if (esDocumento) {
        try {
          res = await docentesApi.buscarPorDocumento(identificador);
        } catch (_) {
          res = await docentesApi.buscarPorCarnet(identificador);
        }
      } else {
        try {
          res = await docentesApi.buscarPorCarnet(identificador);
        } catch (_) {
          res = await docentesApi.buscarPorDocumento(identificador);
        }
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
    const aulaNormalizada = normalizarNombreSalon(data.aula);
    const salonSeleccionado = salones.find(
      (salon) => normalizarNombreSalon(salon.nombre_salon) === aulaNormalizada
    );
    const payload = {
      ...data,
      aula: salonSeleccionado?.nombre_salon || data.aula,
      origen: 'individual',
    };
    const ahora = new Date();
    const horaInicio = (payload.hora_inicio || '').trim();
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
          <b>Motivo:</b> ${data.motivo || '—'}<br/>
          <b>Ubicación:</b> ${UBICACIONES_LABEL[UBICACIONES.OFICINA]}
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
      const res = await entregar.mutateAsync(payload);
      reset({
        nroidenti: '',
        profesor: '',
        facultad: '',
        aula: '',
        hora_inicio: '',
        hora_fin: '',
        motivo: '',
        ubicacion: UBICACIONES.OFICINA,
      });
      setDocenteEncontrado(null);
      setLookupValue('');
      setMostrarSugerenciasAula(false);
      carnetProcesadoRef.current = null;
      setTimeout(() => fallbackInputRef.current?.focus(), 0);
      showSuccess(res.data?.message || 'Llave entregada correctamente');
    } catch (err) {
      showError(err.response?.data?.message || 'Error al entregar llave');
    }
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-800"><i className="fa-solid fa-key mr-2" />Préstamos Individuales de Llaves</h1>

      {/* Tabs */}
      <div className="flex gap-1 border-b">
        {['entregar', 'pendientes'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors ${
              tab === t
                ? 'border-b-2 border-primary text-primary'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {t === 'pendientes' ? <><i className="fa-solid fa-lock mr-1" />Pendientes Individuales ({pendientes.length})</> : <><i className="fa-solid fa-lock-open mr-1" />Registrar Préstamo Individual</>}
          </button>
        ))}
      </div>

      {tab === 'entregar' && (
        <div className="bg-gradient-to-br from-slate-50 to-white rounded-xl shadow-lg border border-slate-200 p-6 max-w-5xl">
          <h2 className="font-semibold text-gray-800 mb-4">Registrar préstamo individual de llave</h2>

          {/* Indicador NFC */}
          <div className={`flex items-center gap-2 text-sm mb-4 px-3 py-2 rounded-lg ${docenteEncontrado ? 'bg-green-50 border border-green-200 text-green-800' : 'bg-blue-50 border border-blue-200 text-blue-800'}`}>
            <i className={`fa-solid ${docenteEncontrado ? 'fa-circle-check' : 'fa-id-card'}`} />
            {buscandoCarnet
              ? 'Buscando docente...'
              : docenteEncontrado
                ? `Docente: ${docenteEncontrado.nombre}`
                : 'Acerque el carnet del docente al lector'}
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 mb-4">
            <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-2">Identificación del Docente</p>
            <div className="flex flex-col md:flex-row gap-2">
              <input
                ref={fallbackInputRef}
                value={lookupValue}
                placeholder="Escanee carnet o escriba documento"
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                onChange={(e) => setLookupValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    buscarDocente(lookupValue);
                  }
                }}
              />
              <button
                type="button"
                onClick={() => buscarDocente(lookupValue)}
                disabled={buscandoCarnet || !lookupValue.trim()}
                className="bg-primary text-white px-4 py-2 rounded-lg text-sm hover:bg-primary-dark disabled:opacity-60"
              >
                {buscandoCarnet ? <><i className="fa-solid fa-spinner fa-spin mr-1" />Buscando</> : <><i className="fa-solid fa-search mr-1" />Buscar</>}
              </button>
            </div>
          </div>

          <LocalizationProvider dateAdapter={AdapterDayjs}>
          <form onSubmit={handleSubmit(onEntregar)} className="space-y-4">
            <input type="hidden" {...register('ubicacion')} value={UBICACIONES.OFICINA} />

            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-3">Datos Autocompletados</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nro. Documento</label>
                  <input {...register('nroidenti', { required: 'Documento es requerido' })} readOnly className="w-full border rounded-lg px-3 py-2 text-sm bg-white text-gray-700" />
                  {errors.nroidenti && <p className="text-red-500 text-xs mt-1">{errors.nroidenti.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Docente</label>
                  <input {...register('profesor', { required: 'Nombre es requerido' })} readOnly className="w-full border rounded-lg px-3 py-2 text-sm bg-white text-gray-700" />
                  {errors.profesor && <p className="text-red-500 text-xs mt-1">{errors.profesor.message}</p>}
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Facultad</label>
                  <input {...register('facultad')} readOnly className="w-full border rounded-lg px-3 py-2 text-sm bg-white text-gray-700" />
                </div>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-600 mb-3">Datos del Préstamo</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Aula</label>
                  <div className="relative">
                    <input
                      {...register('aula', {
                        required: 'Aula es requerida',
                        validate: (value) => {
                          const nombre = normalizarNombreSalon(value);
                          if (!nombre) return 'Aula es requerida';
                          return salones.some(
                            (salon) => normalizarNombreSalon(salon.nombre_salon) === nombre
                          ) || 'Seleccione un salón válido';
                        },
                      })}
                      autoComplete="off"
                      placeholder="Escriba para buscar un salón..."
                      className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-white"
                      onFocus={() => setMostrarSugerenciasAula(true)}
                      onBlur={() => setTimeout(() => setMostrarSugerenciasAula(false), 150)}
                    />

                    {mostrarSugerenciasAula && sugerenciasAula.length > 0 && (
                      <div className="absolute z-20 mt-1 w-full bg-white border border-slate-200 rounded-lg shadow-lg max-h-56 overflow-y-auto">
                        {sugerenciasAula.map((salon) => (
                          <button
                            key={salon._id}
                            type="button"
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 hover:bg-slate-50"
                            onMouseDown={(e) => e.preventDefault()}
                            onClick={() => {
                              setValue('aula', salon.nombre_salon, {
                                shouldDirty: true,
                                shouldValidate: true,
                              });
                              setMostrarSugerenciasAula(false);
                            }}
                          >
                            {salon.nombre_salon}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {errors.aula && <p className="text-red-500 text-xs mt-1">{errors.aula.message}</p>}
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Ubicación del préstamo</label>
                  <div className="w-full border rounded-lg px-3 py-2 text-sm bg-gray-50 text-gray-700 h-[40px] flex items-center">
                    {UBICACIONES_LABEL[UBICACIONES.OFICINA]}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora Inicio</label>
                  <Controller
                    control={control}
                    name="hora_inicio"
                    render={({ field }) => (
                      <TimePicker
                        ampm={false}
                        format="HH:mm"
                        value={field.value ? dayjs(field.value, 'HH:mm') : null}
                        onChange={(newValue) => field.onChange(newValue ? newValue.format('HH:mm') : '')}
                        slotProps={{ textField: { size: 'small', fullWidth: true } }}
                      />
                    )}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Hora Fin</label>
                  <Controller
                    control={control}
                    name="hora_fin"
                    render={({ field }) => (
                      <TimePicker
                        ampm={false}
                        format="HH:mm"
                        value={field.value ? dayjs(field.value, 'HH:mm') : null}
                        onChange={(newValue) => field.onChange(newValue ? newValue.format('HH:mm') : '')}
                        slotProps={{ textField: { size: 'small', fullWidth: true } }}
                      />
                    )}
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Motivo</label>
                  <input {...register('motivo')} placeholder="Motivo del préstamo..." className="w-full border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary" />
                </div>
              </div>
              <p className="text-xs text-gray-500 mt-1">Las entregas de llaves solo se registran en la oficina.</p>
            </div>

            <button
              type="submit"
              disabled={entregar.isPending || !docenteEncontrado}
              className="w-full bg-primary text-white py-2 rounded-lg font-medium hover:bg-primary-dark disabled:opacity-60"
            >
              {entregar.isPending ? 'Registrando...' : 'Registrar Entrega'}
            </button>
          </form>
          </LocalizationProvider>
        </div>
      )}

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
    </div>
  );
}
