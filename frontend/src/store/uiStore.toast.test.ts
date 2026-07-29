/**
 * #284: Erfolgs-Feedback nach Wichtigkeit abgestuft — große Momente (Gesetzesbeschluss,
 * Achievement) bleiben länger sichtbar als Routine-Toasts.
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { useUIStore } from './uiStore';

describe('uiStore.showToast — abgestufte Wichtigkeit', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    useUIStore.setState({ toastQueue: [] });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('markiert einen Toast ohne options als nicht major', () => {
    useUIStore.getState().showToast('Routine-Ereignis', 'info');
    const [item] = useUIStore.getState().toastQueue;
    expect(item.major).toBeFalsy();
  });

  it('markiert einen Toast mit major:true entsprechend', () => {
    useUIStore.getState().showToast('Gesetz beschlossen!', 'success', { major: true });
    const [item] = useUIStore.getState().toastQueue;
    expect(item.major).toBe(true);
  });

  it('major-Toast bleibt länger sichtbar als ein Routine-Toast', () => {
    useUIStore.getState().showToast('Routine-Ereignis', 'info');
    useUIStore.getState().showToast('Gesetz beschlossen!', 'success', { major: true });
    expect(useUIStore.getState().toastQueue).toHaveLength(2);

    vi.advanceTimersByTime(2800);
    expect(useUIStore.getState().toastQueue).toHaveLength(1);
    expect(useUIStore.getState().toastQueue[0].major).toBe(true);

    vi.advanceTimersByTime(2400);
    expect(useUIStore.getState().toastQueue).toHaveLength(0);
  });
});
