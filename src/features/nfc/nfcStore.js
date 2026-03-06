import { create } from 'zustand';

export const useNFCStore = create((set) => ({
  activo: false,
  ultimaLectura: null,
  ultimoResultado: null,
  ultimoCarnet: null,
  lecturas: [],
  setActivo: (activo) => set({ activo }),
  setUltimaLectura: (lectura) => set({ ultimaLectura: lectura }),
  setUltimoResultado: (resultado) => set({ ultimoResultado: resultado }),
  setUltimoCarnet: (carnet) => set({ ultimoCarnet: carnet }),
  addLectura: (lectura) => set((s) => ({ lecturas: [lectura, ...s.lecturas].slice(0, 50) })),
  limpiarLecturas: () => set({ lecturas: [], ultimaLectura: null, ultimoResultado: null, ultimoCarnet: null }),
}));
