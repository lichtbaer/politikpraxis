import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { PARTEI_STARTPUNKTE, SPIELBARE_PARTEIEN } from '../../data/defaults/parteien';
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

/** SMA-289: Stufe 1: init mit SDP. Stufe 2+: init erst im Onboarding (Partei-Auswahl). */
export function GameSetup() {
  const { t } = useTranslation('game');
  const navigate = useNavigate();
  const { init, setPlayerName, setComplexity, setSpielerPartei, setAusrichtung } = useGameStore();

  const [name, setName] = useState('');
  const [selectedComplexity, setSelectedComplexity] = useState(1);

  const handleKandidaturAnnehmen = () => {
    setPlayerName(name.trim().slice(0, 30));
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
