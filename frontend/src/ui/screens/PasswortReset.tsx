import { type FormEvent, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { confirmPasswordReset, getMe } from '../../services/auth';
import { useAuthStore } from '../../store/authStore';
import { LegalPageShell } from './LegalPageShell';
import styles from './PasswortReset.module.css';

export function PasswortReset() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const token = params.get('token');
  const applyUser = useAuthStore((s) => s.applyUser);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!token) return;
    if (newPassword !== confirmPassword) {
      setError(t('auth.passwordMismatch'));
      return;
    }
    if (newPassword.length < 8) {
      setError(t('auth.passwordTooShort'));
      return;
    }
    setLoading(true);
    try {
      const res = await confirmPasswordReset(token, newPassword);
      const me = await getMe(res.access_token);
      applyUser(me, res.access_token);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error');
    } finally {
      setLoading(false);
    }
  };

  if (!token) {
    return (
      <LegalPageShell title={t('auth.passwordResetTitle')}>
        <p className={styles.lead}>{t('auth.passwordResetNoToken')}</p>
        <Link className={styles.backLink} to="/">
          {t('auth.passwordResetBackHome')}
        </Link>
      </LegalPageShell>
    );
  }

  return (
    <LegalPageShell title={t('auth.passwordResetTitle')}>
      <p className={styles.lead}>{t('auth.passwordResetIntro')}</p>
      <form className={styles.form} onSubmit={(e) => void handleSubmit(e)}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="pw-new">
            {t('auth.newPassword')}
          </label>
          <input
            id="pw-new"
            className={styles.input}
            type="password"
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>
        <div className={styles.field}>
          <label className={styles.label} htmlFor="pw-confirm">
            {t('auth.confirmPassword')}
          </label>
          <input
            id="pw-confirm"
            className={styles.input}
            type="password"
            autoComplete="new-password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
          />
        </div>
        {error && (
          <div className={styles.errorBlock}>
            <p className={styles.error}>{error}</p>
            <Link className={styles.inlineLink} to="/">
              {t('auth.passwordResetBackHome')}
            </Link>
          </div>
        )}
        <button type="submit" className={styles.submit} disabled={loading}>
          {loading ? '…' : t('auth.passwordResetSave')}
        </button>
      </form>
    </LegalPageShell>
  );
}
