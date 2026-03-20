import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';
import { WahlnachtOnboarding } from './WahlnachtOnboarding';
import { Shell } from '../layout/Shell';
import { SaveHintBanner } from '../components/SaveHintBanner/SaveHintBanner';

export function GameView() {
  const phase = useGameStore((s) => s.phase);
  const token = useAuthStore((s) => s.token);

  if (phase === 'onboarding') {
    return <WahlnachtOnboarding />;
  }

  return (
    <>
      {!token && <SaveHintBanner />}
      <Shell />
    </>
  );
}
