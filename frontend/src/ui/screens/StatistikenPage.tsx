import { useEffect, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { LegalPageShell } from './LegalPageShell';
import { fetchCommunityStats, type CommunityStats } from '../../services/stats';

export function StatistikenPage() {
  const { t } = useTranslation('common');
  const [data, setData] = useState<CommunityStats | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let c = false;
    void (async () => {
      try {
        const s = await fetchCommunityStats();
        if (!c) setData(s);
      } catch (e) {
        if (!c) setErr(e instanceof Error ? e.message : String(e));
      }
    })();
    return () => {
      c = true;
    };
  }, []);

  return (
    <LegalPageShell title={t('stats.pageTitle')}>
      <p style={{ marginBottom: '1rem', opacity: 0.9 }}>
        {t('stats.privacyHint')}
      </p>
      {err && <p role="alert">{err}</p>}
      {!data && !err && <p>{t('stats.loading')}</p>}
      {data && (
        <>
          <section style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
              {t('stats.overall')}
            </h2>
            <ul style={{ listStyle: 'none', padding: 0 }}>
              <li>
                {t('stats.totalGames')}: <strong>{data.gesamt}</strong>
              </li>
              <li>
                {t('stats.winrate')}: <strong>{data.gewinnrate}%</strong>
              </li>
              <li>
                {t('stats.avgForecast')}:{' '}
                <strong>{data.wahlprognose_avg}%</strong>
              </li>
            </ul>
          </section>
          {data.nach_partei.length > 0 && (
            <section style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                {t('stats.byParty')}
              </h2>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.95rem' }}>
                <thead>
                  <tr>
                    <th style={{ textAlign: 'left', padding: '4px 8px' }}>{t('stats.colParty')}</th>
                    <th style={{ textAlign: 'right', padding: '4px 8px' }}>{t('stats.colCount')}</th>
                    <th style={{ textAlign: 'right', padding: '4px 8px' }}>{t('stats.colWinrate')}</th>
                    <th style={{ textAlign: 'right', padding: '4px 8px' }}>{t('stats.colForecast')}</th>
                  </tr>
                </thead>
                <tbody>
                  {data.nach_partei.map((row) => (
                    <tr key={row.partei}>
                      <td style={{ padding: '4px 8px' }}>{row.partei.toUpperCase()}</td>
                      <td style={{ textAlign: 'right', padding: '4px 8px' }}>{row.anzahl}</td>
                      <td style={{ textAlign: 'right', padding: '4px 8px' }}>{row.gewinnrate}%</td>
                      <td style={{ textAlign: 'right', padding: '4px 8px' }}>
                        {row.wahlprognose_avg}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          )}
          {data.top_politikfelder.length > 0 && (
            <section style={{ marginBottom: '1.5rem' }}>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                {t('stats.topFields')}
              </h2>
              <ul>
                {data.top_politikfelder.map((x) => (
                  <li key={x.feld}>
                    {x.feld}: {x.anzahl}
                  </li>
                ))}
              </ul>
            </section>
          )}
          {data.titel_verteilung.length > 0 && (
            <section>
              <h2 style={{ fontSize: '1.1rem', marginBottom: '0.5rem' }}>
                {t('stats.titles')}
              </h2>
              <ul>
                {data.titel_verteilung.map((x) => (
                  <li key={x.titel}>
                    {x.titel}: {x.anzahl}
                  </li>
                ))}
              </ul>
            </section>
          )}
        </>
      )}
    </LegalPageShell>
  );
}
