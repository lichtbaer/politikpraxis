import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { useAuthStore } from '../../store/authStore';
import { useContentStore } from '../../store/contentStore';
import { WahlnachtOnboarding } from './WahlnachtOnboarding';
import { LoadingScreen } from './LoadingScreen';
import { ErrorScreen } from './ErrorScreen';
import { Shell } from '../layout/Shell';
import { SaveHintBanner } from '../components/SaveHintBanner/SaveHintBanner';

export function GameView() {
  const { i18n } = useTranslation();
  const phase = useGameStore((s) => s.phase);
  const isLoggedIn = useAuthStore((s) => s.isLoggedIn);
  const contentLoaded = useContentStore((s) => s.loaded);
  const contentError = useContentStore((s) => s.error);
  const loadContent = useContentStore((s) => s.load);

  if (!contentLoaded) {
    if (contentError) {
      return <ErrorScreen message={contentError} onRetry={() => loadContent(i18n.language)} />;
    }
    return <LoadingScreen />;
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
