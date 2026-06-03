import { useEffect, useRef, useState, useCallback } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '@/features/auth/authStore';
import { NFC_EVENTOS, NFC_NAMESPACE } from '@/shared/constants';
import { useNFCStore } from './nfcStore';

let socket = null;
const KEEPALIVE_INTERVAL_MS = 25_000;

export function useNFCSocket() {
  const {
    setActivo, setUltimaLectura, setUltimoResultado, setUltimoCarnet, addLectura,
    setIntencionActiva, setEnCola, setPosicionCola, setExpiraEn, resetIntencion,
  } = useNFCStore();
  const token = useAuthStore((state) => state.token);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('Esperando conexión NFC');
  const keepaliveRef = useRef(null);

  useEffect(() => {
    if (!token) {
      if (socket) {
        socket.disconnect();
        socket = null;
      }
      setConnected(false);
      setActivo(false);
      setError('');
      setStatusMessage('Sin sesión NFC activa');
      resetIntencion();
      return undefined;
    }

    if (!socket) {
      const socketBase = import.meta.env.VITE_API_URL ?? '';
      socket = io(`${socketBase}${NFC_NAMESPACE}`, {
        transports: ['websocket'],
        auth: { token },
      });
    } else {
      const tokenChanged = socket.auth?.token !== token;
      socket.auth = { token };

      if (tokenChanged) {
        if (socket.connected) socket.disconnect();
        socket.connect();
      } else if (!socket.connected) {
        socket.connect();
      }
    }

    socket.on('connect', () => {
      setConnected(true);
      setError('');
      setStatusMessage('Canal NFC conectado');
    });
    socket.on('disconnect', () => {
      setConnected(false);
      setActivo(false);
      setStatusMessage('Canal NFC desconectado');
      resetIntencion();
    });
    socket.on('connect_error', (err) => {
      setConnected(false);
      setError(err?.message || 'No se pudo conectar al canal NFC');
      setStatusMessage('Error de conexión con el canal NFC');
    });
    socket.on(NFC_EVENTOS.STATUS, (payload = {}) => {
      setActivo(Boolean(payload.activo));
      if (payload.mensaje) setStatusMessage(payload.mensaje);
      if (payload.ultimoError) {
        setError(payload.ultimoError);
      } else if (payload.activo) {
        setError('');
      }
    });
    socket.on(NFC_EVENTOS.ERROR, ({ mensaje }) => setError(mensaje));
    socket.on(NFC_EVENTOS.LECTURA, (payload) => {
      setUltimaLectura(payload);
      addLectura(payload);
    });
    socket.on(NFC_EVENTOS.RESULTADO, (payload) => {
      setUltimoResultado(payload);
      addLectura({ codigo: payload.id_carnet, timestamp: payload.timestamp });
    });
    socket.on(NFC_EVENTOS.CARNET_LEIDO, (payload) => {
      setUltimoCarnet(payload);
    });

    // Listeners de intención NFC
    socket.on(NFC_EVENTOS.INTENCION_CONFIRMADA, () => {
      setIntencionActiva(true);
      setEnCola(false);
      setPosicionCola(null);
      setExpiraEn(null);
    });
    socket.on(NFC_EVENTOS.EN_COLA, ({ posicion, expiraEn }) => {
      setIntencionActiva(false);
      setEnCola(true);
      setPosicionCola(posicion);
      setExpiraEn(expiraEn);
    });
    socket.on(NFC_EVENTOS.POSICION_COLA, ({ posicion, expiraEn }) => {
      setPosicionCola(posicion);
      if (expiraEn != null) setExpiraEn(expiraEn);
    });
    socket.on(NFC_EVENTOS.LECTOR_LIBRE, () => {
      setEnCola(false);
      setPosicionCola(null);
      setExpiraEn(null);
    });
    socket.on(NFC_EVENTOS.INTENCION_REEMPLAZADA, () => {
      setIntencionActiva(false);
      setEnCola(false);
      setPosicionCola(null);
    });
    socket.on(NFC_EVENTOS.INTENCION_EXPIRADA, () => {
      setIntencionActiva(false);
      setEnCola(false);
      setPosicionCola(null);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off(NFC_EVENTOS.STATUS);
      socket.off(NFC_EVENTOS.ERROR);
      socket.off(NFC_EVENTOS.LECTURA);
      socket.off(NFC_EVENTOS.RESULTADO);
      socket.off(NFC_EVENTOS.CARNET_LEIDO);
      socket.off(NFC_EVENTOS.INTENCION_CONFIRMADA);
      socket.off(NFC_EVENTOS.EN_COLA);
      socket.off(NFC_EVENTOS.POSICION_COLA);
      socket.off(NFC_EVENTOS.LECTOR_LIBRE);
      socket.off(NFC_EVENTOS.INTENCION_REEMPLAZADA);
      socket.off(NFC_EVENTOS.INTENCION_EXPIRADA);
    };
  }, [token]);

  const _startKeepalive = useCallback(() => {
    _stopKeepalive();
    keepaliveRef.current = setInterval(() => {
      socket?.emit(NFC_EVENTOS.RENOVAR_INTENCION);
    }, KEEPALIVE_INTERVAL_MS);
  }, []);

  function _stopKeepalive() {
    if (keepaliveRef.current) {
      clearInterval(keepaliveRef.current);
      keepaliveRef.current = null;
    }
  }

  function iniciar() { socket?.emit(NFC_EVENTOS.START); }
  function detener() { socket?.emit(NFC_EVENTOS.STOP); }

  function registrarIntencion(modo) {
    // Evita reutilizar un carnet viejo al reabrir un flujo que depende de NFC.
    setUltimoCarnet(null);
    setUltimoResultado(null);
    socket?.emit(NFC_EVENTOS.REGISTRAR_INTENCION, { modo });
    _startKeepalive();
  }

  function cancelarIntencion() {
    _stopKeepalive();
    socket?.emit(NFC_EVENTOS.CANCELAR_INTENCION);
    setUltimoCarnet(null);
    setUltimoResultado(null);
    resetIntencion();
  }

  return { connected, error, statusMessage, iniciar, detener, registrarIntencion, cancelarIntencion };
}
