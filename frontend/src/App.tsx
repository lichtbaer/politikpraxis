import { useEffect } from 'react';
import { Shell } from './ui/layout/Shell';
import { WahlnachtOnboarding } from './ui/screens/WahlnachtOnboarding';
import { useGameStore } from './store/gameStore';

export default function App() {
  const init = useGameStore((s) => s.init);
  const phase = useGameStore((s) => s.phase);

  useEffect(() => {
    init();
    // Nur einmal beim Mount; leere Deps verhindern Re-Run bei Store-Updates (React #185).
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (phase === 'onboarding') {
    return <WahlnachtOnboarding />;
  }

  return <Shell />;
}
