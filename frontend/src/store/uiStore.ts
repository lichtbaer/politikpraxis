import { create } from 'zustand';
import { loadPlayerSettings, savePlayerSettings, type PlayerSettings } from '../services/playerSettings';

export type Theme = 'amtsstube' | 'bruessel' | 'redaktion' | 'lageraum';
export type ToastType = 'info' | 'success' | 'warning' | 'danger';

interface ToastItem {
  id: number;
  msg: string;
  type: ToastType;
  /** #284: größeres, länger sichtbares Feedback für Momente wie Gesetzesbeschluss oder Achievement-Freischaltung */
  major?: boolean;
}

interface UIStore {
  charDetailId: string | null;
  toastQueue: ToastItem[];
  theme: Theme;
  /** SMA-396 */
  playerSettings: PlayerSettings;
  openMonatszusammenfassung: boolean;
  /** SMA-406: Monatszusammenfassung „Details“ → Fokus Ereignisprotokoll (rechtes Panel) */
  focusEreignisprotokollRequestId: number;
  /** Tastatur-Shortcut-Hilfe (Shell) — auch per Header-Button erreichbar */
  showShortcutHelp: boolean;
  /** #282: „Weiter bis zum nächsten Ereignis" — beschleunigter Vorlauf mit Auto-Stopp */
  fastForwardActive: boolean;
  /** #281: Glossar-Schlüssel, zu dem gerade eine Öffnung angefordert wurde (z. B. aus einem GameTip) */
  openGlossarKey: string | null;
  /** #281: Zähler, der bei jeder Öffnungsanfrage erhöht wird (auch bei gleichem Key erneut auslösbar) */
  openGlossarRequestId: number;

  showCharDetail: (id: string) => void;
  closeCharDetail: () => void;
  showToast: (msg: string, type?: ToastType, options?: { major?: boolean }) => void;
  dismissToast: (id: number) => void;
  setTheme: (theme: Theme) => void;
  setPlayerSettings: (partial: Partial<PlayerSettings>) => void;
  setOpenMonatszusammenfassung: (open: boolean) => void;
  requestFocusEreignisprotokoll: () => void;
  setShowShortcutHelp: (show: boolean) => void;
  setFastForwardActive: (active: boolean) => void;
  requestOpenGlossar: (key: string) => void;
}

let toastCounter = 0;
const MAX_TOASTS = 4;
const TOAST_DURATION = 2800;
/** #284: große Momente (Gesetzesbeschluss, Achievement) bleiben länger sichtbar als Routine-Toasts */
const TOAST_DURATION_MAJOR = 5200;

export const useUIStore = create<UIStore>((set, get) => ({
  charDetailId: null,
  toastQueue: [],
  theme: 'amtsstube',
  playerSettings: loadPlayerSettings(),
  openMonatszusammenfassung: false,
  focusEreignisprotokollRequestId: 0,
  showShortcutHelp: false,
  fastForwardActive: false,
  openGlossarKey: null,
  openGlossarRequestId: 0,

  showCharDetail: (id) => set({ charDetailId: id }),
  closeCharDetail: () => set({ charDetailId: null }),

  showToast: (msg, type = 'info', options) => {
    const major = options?.major ?? false;
    const id = ++toastCounter;
    set((state) => ({
      toastQueue: [...state.toastQueue.slice(-(MAX_TOASTS - 1)), { id, msg, type, major }],
    }));
    setTimeout(() => get().dismissToast(id), major ? TOAST_DURATION_MAJOR : TOAST_DURATION);
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

  requestFocusEreignisprotokoll: () =>
    set((s) => ({ focusEreignisprotokollRequestId: s.focusEreignisprotokollRequestId + 1 })),

  setShowShortcutHelp: (show) => set({ showShortcutHelp: show }),

  setFastForwardActive: (active) => set({ fastForwardActive: active }),

  requestOpenGlossar: (key) =>
    set((s) => ({ openGlossarKey: key, openGlossarRequestId: s.openGlossarRequestId + 1 })),
}));
