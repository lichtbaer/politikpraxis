import { useGameStore } from '../../store/gameStore';
import { WahlnachtOnboarding } from './WahlnachtOnboarding';
import { Shell } from '../layout/Shell';

export function GameView() {
  const phase = useGameStore((s) => s.phase);

  if (phase === 'onboarding') {
    return <WahlnachtOnboarding />;
  }

  return <Shell />;
}
