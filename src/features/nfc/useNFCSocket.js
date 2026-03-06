import { useEffect, useState } from 'react';
import { io } from 'socket.io-client';
import { useNFCStore } from './nfcStore';

let socket = null;

export function useNFCSocket() {
  const { setActivo, setUltimaLectura, setUltimoResultado, setUltimoCarnet, addLectura } = useNFCStore();
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
    socket.on('nfc:carnet_leido', (payload) => {
      setUltimoCarnet(payload);
    });

    return () => {
      socket.off('connect');
      socket.off('disconnect');
      socket.off('nfc:status');
      socket.off('nfc:error');
      socket.off('nfc:lectura');
      socket.off('nfc:resultado');
      socket.off('nfc:carnet_leido');
    };
  }, []);

  function iniciar() { socket?.emit('nfc:start'); }
  function detener() { socket?.emit('nfc:stop'); }
  function simular(codigo) { socket?.emit('nfc:simulate', { codigo }); }
  function setModo(modo) { socket?.emit('nfc:set_modo', { modo }); }

  return { connected, error, iniciar, detener, simular, setModo };
}
