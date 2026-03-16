import { create } from 'zustand';

interface AuthStore {
  token: string | null;
  username: string | null;

  setAuth: (token: string, username: string) => void;
  logout: () => void;
}

const STORAGE_KEY = 'bundesrepublik_auth';

function loadFromStorage(): { token: string | null; username: string | null } {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) return JSON.parse(data);
  } catch { /* ignore */ }
  return { token: null, username: null };
}

export const useAuthStore = create<AuthStore>((set) => ({
  ...loadFromStorage(),

  setAuth: (token, username) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ token, username }));
    set({ token, username });
  },

  logout: () => {
    localStorage.removeItem(STORAGE_KEY);
    set({ token: null, username: null });
  },
}));
