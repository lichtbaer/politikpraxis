import { create } from 'zustand';
import { loadPlayerSettings, savePlayerSettings, type PlayerSettings } from '../services/playerSettings';

export type Theme = 'amtsstube' | 'bruessel' | 'redaktion' | 'lageraum';
export type ToastType = 'info' | 'success' | 'warning' | 'danger';

interface ToastItem {
  id: number;
  msg: string;
  type: ToastType;
}

interface UIStore {
  charDetailId: string | null;
  toastQueue: ToastItem[];
  theme: Theme;
  /** SMA-396 */
  playerSettings: PlayerSettings;
  openMonatszusammenfassung: boolean;

  showCharDetail: (id: string) => void;
  closeCharDetail: () => void;
  showToast: (msg: string, type?: ToastType) => void;
  dismissToast: (id: number) => void;
  setTheme: (theme: Theme) => void;
  setPlayerSettings: (partial: Partial<PlayerSettings>) => void;
  setOpenMonatszusammenfassung: (open: boolean) => void;
}

let toastCounter = 0;
const MAX_TOASTS = 4;
const TOAST_DURATION = 2800;

export const useUIStore = create<UIStore>((set, get) => ({
  charDetailId: null,
  toastQueue: [],
  theme: 'amtsstube',
  playerSettings: loadPlayerSettings(),
  openMonatszusammenfassung: false,

  showCharDetail: (id) => set({ charDetailId: id }),
  closeCharDetail: () => set({ charDetailId: null }),

  showToast: (msg, type = 'info') => {
    const id = ++toastCounter;
    set((state) => ({
      toastQueue: [...state.toastQueue.slice(-(MAX_TOASTS - 1)), { id, msg, type }],
    }));
    setTimeout(() => get().dismissToast(id), TOAST_DURATION);
  },

  dismissToast: (id) => {
    set((state) => ({
      toastQueue: state.toastQueue.filter((t) => t.id !== id),
    }));
  },

  setTheme: (theme) => set({ theme }),

  setPlayerSettings: (partial) => {
    const next = savePlayerSettings(partial);
    set({ playerSettings: next });
  },

  setOpenMonatszusammenfassung: (open) => set({ openMonatszusammenfassung: open }),
}));
