import { useState, useEffect, useRef } from 'react';
import { useNFCSocket } from './useNFCSocket';
import { useNFCStore } from './nfcStore';
import { llavesApi } from '@/features/llaves/llavesApi';
import { useUbicacionesOperativas } from '@/shared/hooks/useUbicacionesOperativas';
import { showSuccess, showError, showConfirm } from '@/shared/utils/alert';
import { UBICACIONES } from '@/shared/constants';
import { Radio, Trash2, CheckCircle2, AlertTriangle, Key, Clock, AlertCircle } from 'lucide-react';
import Button from '@/shared/components/ui/Button';
import { cn } from '@/shared/lib/utils';

export default function NFCPage() {
  const { connected, error, statusMessage, iniciar, detener } = useNFCSocket();
  const { getUbicacionLabel } = useUbicacionesOperativas();
  const { activo, ultimoResultado, lecturas, limpiarLecturas } = useNFCStore();
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
              reserva_id: data.reserva?.id || '',
              rol: data.rol || 'docente',
              documento_persona: persona?.numero_documento || '',
              nombre_persona: persona?.nombre || '',
              ubicacion: data.ubicacion || UBICACIONES.OFICINA,
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
        <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
          <Radio className="h-6 w-6" />Lector NFC - Control de Llaves
        </h1>
        <Button variant="outline" size="sm" onClick={() => { limpiarLecturas(); setResultado(null); }}>
          <Trash2 className="h-3 w-3 mr-1" />Limpiar
        </Button>
      </div>

      <div className="bg-card border border-border rounded-lg p-4 space-y-3">
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div>
            <p className="text-sm font-semibold text-foreground">Estado del canal NFC</p>
            <p className="text-sm text-muted-foreground">{statusMessage || 'Sin novedades del lector'}</p>
          </div>
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 border border-destructive/20 rounded-lg px-3 py-2 max-w-xl flex items-center gap-1">
              <AlertCircle className="h-4 w-4 shrink-0" />{error}
            </div>
          )}
        </div>
      </div>

      {/* Resultado */}
      {resultado && <ResultadoCard resultado={resultado} getUbicacionLabel={getUbicacionLabel} />}

      {/* Log de lecturas */}
      <div className="bg-card border border-border rounded-lg">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="font-semibold text-foreground text-sm">Log de lecturas ({lecturas.length})</h2>
        </div>
        <div className="divide-y divide-border max-h-60 overflow-y-auto">
          {lecturas.length === 0 ? (
            <p className="px-4 py-4 text-sm text-muted-foreground text-center">Sin lecturas aún</p>
          ) : (
            lecturas.map((l, i) => (
              <div key={i} className="px-4 py-2 flex items-center justify-between text-sm">
                <span className="font-mono text-foreground">{l.codigo}</span>
                <span className="text-muted-foreground text-xs">{new Date(l.timestamp).toLocaleTimeString()}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

function ResultadoCard({ resultado, getUbicacionLabel }) {
  const { tipo, docente, persona, rol, clase, registro, mensaje, tiempo_retraso } = resultado;
  const esMonitor = rol === 'monitor';

  if (tipo === 'error' || tipo === 'sin_clase') {
    const quien = persona || docente;
    return (
      <div className="bg-warning/10 border border-warning/20 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="h-5 w-5 text-warning" />
          <h3 className="font-semibold text-warning">Sin resultado</h3>
        </div>
        <p className="text-sm text-warning">{mensaje}</p>
        {quien && (
          <div className="mt-3 pt-3 border-t border-warning/20 text-sm text-warning">
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
      <div className="bg-success/10 border border-success/20 rounded-lg p-5">
        <div className="flex items-center gap-2 mb-3">
          <CheckCircle2 className="h-6 w-6 text-success" />
          <h3 className="font-bold text-success text-lg">Llave Devuelta</h3>
        </div>
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><span className="text-muted-foreground">Docente:</span> <strong className="text-foreground">{docente?.nombre}</strong></div>
          {esMonitor && <div><span className="text-muted-foreground">Devolvió (monitor):</span> <strong className="text-foreground">{devolvio?.nombre}</strong></div>}
          <div><span className="text-muted-foreground">Documento:</span> <span className="text-foreground">{docente?.numero_documento}</span></div>
          {registro?.aula && <div><span className="text-muted-foreground">Aula:</span> <span className="text-foreground">{registro.aula}</span></div>}
          {registro?.horario && <div><span className="text-muted-foreground">Horario:</span> <span className="text-foreground">{registro.horario}</span></div>}
          {registro?.ubicacionDevolucion && <div><span className="text-muted-foreground">Ubicación devolución:</span> <span className="text-foreground">{getUbicacionLabel(registro.ubicacionDevolucion)}</span></div>}
          {registro?.retraso_entrega && (
            <div className="col-span-2 text-destructive font-medium flex items-center gap-1">
              <Clock className="h-4 w-4" />Devolución con retraso: {registro.tiempo_retraso_devolucion}
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
      <div className={cn('rounded-lg p-5 border', isAnticipado ? 'bg-warning/10 border-warning/30' : 'bg-primary/10 border-primary/20')}>
        <div className="flex items-center gap-2 mb-3">
          {isAnticipado
            ? <Clock className="h-6 w-6 text-warning" />
            : <Key className="h-6 w-6 text-primary" />}
          <h3 className={cn('font-bold text-lg', isAnticipado ? 'text-warning' : 'text-primary')}>
            {isAnticipado ? 'Reclamo Anticipado' : 'Llave Entregada'}
          </h3>
          {esMonitor && <span className="text-xs bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300 px-2 py-0.5 rounded-full">Monitor</span>}
        </div>
        {isAnticipado && (
          <div className="bg-warning/10 text-warning text-sm px-3 py-2 rounded-lg mb-3 flex items-center gap-1">
            <AlertTriangle className="h-4 w-4" />
            {esMonitor ? 'El monitor' : 'El docente'} está reclamando la llave con anticipación
          </div>
        )}
        <div className="grid grid-cols-2 gap-3 text-sm">
          <div className="col-span-2">
            <span className="text-muted-foreground">Docente:</span>{' '}
            <strong className="text-lg text-foreground">{docente?.nombre}</strong>
          </div>
          {esMonitor && (
            <div className="col-span-2">
              <span className="text-muted-foreground">Reclamó (monitor):</span>{' '}
              <strong className="text-foreground">{reclamo?.nombre}</strong>
            </div>
          )}
          <div><span className="text-muted-foreground">Materia:</span> <strong className="text-foreground">{claseInfo.materia || '—'}</strong></div>
          <div><span className="text-muted-foreground">Aula:</span> <strong className="text-foreground">{claseInfo.aula || '—'}</strong></div>
          <div><span className="text-muted-foreground">Horario:</span> <strong className="text-foreground">{claseInfo.horario || '—'}</strong></div>
          <div><span className="text-muted-foreground">Facultad:</span> <span className="text-foreground">{claseInfo.facultad || '—'}</span></div>
          <div className="col-span-2"><span className="text-muted-foreground">Ubicación:</span> <strong className="text-foreground">{getUbicacionLabel(resultado.ubicacion || UBICACIONES.OFICINA)}</strong></div>
          {tiempo_retraso && (
            <div className="col-span-2 text-warning flex items-center gap-1">
              <Clock className="h-4 w-4" />Tiempo de retraso: {tiempo_retraso}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}
