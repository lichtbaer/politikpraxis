import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';
import { useContentStore } from '../../store/contentStore';
import { WahlnachtOnboarding } from './WahlnachtOnboarding';
import { Shell } from '../layout/Shell';
import { SaveHintBanner } from '../components/SaveHintBanner/SaveHintBanner';

export function GameView() {
  const phase = useGameStore((s) => s.phase);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const contentLoaded = useContentStore((s) => s.loaded);
  const contentError = useContentStore((s) => s.error);

  if (!contentLoaded) {
    if (contentError) {
      return <div style={{ padding: '2rem', textAlign: 'center' }}>{contentError}</div>;
    }
    return <div style={{ padding: '2rem', textAlign: 'center' }}>Inhalte werden geladen…</div>;
  }

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
