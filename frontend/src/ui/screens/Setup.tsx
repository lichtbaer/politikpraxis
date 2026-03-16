import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '../../store/gameStore';
import styles from './Setup.module.css';

export function Setup() {
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
        <h1 className={styles.title}>Spiel starten</h1>
        <p className={styles.subtitle}>Konfiguriere deine Regierung</p>

        <div className={styles.form}>
          <label htmlFor="player-name" className={styles.label}>
            Spielername (optional)
          </label>
          <input
            id="player-name"
            type="text"
            className={styles.input}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Deine Regierung"
          />

          <label htmlFor="complexity" className={styles.label}>
            Komplexität
          </label>
          <select
            id="complexity"
            className={styles.select}
            value={complexity}
            onChange={(e) => setComplexity(Number(e.target.value))}
          >
            <option value={1}>Einfach</option>
            <option value={2}>Standard</option>
            <option value={3}>Vollständig</option>
          </select>
        </div>

        <button type="button" className={styles.primary} onClick={handleStart}>
          Spiel starten
        </button>

        <button
          type="button"
          className={styles.back}
          onClick={() => navigate('/')}
        >
          Zurück
        </button>
      </div>
    </div>
  );
}
