import { create } from 'zustand';

interface UIStore {
  charDetailId: string | null;
  toastMessage: string | null;
  toastTimeout: ReturnType<typeof setTimeout> | null;

  showCharDetail: (id: string) => void;
  closeCharDetail: () => void;
  showToast: (msg: string) => void;
}

export const useUIStore = create<UIStore>((set, get) => ({
  charDetailId: null,
  toastMessage: null,
  toastTimeout: null,

  showCharDetail: (id) => set({ charDetailId: id }),
  closeCharDetail: () => set({ charDetailId: null }),

  showToast: (msg) => {
    const prev = get().toastTimeout;
    if (prev) clearTimeout(prev);
    const timeout = setTimeout(() => set({ toastMessage: null, toastTimeout: null }), 2800);
    set({ toastMessage: msg, toastTimeout: timeout });
  },
}));
