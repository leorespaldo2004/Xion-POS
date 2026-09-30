import { create } from 'zustand';

export interface User {
  id: string;
  name: string;
  role: 'admin' | 'cashier' | 'manager';
}

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  token: string | null;
  login: (user: User, token: string) => void;
  logout: () => void;
}

export const useAuthStore = create<AuthState>((set) => ({
  user: { id: 'cashier-1', name: 'Cajero Móvil', role: 'cashier' },
  isAuthenticated: true,
  token: 'mock-local-token',
  login: (user, token) => set({ user, token, isAuthenticated: true }),
  logout: () => set({ user: null, token: null, isAuthenticated: false })
}));
