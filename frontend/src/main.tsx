import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ErrorBoundary } from '@sentry/react';
import './i18n';
// ECharts wird NICHT hier importiert: der Entry-Chunk wuerde die Bibliothek sonst
// per `modulepreload` schon im Hauptmenue laden. Die Chart-Komponenten ziehen
// `ui/lib/echarts` selbst — dort laufen auch `echarts.use()` und die Theme-Registrierung.
import { initSentry } from './services/sentry';
import App from './App';
import { ErrorScreen } from './ui/screens/ErrorScreen';
import './styles/global.css';

initSentry();

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary
      fallback={({ resetError }) => (
        <ErrorScreen message="Ein unerwarteter Fehler ist aufgetreten." onRetry={resetError} />
      )}
    >
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </ErrorBoundary>
  </StrictMode>,
);
