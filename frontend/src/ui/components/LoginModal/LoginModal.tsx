import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { getMe, login, register, requestMagicLink } from '../../../services/auth';
import { useAuthStore } from '../../../store/authStore';
import styles from './LoginModal.module.css';

interface LoginModalProps {
  onClose: () => void;
}

export function LoginModal({ onClose }: LoginModalProps) {
  const { t } = useTranslation();
  const applyUser = useAuthStore((s) => s.applyUser);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [magicSent, setMagicSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleMagicLink = async () => {
    setError(null);
    setLoading(true);
    try {
      await requestMagicLink(email.trim());
      setMagicSent(true);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const finishAuth = async (accessToken: string) => {
    const me = await getMe(accessToken);
    applyUser(me, accessToken);
    onClose();
  };

  const handleLogin = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await login(email.trim(), password);
      await finishAuth(res.access_token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async () => {
    setError(null);
    setLoading(true);
    try {
      const res = await register(email.trim(), password);
      await finishAuth(res.access_token);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.backdrop} role="dialog" aria-modal="true" aria-labelledby="login-title">
      <div className={styles.dialog}>
        <button type="button" className={styles.close} onClick={onClose} aria-label={t('auth.close')}>
          ×
        </button>
        <h2 id="login-title" className={styles.title}>
          {t('auth.title')}
        </h2>
        <p className={styles.subtitle}>{t('auth.subtitle')}</p>

        {magicSent && (
          <p className={styles.success} role="status">
            {t('auth.magicSent')}
          </p>
        )}

        {error && <p className={styles.error}>{error}</p>}

        <div className={styles.field}>
          <label className={styles.label} htmlFor="auth-email">
            {t('auth.email')}
          </label>
          <input
            id="auth-email"
            className={styles.input}
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="name@example.com"
          />
        </div>

        <div className={styles.row}>
          <button
            type="button"
            className={styles.primary}
            disabled={loading || !email.trim()}
            onClick={handleMagicLink}
          >
            {t('auth.sendMagicLink')}
          </button>
        </div>

        <div className={styles.passwordBlock}>
          <button type="button" className={styles.linkBtn} onClick={() => setShowPassword((v) => !v)}>
            {showPassword ? t('auth.hidePassword') : t('auth.showPassword')}
          </button>

          {showPassword && (
            <>
              <div className={styles.field}>
                <label className={styles.label} htmlFor="auth-password">
                  {t('auth.password')}
                </label>
                <input
                  id="auth-password"
                  className={styles.input}
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={8}
                />
              </div>
              <div className={styles.passwordActions}>
                <button
                  type="button"
                  className={styles.secondary}
                  disabled={loading || !email.trim() || password.length < 8}
                  onClick={handleLogin}
                >
                  {t('auth.login')}
                </button>
                <button
                  type="button"
                  className={styles.secondary}
                  disabled={loading || !email.trim() || password.length < 8}
                  onClick={handleRegister}
                >
                  {t('auth.register')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
