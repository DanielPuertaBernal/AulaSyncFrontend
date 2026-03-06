import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useNFCStore } from './nfcStore';

let socket = null;

export function useNFCSocket() {
  const { setActivo, setUltimaLectura, setUltimoResultado, addLectura } = useNFCStore();
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!socket) {
      socket = io('/nfc', { transports: ['websocket'] });
    }

    socket.on('connect', () => setConnected(true));
    socket.on('disconnect', () => { setConnected(false); setActivo(false); });
    socket.on('nfc:status', ({ activo }) => setActivo(activo));
    socket.on('nfc:error', ({ mensaje }) => setError(mensaje));
    socket.on('nfc:lectura', (payload) => {
      setUltimaLectura(payload);
      addLectura(payload);
    });
    socket.on('nfc:resultado', (payload) => {
      setUltimoResultado(payload);
      addLectura({ codigo: payload.id_carnet, timestamp: payload.timestamp });
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('nfc:status');
      socket.off('nfc:error');
      socket.off('nfc:lectura');
      socket.off('nfc:resultado');
    };
  }, []);

  function iniciar() { socket?.emit('nfc:start'); }
  function detener() { socket?.emit('nfc:stop'); }
  function simular(codigo) { socket?.emit('nfc:simulate', { codigo }); }

  return { connected, error, iniciar, detener, simular };
}
