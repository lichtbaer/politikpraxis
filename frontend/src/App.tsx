import { useEffect, lazy, Suspense } from 'react';
import { useTranslation } from 'react-i18next';
import { Routes, Route, BrowserRouter } from 'react-router-dom';
import { MainMenu } from './ui/screens/MainMenu';
import { GameSetup } from './ui/screens/GameSetup';
import { Credits } from './ui/screens/Credits';
import { AuthCallback } from './ui/screens/AuthCallback';
import { PasswortReset } from './ui/screens/PasswortReset';
import { LoadingScreen } from './ui/screens/LoadingScreen';
import { ErrorScreen } from './ui/screens/ErrorScreen';
import { OfflineBanner } from './ui/components/OfflineBanner/OfflineBanner';
import { useUIStore } from './store/uiStore';
import { useContentStore } from './store/contentStore';
import { useAuthStore } from './store/authStore';

const GameView = lazy(() => import('./ui/screens/GameView').then((m) => ({ default: m.GameView })));
const StatistikenPage = lazy(() =>
  import('./ui/screens/StatistikenPage').then((m) => ({ default: m.StatistikenPage })),
);
const HighscoresPage = lazy(() =>
  import('./ui/screens/HighscoresPage').then((m) => ({ default: m.HighscoresPage })),
);
const Datenschutz = lazy(() => import('./ui/screens/Datenschutz').then((m) => ({ default: m.Datenschutz })));
const Impressum = lazy(() => import('./ui/screens/Impressum').then((m) => ({ default: m.Impressum })));
const Kontakt = lazy(() => import('./ui/screens/Kontakt').then((m) => ({ default: m.Kontakt })));

export default function App() {
  const theme = useUIStore((s) => s.theme);
  const { i18n } = useTranslation();
  const { load, loaded, error } = useContentStore();
  const bootstrapAuth = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    load(i18n.language);
    document.documentElement.lang = i18n.language;
    // RTL-Vorbereitung: Arabisch, Hebräisch, Farsi, Urdu
    const RTL_LANGS = new Set(['ar', 'he', 'fa', 'ur']);
    document.documentElement.dir = RTL_LANGS.has(i18n.language) ? 'rtl' : 'ltr';
  }, [i18n.language, load]);

  useEffect(() => {
    void bootstrapAuth();
  }, [bootstrapAuth]);

  if (!loaded && !error) {
    return <LoadingScreen />;
  }
  if (error) {
    return <ErrorScreen message={error} onRetry={() => load(i18n.language)} />;
  }

  return (
    <BrowserRouter>
      <OfflineBanner />
      <Suspense fallback={<LoadingScreen />}>
        <Routes>
          <Route path="/" element={<MainMenu />} />
          <Route path="/setup" element={<GameSetup />} />
          <Route path="/game" element={<GameView />} />
          <Route path="/credits" element={<Credits />} />
          <Route path="/datenschutz" element={<Datenschutz />} />
          <Route path="/impressum" element={<Impressum />} />
          <Route path="/kontakt" element={<Kontakt />} />
          <Route path="/auth/callback" element={<AuthCallback />} />
          <Route path="/passwort-reset" element={<PasswortReset />} />
          <Route path="/statistiken" element={<StatistikenPage />} />
          <Route path="/highscores" element={<HighscoresPage />} />
        </Routes>
      </Suspense>
    </BrowserRouter>
  );
}
