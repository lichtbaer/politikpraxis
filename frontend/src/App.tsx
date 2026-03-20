import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Routes, Route, BrowserRouter } from 'react-router-dom';
import { MainMenu } from './ui/screens/MainMenu';
import { GameSetup } from './ui/screens/GameSetup';
import { GameView } from './ui/screens/GameView';
import { Credits } from './ui/screens/Credits';
import { Datenschutz } from './ui/screens/Datenschutz';
import { Impressum } from './ui/screens/Impressum';
import { Kontakt } from './ui/screens/Kontakt';
import { AuthCallback } from './ui/screens/AuthCallback';
import { LoadingScreen } from './ui/screens/LoadingScreen';
import { ErrorScreen } from './ui/screens/ErrorScreen';
import { useUIStore } from './store/uiStore';
import { useContentStore } from './stores/contentStore';
import { useAuthStore } from './store/authStore';

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
      <Routes>
        <Route path="/" element={<MainMenu />} />
        <Route path="/setup" element={<GameSetup />} />
        <Route path="/game" element={<GameView />} />
        <Route path="/credits" element={<Credits />} />
        <Route path="/datenschutz" element={<Datenschutz />} />
        <Route path="/impressum" element={<Impressum />} />
        <Route path="/kontakt" element={<Kontakt />} />
        <Route path="/auth/callback" element={<AuthCallback />} />
      </Routes>
    </BrowserRouter>
  );
}
