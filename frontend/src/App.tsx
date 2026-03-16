import { useEffect } from 'react';
import { Shell } from './ui/layout/Shell';
import { WahlnachtOnboarding } from './ui/screens/WahlnachtOnboarding';
import { useGameStore } from './store/gameStore';

export default function App() {
  const init = useGameStore((s) => s.init);
  const phase = useGameStore((s) => s.phase);

  useEffect(() => {
    init();
  }, [init]);

  if (phase === 'onboarding') {
    return <WahlnachtOnboarding />;
  }

  return <Shell />;
}
