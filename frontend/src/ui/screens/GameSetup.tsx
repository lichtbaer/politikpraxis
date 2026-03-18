import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { useUIStore, type Theme } from '../../store/uiStore';
import { PARTEI_STARTPUNKTE, SPIELBARE_PARTEIEN } from '../../data/defaults/parteien';
import { GeschlechtAuswahl, type KanzlerGeschlecht } from '../components/GeschlechtAuswahl/GeschlechtAuswahl';
import styles from './GameSetup.module.css';

const THEMES: { id: Theme; swatches: [string, string, string] }[] = [
  { id: 'amtsstube', swatches: ['#1c1a15', '#c8a84a', '#5a9870'] },
  { id: 'bruessel',  swatches: ['#0e1520', '#4a7ce0', '#3a9870'] },
  { id: 'redaktion', swatches: ['#09090c', '#e63946', '#22c55e'] },
  { id: 'lageraum',  swatches: ['#0d1117', '#22d3a0', '#38bdf8'] },
];

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

/** SMA-289: Stufe 1: init mit SDP. Stufe 2+: init erst im Onboarding (Partei-Auswahl). */
export function GameSetup() {
  const { t } = useTranslation('game');
  const navigate = useNavigate();
  const { init, setPlayerName, setKanzlerGeschlecht, setComplexity, setSpielerPartei, setAusrichtung } = useGameStore();

  const { theme, setTheme } = useUIStore();
  const [name, setName] = useState('');
  const [geschlecht, setGeschlecht] = useState<KanzlerGeschlecht>('sie');
  const [selectedComplexity, setSelectedComplexity] = useState(1);

  const handleKandidaturAnnehmen = () => {
    setPlayerName(name.trim().slice(0, 30));
    setKanzlerGeschlecht(geschlecht);
    setComplexity(selectedComplexity);
    if (selectedComplexity === 1) {
      const sdp = SPIELBARE_PARTEIEN.find((p) => p.id === 'sdp')!;
      setSpielerPartei({ id: sdp.id, kuerzel: sdp.kuerzel, farbe: sdp.farbe, name: sdp.name });
      setAusrichtung(PARTEI_STARTPUNKTE.sdp);
      init();
    }
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

        {/* Block A2 — Geschlecht (SMA-327) */}
        <section className={styles.block}>
          <label className={styles.label}>
            {t('gameSetup.geschlechtLabel')}
          </label>
          <GeschlechtAuswahl value={geschlecht} onChange={setGeschlecht} />
        </section>

        {/* Block B — Komplexitätsstufe (SMA-289: Ausrichtung/Partei im Onboarding) */}
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

        {/* Block C — Design / Spielstil */}
        <section className={styles.block}>
          <h2 className={styles.blockTitle}>{t('setup.themeLabel')}</h2>
          <div className={styles.themeGrid}>
            {THEMES.map(({ id, swatches }) => (
              <button
                key={id}
                type="button"
                className={`${styles.themeCard} ${theme === id ? styles.themeCardActive : ''}`}
                onClick={() => setTheme(id)}
              >
                <div className={styles.swatches}>
                  {swatches.map((color) => (
                    <span
                      key={color}
                      className={styles.swatch}
                      style={{ background: color }}
                    />
                  ))}
                </div>
                <span className={styles.themeName}>{t(`setup.theme_${id}`)}</span>
                <span className={styles.themeDesc}>{t(`setup.theme_${id}_desc`)}</span>
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
