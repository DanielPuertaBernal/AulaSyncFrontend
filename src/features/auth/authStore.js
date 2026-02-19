import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Auth Store - Zustand
 * Reemplaza SessionManager singleton de Python
 */
export const useAuthStore = create(
  persist(
    (set) => ({
      token: null,
      refreshToken: null,
      usuario: null,
      isAuthenticated: false,

      login: ({ token, refreshToken, usuario }) =>
        set({ token, refreshToken, usuario, isAuthenticated: true }),

      logout: () =>
        set({ token: null, refreshToken: null, usuario: null, isAuthenticated: false }),

      updateUsuario: (usuario) => set({ usuario }),
    }),
    {
      name: 'auth-storage', // clave en localStorage
      partialize: (state) => ({
        token: state.token,
        refreshToken: state.refreshToken,
        usuario: state.usuario,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
