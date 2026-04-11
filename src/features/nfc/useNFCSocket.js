import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useAuthStore } from '@/features/auth/authStore';
import { NFC_EVENTOS, NFC_NAMESPACE } from '@/shared/constants';
import { useNFCStore } from './nfcStore';

let socket = null;

export function useNFCSocket() {
  const { setActivo, setUltimaLectura, setUltimoResultado, setUltimoCarnet, addLectura } = useNFCStore();
  const token = useAuthStore((state) => state.token);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');
  const [statusMessage, setStatusMessage] = useState('Esperando conexión NFC');

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
      return undefined;
    }

    if (!socket) {
      socket = io(NFC_NAMESPACE, {
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

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('connect_error');
      socket.off(NFC_EVENTOS.STATUS);
      socket.off(NFC_EVENTOS.ERROR);
      socket.off(NFC_EVENTOS.LECTURA);
      socket.off(NFC_EVENTOS.RESULTADO);
      socket.off(NFC_EVENTOS.CARNET_LEIDO);
    };
  }, [token]);

  function iniciar() { socket?.emit(NFC_EVENTOS.START); }
  function detener() { socket?.emit(NFC_EVENTOS.STOP); }
  function simular(codigo) { socket?.emit(NFC_EVENTOS.SIMULAR, { codigo }); }
  function setModo(modo) { socket?.emit(NFC_EVENTOS.SET_MODO, { modo }); }

  return { connected, error, statusMessage, iniciar, detener, simular, setModo };
}
