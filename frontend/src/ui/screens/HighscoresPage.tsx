import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LegalPageShell } from './LegalPageShell';
import { fetchHighscores, type HighscoreItem } from '../../services/stats';

const PARTEIEN = ['sdp', 'cdp', 'gp', 'ldp', 'lp'] as const;

export function HighscoresPage() {
  const { t } = useTranslation('common');
  const [partei, setPartei] = useState<string>('sdp');
  const [complexity, setComplexity] = useState<number | ''>('');
  const [items, setItems] = useState<HighscoreItem[]>([]);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let c = false;
    void (async () => {
      try {
        const res = await fetchHighscores(
          partei,
          complexity === '' ? undefined : complexity,
          25,
        );
        if (!c) {
          setItems(res.items);
          setErr(null);
        }
      } catch (e) {
        if (!c) setErr(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      c = true;
    };
  }, [partei, complexity]);

  return (
    <LegalPageShell title={t('highscores.pageTitle', 'Highscores')}>
      <p style={{ marginBottom: '1rem', opacity: 0.9 }}>
        {t(
          'highscores.privacyHint',
          'Anonyme Rangliste: keine Namen, nur Titel und Spielkennzahlen. Nur Einträge mit Community-Opt-in.',
        )}
      </p>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
        <label>
          {t('highscores.filterParty', 'Partei')}{' '}
          <select value={partei} onChange={(e) => setPartei(e.target.value)}>
            {PARTEIEN.map((p) => (
              <option key={p} value={p}>
                {p.toUpperCase()}
              </option>
            ))}
          </select>
        </label>
        <label>
          {t('highscores.filterComplexity', 'Komplexität')}{' '}
          <select
            value={complexity === '' ? '' : String(complexity)}
            onChange={(e) => {
              const v = e.target.value;
              setComplexity(v === '' ? '' : Number(v));
            }}
          >
            <option value="">{t('highscores.all', 'Alle')}</option>
            <option value="1">1</option>
            <option value="2">2</option>
            <option value="3">3</option>
            <option value="4">4</option>
          </select>
        </label>
      </div>
      {err && <p role="alert">{err}</p>}
      <div style={{ overflowX: 'auto' }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
          <thead>
            <tr>
              <th style={{ textAlign: 'left', padding: '6px 8px' }}>#</th>
              <th style={{ textAlign: 'left', padding: '6px 8px' }}>
                {t('highscores.colTitle', 'Titel')}
              </th>
              <th style={{ textAlign: 'left', padding: '6px 8px' }}>
                {t('highscores.colParty', 'Partei')}
              </th>
              <th style={{ textAlign: 'right', padding: '6px 8px' }}>
                {t('highscores.colForecast', 'Wahlprognose')}
              </th>
              <th style={{ textAlign: 'right', padding: '6px 8px' }}>
                {t('highscores.colLaws', 'Gesetze')}
              </th>
              <th style={{ textAlign: 'right', padding: '6px 8px' }}>
                {t('highscores.colSaldo', 'Saldo')}
              </th>
              <th style={{ textAlign: 'right', padding: '6px 8px' }}>
                {t('highscores.colStufe', 'Stufe')}
              </th>
              <th style={{ textAlign: 'left', padding: '6px 8px' }}>
                {t('highscores.colDate', 'Datum')}
              </th>
            </tr>
          </thead>
          <tbody>
            {items.map((row, i) => (
              <tr key={`${row.created_at}-${i}`}>
                <td style={{ padding: '6px 8px' }}>{i + 1}</td>
                <td style={{ padding: '6px 8px' }}>{row.titel ?? '—'}</td>
                <td style={{ padding: '6px 8px' }}>{row.partei.toUpperCase()}</td>
                <td style={{ textAlign: 'right', padding: '6px 8px' }}>
                  {row.wahlprognose.toFixed(1)}%
                </td>
                <td style={{ textAlign: 'right', padding: '6px 8px' }}>
                  {row.gesetze_beschlossen ?? '—'}
                </td>
                <td style={{ textAlign: 'right', padding: '6px 8px' }}>
                  {row.saldo_final != null ? row.saldo_final.toFixed(1) : '—'}
                </td>
                <td style={{ textAlign: 'right', padding: '6px 8px' }}>{row.complexity}</td>
                <td style={{ padding: '6px 8px', fontSize: '0.85rem' }}>
                  {new Date(row.created_at).toLocaleDateString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {items.length === 0 && !err && (
          <p style={{ marginTop: '0.75rem' }}>{t('highscores.empty', 'Noch keine Einträge.')}</p>
        )}
      </div>
    </LegalPageShell>
  );
}
