import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../store/gameStore';
import styles from './Setup.module.css';

export function Setup() {
  const { t } = useTranslation('game');
  const navigate = useNavigate();
  const { init, setPlayerName, setComplexity, playerName, complexity } =
    useGameStore();
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
