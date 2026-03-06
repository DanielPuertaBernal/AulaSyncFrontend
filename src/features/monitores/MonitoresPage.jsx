import { useState, useEffect, useRef } from 'react';
import { useNFCSocket } from '@/features/nfc/useNFCSocket';
import { useNFCStore } from '@/features/nfc/nfcStore';
import { docentesApi } from '@/features/docentes/docentesApi';
import { useMonitores, useClasesDocente, useRegistrarMonitor, useEliminarMonitor } from './monitoresApi';
import { showSuccess, showError, showConfirm } from '@/shared/utils/alert';

const PASOS = { ESCANEAR_DOCENTE: 0, SELECCIONAR_MATERIA: 1, ESCANEAR_MONITOR: 2, CONFIRMAR: 3 };

export default function MonitoresPage() {
  const [paso, setPaso] = useState(PASOS.ESCANEAR_DOCENTE);
  const [docente, setDocente] = useState(null);
  const [materiaSeleccionada, setMateriaSeleccionada] = useState(null);
  const [monitor, setMonitor] = useState(null);
  const [buscando, setBuscando] = useState(false);
  const [busquedaManual, setBusquedaManual] = useState('');

  const { setModo } = useNFCSocket();
  const ultimoCarnet = useNFCStore((s) => s.ultimoCarnet);
  const carnetRef = useRef(null);

  const registrar = useRegistrarMonitor();
  const eliminar = useEliminarMonitor();

  const documentoDocente = docente?.numero_documento || '';
  const { data: clases = [] } = useClasesDocente(documentoDocente);
  const { data: monitoresExistentes = [], refetch: refetchMonitores } = useMonitores(documentoDocente);

  // Modo identificación mientras estemos en esta página
  useEffect(() => {
    setModo('identificacion');
    return () => setModo('auto');
  }, []);

  // Escuchar carnet NFC
  useEffect(() => {
    if (!ultimoCarnet || ultimoCarnet.timestamp === carnetRef.current) return;
    carnetRef.current = ultimoCarnet.timestamp;

    if (paso === PASOS.ESCANEAR_DOCENTE) {
      buscarPersona(ultimoCarnet.id_carnet, 'docente');
    } else if (paso === PASOS.ESCANEAR_MONITOR) {
      buscarPersona(ultimoCarnet.id_carnet, 'monitor');
    }
  }, [ultimoCarnet, paso]);

  async function buscarPersona(identificador, tipo) {
    if (!identificador) return;
    setBuscando(true);
    try {
      let res;
      if (identificador.length > 10) {
        res = await docentesApi.buscarPorCarnet(identificador);
      } else {
        res = await docentesApi.buscarPorDocumento(identificador);
      }
      const persona = res.data.data.docente;
      if (tipo === 'docente') {
        setDocente(persona);
        setMonitor(null);
        setMateriaSeleccionada(null);
        setPaso(PASOS.SELECCIONAR_MATERIA);
      } else {
        setMonitor(persona);
        setPaso(PASOS.CONFIRMAR);
      }
    } catch {
      showError(tipo === 'docente' ? 'Docente no encontrado' : 'Persona no encontrada en el sistema');
    } finally {
      setBuscando(false);
    }
  }

  function handleBusquedaManual(tipo) {
    const valor = busquedaManual.trim();
    if (!valor) return;
    buscarPersona(valor, tipo);
    setBusquedaManual('');
  }

  async function handleConfirmar() {
    if (!docente || !monitor || !materiaSeleccionada) return;
    try {
      const res = await registrar.mutateAsync({
        numero_documento_docente: docente.numero_documento,
        numero_documento_monitor: monitor.numero_documento,
        materia: materiaSeleccionada.materia,
        aula: materiaSeleccionada.aula || '',
        horario: materiaSeleccionada.horario || '',
        dia: materiaSeleccionada.dia || '',
      });
      showSuccess(res.data?.message || 'Monitor registrado');
      refetchMonitores();
      reiniciar();
    } catch (err) {
      showError(err.response?.data?.message || 'Error al registrar monitor');
    }
  }

  async function handleEliminar(id, nombre) {
    const c = await showConfirm('Eliminar monitor', `¿Eliminar a ${nombre} como monitor?`);
    if (!c.isConfirmed) return;
    try {
      await eliminar.mutateAsync(id);
      showSuccess('Monitor eliminado');
      refetchMonitores();
    } catch (err) {
      showError(err.response?.data?.message || 'Error al eliminar');
    }
  }

  function reiniciar() {
    setPaso(PASOS.ESCANEAR_DOCENTE);
    setMonitor(null);
    setMateriaSeleccionada(null);
  }

  // Materias únicas del docente
  const materiasUnicas = clases.reduce((acc, c) => {
    const key = `${c.materia}|${c.aula}|${c.dia}|${c.horario}`;
    if (!acc.find((x) => `${x.materia}|${x.aula}|${x.dia}|${x.horario}` === key)) acc.push(c);
    return acc;
  }, []);

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-800">
        <i className="fa-solid fa-user-graduate mr-2" />Monitores del Docente
      </h1>

      {/* Wizard de registro */}
      <div className="bg-white rounded-lg shadow p-6">
        <StepIndicator paso={paso} />

        {/* Paso 0: Escanear docente */}
        {paso === PASOS.ESCANEAR_DOCENTE && (
          <div className="space-y-4">
            <div className={`flex items-center gap-2 text-sm px-3 py-3 rounded-lg ${buscando ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' : 'bg-blue-50 border border-blue-200 text-blue-800'}`}>
              <i className={`fa-solid ${buscando ? 'fa-spinner fa-spin' : 'fa-id-card'}`} />
              {buscando ? 'Buscando docente...' : 'Acerque el carnet del docente al lector RFID'}
            </div>
            <div className="flex gap-2">
              <input
                value={busquedaManual}
                onChange={(e) => setBusquedaManual(e.target.value)}
                placeholder="O ingrese número de documento..."
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                onKeyDown={(e) => e.key === 'Enter' && handleBusquedaManual('docente')}
              />
              <button onClick={() => handleBusquedaManual('docente')} className="bg-primary text-white px-3 py-2 rounded-lg text-sm hover:bg-primary-dark">
                <i className="fa-solid fa-search" />
              </button>
            </div>
          </div>
        )}

        {/* Paso 1: Seleccionar materia */}
        {paso === PASOS.SELECCIONAR_MATERIA && docente && (
          <div className="space-y-4">
            <PersonaCard persona={docente} tipo="Docente" />
            <h3 className="font-medium text-gray-700 text-sm">Seleccione la materia para el monitor:</h3>
            {materiasUnicas.length === 0 ? (
              <p className="text-gray-400 text-sm">Este docente no tiene clases programadas</p>
            ) : (
              <div className="grid gap-2">
                {materiasUnicas.map((c, i) => (
                  <button
                    key={i}
                    onClick={() => { setMateriaSeleccionada(c); setPaso(PASOS.ESCANEAR_MONITOR); }}
                    className={`text-left border rounded-lg px-4 py-3 text-sm hover:border-primary transition-colors ${
                      materiaSeleccionada === c ? 'border-primary bg-blue-50' : 'border-gray-200'
                    }`}
                  >
                    <div className="font-medium">{c.materia}</div>
                    <div className="text-gray-500 text-xs mt-1">
                      {c.dia} · {c.horario} · Aula {c.aula}
                    </div>
                  </button>
                ))}
              </div>
            )}
            <button onClick={reiniciar} className="text-sm text-gray-500 hover:text-gray-700">
              <i className="fa-solid fa-arrow-left mr-1" />Cambiar docente
            </button>
          </div>
        )}

        {/* Paso 2: Escanear monitor */}
        {paso === PASOS.ESCANEAR_MONITOR && (
          <div className="space-y-4">
            <PersonaCard persona={docente} tipo="Docente" compact />
            <div className="bg-gray-50 border rounded-lg px-3 py-2 text-sm">
              <span className="text-gray-500">Materia:</span> <strong>{materiaSeleccionada?.materia}</strong>
              <span className="text-gray-400 ml-2">{materiaSeleccionada?.dia} · {materiaSeleccionada?.horario}</span>
            </div>
            <div className={`flex items-center gap-2 text-sm px-3 py-3 rounded-lg ${buscando ? 'bg-yellow-50 border border-yellow-200 text-yellow-800' : 'bg-blue-50 border border-blue-200 text-blue-800'}`}>
              <i className={`fa-solid ${buscando ? 'fa-spinner fa-spin' : 'fa-id-card'}`} />
              {buscando ? 'Buscando persona...' : 'Ahora acerque el carnet del estudiante (monitor)'}
            </div>
            <div className="flex gap-2">
              <input
                value={busquedaManual}
                onChange={(e) => setBusquedaManual(e.target.value)}
                placeholder="O ingrese número de documento del monitor..."
                className="flex-1 border rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                onKeyDown={(e) => e.key === 'Enter' && handleBusquedaManual('monitor')}
              />
              <button onClick={() => handleBusquedaManual('monitor')} className="bg-primary text-white px-3 py-2 rounded-lg text-sm hover:bg-primary-dark">
                <i className="fa-solid fa-search" />
              </button>
            </div>
            <button onClick={() => setPaso(PASOS.SELECCIONAR_MATERIA)} className="text-sm text-gray-500 hover:text-gray-700">
              <i className="fa-solid fa-arrow-left mr-1" />Cambiar materia
            </button>
          </div>
        )}

        {/* Paso 3: Confirmar */}
        {paso === PASOS.CONFIRMAR && monitor && (
          <div className="space-y-4">
            <PersonaCard persona={docente} tipo="Docente" compact />
            <div className="bg-gray-50 border rounded-lg px-3 py-2 text-sm">
              <span className="text-gray-500">Materia:</span> <strong>{materiaSeleccionada?.materia}</strong>
              <span className="text-gray-400 ml-2">{materiaSeleccionada?.dia} · {materiaSeleccionada?.horario}</span>
            </div>
            <PersonaCard persona={monitor} tipo="Monitor" />
            <div className="flex gap-3">
              <button
                onClick={handleConfirmar}
                disabled={registrar.isPending}
                className="flex-1 bg-green-600 text-white py-2 rounded-lg font-medium hover:bg-green-700 disabled:opacity-60"
              >
                {registrar.isPending ? 'Registrando...' : 'Confirmar Monitor'}
              </button>
              <button onClick={() => { setMonitor(null); setPaso(PASOS.ESCANEAR_MONITOR); }} className="px-4 py-2 border rounded-lg text-sm hover:bg-gray-50">
                Cambiar monitor
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Lista de monitores del docente */}
      {docente && (
        <div className="bg-white rounded-lg shadow">
          <div className="px-4 py-3 border-b flex items-center justify-between">
            <h2 className="font-semibold text-gray-700 text-sm">
              Monitores de {docente.nombre} ({monitoresExistentes.length})
            </h2>
          </div>
          <div className="divide-y">
            {monitoresExistentes.length === 0 ? (
              <p className="px-4 py-4 text-sm text-gray-400 text-center">Sin monitores registrados</p>
            ) : (
              monitoresExistentes.map((m) => (
                <div key={m._id} className="px-4 py-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-800">{m.nombre_monitor}</p>
                    <p className="text-xs text-gray-500">
                      Doc: {m.numero_documento_monitor} · {m.materia} · {m.dia} {m.horario}
                    </p>
                  </div>
                  <button
                    onClick={() => handleEliminar(m._id, m.nombre_monitor)}
                    disabled={eliminar.isPending}
                    className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700 disabled:opacity-60"
                  >
                    <i className="fa-solid fa-trash mr-1" />Eliminar
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StepIndicator({ paso }) {
  const steps = ['Docente', 'Materia', 'Monitor', 'Confirmar'];
  return (
    <div className="flex items-center gap-2 mb-6">
      {steps.map((label, i) => (
        <div key={i} className="flex items-center gap-2">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
            i < paso ? 'bg-green-500 text-white' : i === paso ? 'bg-primary text-white' : 'bg-gray-200 text-gray-500'
          }`}>
            {i < paso ? <i className="fa-solid fa-check" /> : i + 1}
          </div>
          <span className={`text-xs hidden sm:inline ${i === paso ? 'font-medium text-gray-800' : 'text-gray-400'}`}>{label}</span>
          {i < steps.length - 1 && <div className="w-6 h-px bg-gray-300" />}
        </div>
      ))}
    </div>
  );
}

function PersonaCard({ persona, tipo, compact }) {
  if (compact) {
    return (
      <div className="bg-green-50 border border-green-200 text-green-800 text-sm px-3 py-2 rounded-lg flex items-center gap-2">
        <i className="fa-solid fa-circle-check" />
        <span className="text-gray-500">{tipo}:</span> <strong>{persona.nombre}</strong>
        <span className="text-xs text-gray-400 ml-auto">{persona.numero_documento}</span>
      </div>
    );
  }

  return (
    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
      <div className="flex items-center gap-2 mb-2">
        <i className="fa-solid fa-circle-check text-green-600" />
        <span className="text-sm font-medium text-green-800">{tipo} identificado</span>
      </div>
      <div className="grid grid-cols-2 gap-2 text-sm">
        <div><span className="text-gray-500">Nombre:</span> <strong>{persona.nombre}</strong></div>
        <div><span className="text-gray-500">Documento:</span> {persona.numero_documento}</div>
        {persona.facultad && <div><span className="text-gray-500">Facultad:</span> {persona.facultad}</div>}
        {persona.correo && <div><span className="text-gray-500">Correo:</span> {persona.correo}</div>}
      </div>
    </div>
  );
}
