import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Routes, Route, BrowserRouter } from 'react-router-dom';
import { MainMenu } from './ui/screens/MainMenu';
import { GameSetup } from './ui/screens/GameSetup';
import { GameView } from './ui/screens/GameView';
import { Credits } from './ui/screens/Credits';
import { LoadingScreen } from './ui/screens/LoadingScreen';
import { ErrorScreen } from './ui/screens/ErrorScreen';
import { useUIStore } from './store/uiStore';
import { useContentStore } from './stores/contentStore';

export default function App() {
  const theme = useUIStore((s) => s.theme);
  const { i18n } = useTranslation();
  const { load, loaded, error } = useContentStore();

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
  }, [theme]);

  useEffect(() => {
    load(i18n.language);
  }, [i18n.language, load]);

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
      </Routes>
    </BrowserRouter>
  );
}
