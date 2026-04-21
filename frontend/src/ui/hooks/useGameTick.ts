import { useEffect, useRef } from 'react';
import { useGameStore } from '../../store/gameStore';

const SPEEDS = [0, 2000];

export function useGameTick() {
  const speed = useGameStore(s => s.state.speed);
  const gameTick = useGameStore(s => s.gameTick);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    if (speed > 0) {
      intervalRef.current = setInterval(gameTick, SPEEDS[speed]);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [speed, gameTick]);
}
