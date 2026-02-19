import { create } from 'zustand';

export const useNFCStore = create((set) => ({
  activo: false,
  ultimaLectura: null,
  lecturas: [],
  setActivo: (activo) => set({ activo }),
  setUltimaLectura: (lectura) => set({ ultimaLectura: lectura }),
  addLectura: (lectura) => set((s) => ({ lecturas: [lectura, ...s.lecturas].slice(0, 50) })),
  limpiarLecturas: () => set({ lecturas: [], ultimaLectura: null }),
}));
