import { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';
import { useUIStore } from '../../store/uiStore';

const SPEEDS = [0, 2000, 1000];
/** #282: Tick-Intervall im „Weiter bis zum nächsten Ereignis"-Vorlauf. */
const FAST_FORWARD_INTERVAL_MS = 250;

export function useGameTick() {
  const speed = useGameStore(s => s.state.speed);
  const gameTick = useGameStore(s => s.gameTick);
  const fastForwardActive = useUIStore(s => s.fastForwardActive);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (speed > 0) {
      const interval = fastForwardActive ? FAST_FORWARD_INTERVAL_MS : SPEEDS[speed];
      intervalRef.current = setInterval(gameTick, interval);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [speed, gameTick, fastForwardActive]);
}
