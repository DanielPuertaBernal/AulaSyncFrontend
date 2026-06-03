import { create } from 'zustand';

export const useNFCStore = create((set) => ({
  activo: false,
  ultimaLectura: null,
  ultimoResultado: null,
  ultimoCarnet: null,
  lecturas: [],
  // Estado de intención NFC
  intencionActiva: false,
  enCola: false,
  posicionCola: null,
  expiraEn: null,
  setActivo: (activo) => set({ activo }),
  setUltimaLectura: (lectura) => set({ ultimaLectura: lectura }),
  setUltimoResultado: (resultado) => set({ ultimoResultado: resultado }),
  setUltimoCarnet: (carnet) => set({ ultimoCarnet: carnet }),
  addLectura: (lectura) => set((s) => ({ lecturas: [lectura, ...s.lecturas].slice(0, 50) })),
  limpiarLecturas: () => set({ lecturas: [], ultimaLectura: null, ultimoResultado: null, ultimoCarnet: null }),
  setIntencionActiva: (v) => set({ intencionActiva: v }),
  setEnCola: (v) => set({ enCola: v }),
  setPosicionCola: (v) => set({ posicionCola: v }),
  setExpiraEn: (v) => set({ expiraEn: v }),
  resetIntencion: () => set({ intencionActiva: false, enCola: false, posicionCola: null, expiraEn: null }),
}));
