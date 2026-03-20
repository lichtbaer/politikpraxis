import { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuthStore } from '../../store/authStore';

/**
 * Nach Magic-Link-Redirect: Session per Refresh-Cookie aufbauen.
 */
export function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const bootstrap = useAuthStore((s) => s.bootstrap);

  useEffect(() => {
    const magic = params.get('magic');
    if (magic !== 'success') {
      navigate('/', { replace: true });
      return;
    }
    void (async () => {
      await bootstrap();
      navigate('/', { replace: true });
    })();
  }, [bootstrap, navigate, params]);

  return (
    <div style={{ padding: 24, fontFamily: 'var(--sans, sans-serif)', color: 'var(--text2)' }}>
      Anmeldung…
    </div>
  );
}
