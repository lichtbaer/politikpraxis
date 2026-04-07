import { useState } from 'react';
import type { FormEvent } from 'react';
import { LegalPageShell } from './LegalPageShell';
import styles from './LegalPage.module.css';
import formStyles from './Kontakt.module.css';
import { apiFetch } from '../../services/api';

const BETREFF_OPTIONEN = [
  'Allgemeine Anfrage',
  'Feedback zum Spiel',
  'Technisches Problem',
  'Datenschutzanfrage',
  'Presse & Kooperationen',
] as const;

export function Kontakt() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [betreff, setBetreff] = useState<string>(BETREFF_OPTIONEN[0]);
  const [nachricht, setNachricht] = useState('');
  const [website, setWebsite] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);
    setLoading(true);
    try {
      await apiFetch('/kontakt', {
        method: 'POST',
        body: { name, email, betreff, nachricht, website },
        credentials: 'omit',
      });
      setSuccess(true);
      setName('');
      setEmail('');
      setBetreff(BETREFF_OPTIONEN[0]);
      setNachricht('');
      setWebsite('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler beim Senden.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <LegalPageShell title="Kontakt">
      <div className={styles.prose}>
        <p>
          Fragen, Feedback oder Datenschutzanfragen — wir antworten in der Regel innerhalb von{' '}
          <strong>48 Stunden</strong>.
        </p>
      </div>

      <form className={formStyles.form} onSubmit={handleSubmit} noValidate>
        <label className={formStyles.label}>
          <span className={formStyles.labelText}>Name</span>
          <input
            name="name"
            className={formStyles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            maxLength={100}
            autoComplete="name"
          />
        </label>

        <label className={formStyles.label}>
          <span className={formStyles.labelText}>E-Mail-Adresse</span>
          <input
            name="email"
            type="email"
            className={formStyles.input}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </label>

        <label className={formStyles.label}>
          <span className={formStyles.labelText}>Betreff</span>
          <select
            name="betreff"
            className={formStyles.select}
            value={betreff}
            onChange={(e) => setBetreff(e.target.value)}
          >
            {BETREFF_OPTIONEN.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </label>

        <label className={formStyles.label}>
          <span className={formStyles.labelText}>Nachricht</span>
          <textarea
            name="nachricht"
            className={formStyles.textarea}
            value={nachricht}
            onChange={(e) => setNachricht(e.target.value)}
            required
            minLength={20}
            maxLength={2000}
            rows={6}
          />
        </label>

        <input
          name="website"
          className={formStyles.honeypot}
          tabIndex={-1}
          autoComplete="off"
          value={website}
          onChange={(e) => setWebsite(e.target.value)}
          aria-hidden="true"
        />

        <button type="submit" className={formStyles.submit} disabled={loading}>
          {loading ? 'Wird gesendet...' : 'Nachricht senden'}
        </button>

        {success && (
          <p className={formStyles.success} role="status">
            Nachricht gesendet! Wir melden uns bald.
          </p>
        )}
        {error && (
          <p className={formStyles.err} role="alert">
            Fehler beim Senden: {error}
          </p>
        )}
      </form>
    </LegalPageShell>
  );
}
