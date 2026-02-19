import { useState } from 'react';
import { useNFCSocket } from './useNFCSocket';
import { useNFCStore } from './nfcStore';
import apiClient from '@/shared/api/axios.client';

export default function NFCPage() {
  const { connected, error, iniciar, detener, simular } = useNFCSocket();
  const { activo, ultimaLectura, lecturas, limpiarLecturas } = useNFCStore();
  const [simulCodigo, setSimulCodigo] = useState('');
  const [docenteInfo, setDocenteInfo] = useState(null);
  const [buscandoDocente, setBuscandoDocente] = useState(false);

  // Cuando hay una nueva lectura, buscar docente automáticamente
  async function buscarDocente(codigo) {
    if (!codigo) return;
    setBuscandoDocente(true);
    try {
      const res = await apiClient.get(`/docentes/carnet/${codigo}`);
      setDocenteInfo(res.data.data.docente);
    } catch {
      setDocenteInfo(null);
    } finally {
      setBuscandoDocente(false);
    }
  }

  // Watch última lectura
  if (ultimaLectura && (!docenteInfo || docenteInfo?.['Id Carnet'] !== ultimaLectura.codigo)) {
    buscarDocente(ultimaLectura.codigo);
  }

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold text-gray-800">📡 Monitor NFC</h1>

      {/* Estado conexión */}
      <div className="flex items-center gap-3">
        <span className={`w-3 h-3 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-300'}`} />
        <span className="text-sm font-medium text-gray-700">
          {connected ? 'Conectado al servidor' : 'Desconectado'}
        </span>
        {activo && <span className="text-xs bg-green-100 text-green-800 px-2 py-0.5 rounded-full animate-pulse">Escuchando...</span>}
      </div>
      {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2 rounded-lg">⚠️ {error}</div>}

      {/* Controles */}
      <div className="flex gap-3 flex-wrap">
        <button onClick={iniciar} disabled={activo || !connected} className="bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-50">
          ▶ Iniciar NFC
        </button>
        <button onClick={detener} disabled={!activo} className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50">
          ⏹ Detener
        </button>
        <button onClick={limpiarLecturas} className="border px-4 py-2 rounded-lg text-sm hover:bg-gray-100">
          🗑 Limpiar
        </button>
      </div>

      {/* Simulador */}
      <div className="bg-white rounded-lg shadow p-4">
        <h2 className="font-semibold text-gray-700 mb-2 text-sm">🧪 Simular lectura NFC</h2>
        <div className="flex gap-2">
          <input
            value={simulCodigo}
            onChange={(e) => setSimulCodigo(e.target.value)}
            placeholder="Código NFC..."
            className="border rounded-lg px-3 py-1.5 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button onClick={() => { simular(simulCodigo); setSimulCodigo(''); }} className="bg-primary text-white px-4 py-1.5 rounded-lg text-sm hover:bg-primary-dark">
            Simular
          </button>
        </div>
      </div>

      {/* Última lectura + docente */}
      {ultimaLectura && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <h2 className="font-semibold text-blue-800 mb-2">Última lectura</h2>
          <p className="text-sm text-blue-700">Código: <strong>{ultimaLectura.codigo}</strong></p>
          <p className="text-xs text-blue-500">{new Date(ultimaLectura.timestamp).toLocaleTimeString()}</p>
          {buscandoDocente && <p className="text-sm text-gray-500 mt-2">Buscando docente...</p>}
          {docenteInfo && (
            <div className="mt-3 bg-white rounded-lg p-3 border border-blue-100">
              <p className="font-medium">{docenteInfo['Nombre']}</p>
              <p className="text-sm text-gray-500">Doc: {docenteInfo['Numero de documento']}</p>
              <p className="text-sm text-gray-500">Facultad: {docenteInfo['Facultad']}</p>
            </div>
          )}
          {!buscandoDocente && !docenteInfo && (
            <p className="text-sm text-orange-600 mt-2">⚠️ Docente no encontrado para este código</p>
          )}
        </div>
      )}

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
