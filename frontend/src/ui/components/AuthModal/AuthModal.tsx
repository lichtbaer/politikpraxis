import { useState } from 'react';
import { login, register } from '../../../services/auth';
import { useAuthStore } from '../../../store/authStore';
import styles from './AuthModal.module.css';

interface AuthModalProps {
  onClose: () => void;
  /** Nach erfolgreichem Login/Registrierung */
  onLoggedIn?: () => void;
}

export function AuthModal({ onClose, onLoggedIn }: AuthModalProps) {
  const setAuth = useAuthStore((s) => s.setAuth);
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setPending(true);
    try {
      if (mode === 'register') {
        const res = await register(email.trim(), username.trim(), password);
        setAuth(res.access_token, res.username);
      } else {
        const res = await login(email.trim(), password);
        setAuth(res.access_token, res.username);
      }
      onLoggedIn?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Anmeldung fehlgeschlagen');
    } finally {
      setPending(false);
    }
  };

  return (
    <div className={styles.overlay} onClick={onClose} role="presentation">
      <div className={styles.dialog} onClick={(e) => e.stopPropagation()} role="dialog" aria-modal="true" aria-labelledby="auth-modal-title">
        <h2 id="auth-modal-title" className={styles.title}>
          {mode === 'login' ? 'Anmelden' : 'Registrieren'}
        </h2>
        <div className={styles.tabs}>
          <button
            type="button"
            className={mode === 'login' ? styles.tabOn : styles.tab}
            onClick={() => { setMode('login'); setError(null); }}
          >
            Login
          </button>
          <button
            type="button"
            className={mode === 'register' ? styles.tabOn : styles.tab}
            onClick={() => { setMode('register'); setError(null); }}
          >
            Registrieren
          </button>
        </div>
        <form onSubmit={handleSubmit} className={styles.form}>
          <label className={styles.label}>
            E-Mail
            <input
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </label>
          {mode === 'register' && (
            <label className={styles.label}>
              Benutzername
              <input
                type="text"
                className={styles.input}
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                minLength={3}
                autoComplete="username"
              />
            </label>
          )}
          <label className={styles.label}>
            Passwort
            <input
              type="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            />
          </label>
          {error && <p className={styles.error}>{error}</p>}
          <div className={styles.actions}>
            <button type="button" className={styles.btnGhost} onClick={onClose}>
              Abbrechen
            </button>
            <button type="submit" className={styles.btnPrimary} disabled={pending}>
              {pending ? '…' : mode === 'login' ? 'Anmelden' : 'Konto anlegen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
