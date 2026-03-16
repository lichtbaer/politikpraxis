import { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import type { Ausrichtung } from '../../core/systems/ausrichtung';
import styles from './GameSetup.module.css';

const COMPLEXITY_LEVELS = [
  {
    id: 1,
    titleKey: 'gameSetup.complexity1Title',
    bulletsKey: ['gameSetup.complexity1Bullet1', 'gameSetup.complexity1Bullet2', 'gameSetup.complexity1Bullet3'],
    threshold: 35,
  },
  {
    id: 2,
    titleKey: 'gameSetup.complexity2Title',
    bulletsKey: ['gameSetup.complexity2Bullet1', 'gameSetup.complexity2Bullet2', 'gameSetup.complexity2Bullet3'],
    threshold: 38,
  },
  {
    id: 3,
    titleKey: 'gameSetup.complexity3Title',
    bulletsKey: ['gameSetup.complexity3Bullet1', 'gameSetup.complexity3Bullet2', 'gameSetup.complexity3Bullet3'],
    threshold: 40,
  },
  {
    id: 4,
    titleKey: 'gameSetup.complexity4Title',
    bulletsKey: ['gameSetup.complexity4Bullet1', 'gameSetup.complexity4Bullet2', 'gameSetup.complexity4Bullet3'],
    threshold: 42,
  },
] as const;

function buildAusrichtungSatz(
  ausrichtung: Ausrichtung,
  t: (key: string, opts?: Record<string, number | string>) => string
): string {
  const parts: string[] = [];
  if (ausrichtung.wirtschaft !== 0) {
    parts.push(
      ausrichtung.wirtschaft < 0
        ? t('gameSetup.ausrichtungWirtschaftUmverteilung', { val: Math.abs(ausrichtung.wirtschaft) })
        : t('gameSetup.ausrichtungWirtschaftWachstum', { val: ausrichtung.wirtschaft })
    );
  }
  if (ausrichtung.gesellschaft !== 0) {
    parts.push(
      ausrichtung.gesellschaft < 0
        ? t('gameSetup.ausrichtungGesellschaftOffenheit', { val: Math.abs(ausrichtung.gesellschaft) })
        : t('gameSetup.ausrichtungGesellschaftOrdnung', { val: ausrichtung.gesellschaft })
    );
  }
  if (ausrichtung.staat !== 0) {
    parts.push(
      ausrichtung.staat < 0
        ? t('gameSetup.ausrichtungStaatGemeinschaft', { val: Math.abs(ausrichtung.staat) })
        : t('gameSetup.ausrichtungStaatEigenverantwortung', { val: ausrichtung.staat })
    );
  }
  if (parts.length === 0) return t('gameSetup.ausrichtungNeutral');
  return t('gameSetup.ausrichtungSatz', { parts: parts.join(', ') });
}

export function GameSetup() {
  const { t } = useTranslation('game');
  const navigate = useNavigate();
  const { init, setPlayerName, setComplexity, setAusrichtung } = useGameStore();

  const [name, setName] = useState('');
  const [selectedComplexity, setSelectedComplexity] = useState(1);
  const [ausrichtung, setLocalAusrichtung] = useState<Ausrichtung>({
    wirtschaft: 0,
    gesellschaft: 0,
    staat: 0,
  });

  const ausrichtungSatz = useMemo(
    () => buildAusrichtungSatz(ausrichtung, (k, opts) => t(k as never, opts)),
    [ausrichtung, t]
  );

  const handleKandidaturAnnehmen = () => {
    setPlayerName(name.trim().slice(0, 30));
    setComplexity(selectedComplexity);
    setAusrichtung(ausrichtung);
    init();
    navigate('/game');
  };

  return (
    <div className={styles.root}>
      <div className={styles.content}>
        <h1 className={styles.title}>{t('gameSetup.title')}</h1>
        <p className={styles.subtitle}>{t('gameSetup.subtitle')}</p>

        {/* Block A — Name */}
        <section className={styles.block}>
          <label htmlFor="player-name" className={styles.label}>
            {t('gameSetup.nameLabel')}
          </label>
          <input
            id="player-name"
            type="text"
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value.slice(0, 30))}
            placeholder={t('gameSetup.namePlaceholder')}
            maxLength={30}
          />
        </section>

        {/* Block B — Politische Ausrichtung */}
        <section className={styles.block}>
          <h2 className={styles.blockTitle}>{t('gameSetup.ausrichtungTitle')}</h2>

          <div className={styles.sliderGroup}>
            <label className={styles.sliderLabel}>
              <span className={styles.sliderPole}>{t('gameSetup.wirtschaftLinks')}</span>
              <span className={styles.sliderDim}>Wirtschaft</span>
              <span className={styles.sliderPole}>{t('gameSetup.wirtschaftRechts')}</span>
            </label>
            <input
              type="range"
              min={-100}
              max={100}
              step={1}
              value={ausrichtung.wirtschaft}
              onChange={(e) =>
                setLocalAusrichtung((a) => ({ ...a, wirtschaft: Number(e.target.value) }))
              }
              className={styles.slider}
            />
          </div>

          <div className={styles.sliderGroup}>
            <label className={styles.sliderLabel}>
              <span className={styles.sliderPole}>{t('gameSetup.gesellschaftLinks')}</span>
              <span className={styles.sliderDim}>Gesellschaft</span>
              <span className={styles.sliderPole}>{t('gameSetup.gesellschaftRechts')}</span>
            </label>
            <input
              type="range"
              min={-100}
              max={100}
              step={1}
              value={ausrichtung.gesellschaft}
              onChange={(e) =>
                setLocalAusrichtung((a) => ({ ...a, gesellschaft: Number(e.target.value) }))
              }
              className={styles.slider}
            />
          </div>

          <div className={styles.sliderGroup}>
            <label className={styles.sliderLabel}>
              <span className={styles.sliderPole}>{t('gameSetup.staatLinks')}</span>
              <span className={styles.sliderDim}>Staat</span>
              <span className={styles.sliderPole}>{t('gameSetup.staatRechts')}</span>
            </label>
            <input
              type="range"
              min={-100}
              max={100}
              step={1}
              value={ausrichtung.staat}
              onChange={(e) =>
                setLocalAusrichtung((a) => ({ ...a, staat: Number(e.target.value) }))
              }
              className={styles.slider}
            />
          </div>

          <p className={styles.ausrichtungSatz}>{ausrichtungSatz}</p>
        </section>

        {/* Block C — Komplexitätsstufe */}
        <section className={styles.block}>
          <h2 className={styles.blockTitle}>{t('gameSetup.complexityTitle')}</h2>
          <div className={styles.complexityGrid}>
            {COMPLEXITY_LEVELS.map((level) => (
              <button
                key={level.id}
                type="button"
                className={`${styles.complexityTile} ${selectedComplexity === level.id ? styles.complexityTileSelected : ''}`}
                onClick={() => setSelectedComplexity(level.id)}
              >
                <span className={styles.complexityNum}>{level.id}</span>
                <span className={styles.complexityTitle}>{t(level.titleKey)}</span>
                <ul className={styles.complexityBullets}>
                  {level.bulletsKey.map((key) => (
                    <li key={key}>{t(key)}</li>
                  ))}
                </ul>
                <span className={styles.complexityThreshold}>
                  {t('gameSetup.wahlhuerde', { percent: level.threshold })}
                </span>
              </button>
            ))}
          </div>
        </section>

        <button type="button" className={styles.primary} onClick={handleKandidaturAnnehmen}>
          {t('gameSetup.kandidaturAnnehmen')}
        </button>

        <button type="button" className={styles.back} onClick={() => navigate('/')}>
          {t('gameSetup.back')}
        </button>
      </div>
    </div>
  );
}
