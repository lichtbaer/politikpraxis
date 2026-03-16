import { useEffect } from 'react';
import { Shell } from './ui/layout/Shell';
import { useGameStore } from './store/gameStore';

export default function App() {
  const init = useGameStore(s => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return <Shell />;
}
