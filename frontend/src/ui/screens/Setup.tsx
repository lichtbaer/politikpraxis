import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import { useUIStore, type Theme } from '../../store/uiStore';
import styles from './Setup.module.css';

const THEMES: { id: Theme; swatches: [string, string, string] }[] = [
  { id: 'amtsstube', swatches: ['#1c1a15', '#c8a84a', '#5a9870'] },
  { id: 'bruessel',  swatches: ['#0e1520', '#4a7ce0', '#3a9870'] },
  { id: 'redaktion', swatches: ['#09090c', '#e63946', '#22c55e'] },
  { id: 'lageraum',  swatches: ['#0d1117', '#22d3a0', '#38bdf8'] },
];

export function Setup() {
  const { t } = useTranslation('game');
  const navigate = useNavigate();
  const { init, setPlayerName, setComplexity, playerName, complexity } =
    useGameStore();
  const { theme, setTheme } = useUIStore();
  const [name, setName] = useState(playerName || '');

  const handleStart = () => {
    setPlayerName(name.trim());
    setComplexity(complexity);
    init();
    navigate('/game');
  };

  return (
    <div className={styles.root}>
      <div className={styles.content}>
        <h1 className={styles.title}>{t('setup.title')}</h1>
        <p className={styles.subtitle}>{t('setup.subtitle')}</p>

        <div className={styles.form}>
          <label htmlFor="player-name" className={styles.label}>
            {t('setup.playerNameLabel')}
          </label>
          <input
            id="player-name"
            type="text"
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('setup.playerNamePlaceholder')}
          />

          <label htmlFor="complexity" className={styles.label}>
            {t('setup.complexityLabel')}
          </label>
          <select
            id="complexity"
            className={styles.select}
            value={complexity}
            onChange={(e) => setComplexity(Number(e.target.value))}
          >
            <option value={1}>{t('setup.complexity1')}</option>
            <option value={2}>{t('setup.complexity2')}</option>
            <option value={3}>{t('setup.complexity3')}</option>
          </select>

          <span className={styles.label}>{t('setup.themeLabel')}</span>
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
        </div>

        <button type="button" className={styles.primary} onClick={handleStart}>
          {t('setup.start')}
        </button>

        <button
          type="button"
          className={styles.back}
          onClick={() => navigate('/')}
        >
          {t('setup.back')}
        </button>
      </div>
    </div>
  );
}
