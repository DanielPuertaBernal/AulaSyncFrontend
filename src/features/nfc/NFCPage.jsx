import { useState, useEffect, useRef } from 'react';
import { useNFCSocket } from './useNFCSocket';
import { useNFCStore } from './nfcStore';
import { llavesApi } from '@/features/llaves/llavesApi';
import { showSuccess, showError, showConfirm } from '@/shared/utils/alert';

export default function NFCPage() {
  useNFCSocket();
  const { ultimoResultado, lecturas, limpiarLecturas } = useNFCStore();
  const [resultado, setResultado] = useState(null);
  const resultadoRef = useRef(ultimoResultado?.timestamp || null);

  // Procesar resultados del ESP32 (flujo HTTP → WebSocket)
  useEffect(() => {
    if (!ultimoResultado || ultimoResultado.timestamp === resultadoRef.current) return;
    resultadoRef.current = ultimoResultado.timestamp;

    const data = ultimoResultado;
    setResultado(data);

    if (data.tipo === 'devolucion') {
      showSuccess(`Llave devuelta por ${data.docente?.nombre || 'docente'}`);
    } else if (data.tipo === 'anticipado') {
      const persona = data.persona || data.docente;
      const esMonitor = data.rol === 'monitor';
      const quien = esMonitor ? `Monitor ${persona?.nombre}` : persona?.nombre;
      (async () => {
        const confirm = await showConfirm(
          'Reclamo anticipado de llave',
          `${quien} está reclamando la llave con anticipación.\n\nMateria: ${data.clase?.materia || '—'}\nAula: ${data.clase?.aula || '—'}\nHora: ${data.clase?.horario || '—'}\n\n¿Confirmar préstamo?`
        );
        if (confirm.isConfirmed) {
          try {
            const confirmRes = await llavesApi.confirmarAnticipado({
              id_carnet: data.id_carnet,
              horario: data.clase.horario,
              aula: data.clase.aula,
              rol: data.rol || 'docente',
              documento_persona: persona?.numero_documento || '',
              nombre_persona: persona?.nombre || '',
            });
            setResultado({ ...data, tipo: 'prestamo', registro: confirmRes.data.data.registro });
            showSuccess(`Llave entregada a ${data.docente?.nombre}`);
          } catch (err) {
            showError(err.response?.data?.message || 'Error al confirmar préstamo');
          }
        }
      })();
    } else if (data.tipo === 'prestamo') {
      showSuccess(`Llave entregada a ${data.docente?.nombre}`);
    } else if (data.tipo === 'error' || data.tipo === 'sin_clase') {
      showError(data.mensaje);
    }
  }, [ultimoResultado?.timestamp]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <h1 className="text-2xl font-bold text-gray-800">
          <i className="fa-solid fa-tower-broadcast mr-2" />Lector NFC - Control de Llaves
        </h1>
        <button onClick={() => { limpiarLecturas(); setResultado(null); }} className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-100">
          <i className="fa-solid fa-trash mr-1" />Limpiar
        </button>
      </div>

      {/* Resultado */}
      {resultado && <ResultadoCard resultado={resultado} />}

      {/* Log de lecturas */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-4 py-3 border-b">
          <h2 className="font-semibold text-gray-700 text-sm">Log de lecturas ({lecturas.length})</h2>
        </div>
        <div className="divide-y max-h-60 overflow-y-auto">
          {lecturas.length === 0 ? (
            <p className="px-4 py-4 text-sm text-gray-400 text-center">Sin lecturas aún</p>
          ) : (
            lecturas.map((l, i) => (
              <div key={i} className="px-4 py-2 flex items-center justify-between text-sm">
                <span className="font-mono text-gray-800">{l.codigo}</span>
                <span className="text-gray-400 text-xs">{new Date(l.timestamp).toLocaleTimeString()}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ResultadoCard({ resultado }) {
  const { tipo, docente, persona, rol, clase, registro, mensaje, tiempo_retraso } = resultado;
  const esMonitor = rol === 'monitor';

  if (tipo === 'error' || tipo === 'sin_clase') {
    const quien = persona || docente;
    return (
      <div className="bg-orange-50 border border-orange-200 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-2">
          <i className="fa-solid fa-triangle-exclamation text-orange-600 text-xl" />
          <h3 className="font-semibold text-orange-800">Sin resultado</h3>
        </div>
        <p className="text-sm text-orange-700">{mensaje}</p>
        {quien && (
          <div className="mt-3 pt-3 border-t border-orange-200 text-sm text-orange-700">
            <p><strong>{esMonitor ? 'Monitor' : 'Docente'}:</strong> {quien.nombre}</p>
            <p><strong>Documento:</strong> {quien.numero_documento}</p>
          </div>
        )}
      </div>
    );
  }

  if (tipo === 'devolucion') {
    const devolvio = persona || docente;
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-3">
          <i className="fa-solid fa-circle-check text-green-600 text-2xl" />
          <h3 className="font-bold text-green-800 text-lg">Llave Devuelta</h3>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-gray-500">Docente:</span> <strong>{docente?.nombre}</strong></div>
          {esMonitor && <div><span className="text-gray-500">Devolvió (monitor):</span> <strong>{devolvio?.nombre}</strong></div>}
          <div><span className="text-gray-500">Documento:</span> {docente?.numero_documento}</div>
          {registro?.aula && <div><span className="text-gray-500">Aula:</span> {registro.aula}</div>}
          {registro?.horario && <div><span className="text-gray-500">Horario:</span> {registro.horario}</div>}
          {registro?.duracion_clase && (
            <div><span className="text-gray-500">Duración clase:</span> {registro.duracion_clase}</div>
          )}
          {registro?.retraso_entrega && (
            <div className="col-span-2 text-red-600 font-medium">
              <i className="fa-solid fa-clock mr-1" />Devolución con retraso: {registro.tiempo_retraso_devolucion}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (tipo === 'prestamo' || tipo === 'anticipado') {
    const claseInfo = clase || {};
    const isAnticipado = tipo === 'anticipado';
    const reclamo = persona || docente;
    return (
      <div className={`rounded-lg p-5 border ${isAnticipado ? 'bg-yellow-50 border-yellow-300' : 'bg-blue-50 border-blue-200'}`}>
        <div className="flex items-center gap-2 mb-3">
          <i className={`fa-solid ${isAnticipado ? 'fa-clock text-yellow-600' : 'fa-key text-blue-600'} text-2xl`} />
          <h3 className={`font-bold text-lg ${isAnticipado ? 'text-yellow-800' : 'text-blue-800'}`}>
            {isAnticipado ? 'Reclamo Anticipado' : 'Llave Entregada'}
          </h3>
          {esMonitor && <span className="text-xs bg-purple-100 text-purple-800 px-2 py-0.5 rounded-full">Monitor</span>}
        </div>
        {isAnticipado && (
          <div className="bg-yellow-100 text-yellow-800 text-sm px-3 py-2 rounded-lg mb-3">
            <i className="fa-solid fa-triangle-exclamation mr-1" />
            {esMonitor ? 'El monitor' : 'El docente'} está reclamando la llave con anticipación
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="col-span-2">
            <span className="text-gray-500">Docente:</span>{' '}
            <strong className="text-lg">{docente?.nombre}</strong>
          </div>
          {esMonitor && (
            <div className="col-span-2">
              <span className="text-gray-500">Reclamó (monitor):</span>{' '}
              <strong>{reclamo?.nombre}</strong>
            </div>
          )}
          <div><span className="text-gray-500">Materia:</span> <strong>{claseInfo.materia || '—'}</strong></div>
          <div><span className="text-gray-500">Aula:</span> <strong>{claseInfo.aula || '—'}</strong></div>
          <div><span className="text-gray-500">Horario:</span> <strong>{claseInfo.horario || '—'}</strong></div>
          <div><span className="text-gray-500">Facultad:</span> {claseInfo.facultad || '—'}</div>
          {tiempo_retraso && (
            <div className="col-span-2 text-orange-600">
              <i className="fa-solid fa-clock mr-1" />Tiempo de retraso: {tiempo_retraso}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
