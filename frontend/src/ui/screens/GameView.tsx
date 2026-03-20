import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';
import { WahlnachtOnboarding } from './WahlnachtOnboarding';
import { Shell } from '../layout/Shell';
import { SaveHintBanner } from '../components/SaveHintBanner/SaveHintBanner';

export function GameView() {
  const phase = useGameStore((s) => s.phase);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);

  if (phase === 'onboarding') {
    return <WahlnachtOnboarding />;
  }

  return (
    <>
      {!isLoggedIn && <SaveHintBanner />}
      <Shell />
    </>
  );
}
