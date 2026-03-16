import { useState, useEffect, useCallback } from 'react';
import { useGameStore } from '../../store/gameStore';
import { featureActive } from '../../core/systems/features';
import type { Character } from '../../core/types';
import styles from './WahlnachtOnboarding.module.css';

const LEVEL1_CHAR_IDS = ['kanzler', 'fm'];

export function WahlnachtOnboarding() {
  const { state, playerName, complexity, startGame } = useGameStore();
  const [beat, setBeat] = useState(1);

  const advance = useCallback(() => {
    if (beat < 4) setBeat((b) => b + 1);
    else startGame();
  }, [beat, startGame]);

  // Beat 1: Auto-Weiter nach 4s
  useEffect(() => {
    if (beat !== 1) return;
    const t = setTimeout(advance, 4000);
    return () => clearTimeout(t);
  }, [beat, advance]);

  // Tastatur: Enter/Space
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        advance();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [advance]);

  const chars: Character[] =
    complexity >= 2
      ? state.chars
      : state.chars.filter((c) => LEVEL1_CHAR_IDS.includes(c.id));

  const name = playerName.trim() || 'Die neue Regierung';
  const lawCount = state.gesetze.length;
  const pk = state.pk;
  const showBundesratLine = featureActive(complexity, 'bundesrat_simple');

  return (
    <div className={styles.root}>
      {/* Beat 1 — Schlagzeile */}
      {beat === 1 && (
        <div className={styles.beat1}>
          <div className={styles.headline}>
            <h1 className={styles.h1}>BUNDESTAGSWAHL 2025</h1>
            <h2 className={styles.h2}>
              {name.toUpperCase()} GEWINNT —<br />
              NEUE REGIERUNG MÖGLICH
            </h2>
            <p className={styles.meta}>
              40,2% · SPD/Grüne-Koalition wahrscheinlich
              <br />
              Wahlbeteiligung: 76,3% · Historische Nacht in Berlin
            </p>
          </div>
          <button type="button" className={styles.weiter} onClick={advance}>
            Weiter
          </button>
        </div>
      )}

      {/* Beat 2 — Kabinett-Vorstellung */}
      {beat === 2 && (
        <div className={styles.beat2}>
          <div className={styles.chars}>
            {chars.map((c, i) => (
              <div
                key={c.id}
                className={styles.char}
                style={{ animationDelay: `${i * 300}ms` }}
              >
                <div
                  className={styles.avatar}
                  style={{
                    backgroundColor: `${c.color}33`,
                    borderColor: c.color,
                  }}
                >
                  {c.initials}
                </div>
                <span className={styles.charName}>{c.name}</span>
                <span className={styles.charRole}>{c.role}</span>
                <span className={styles.charTag}>{c.tag ?? c.interests[0]}</span>
              </div>
            ))}
          </div>
          <p className={styles.kabinettText}>
            Dein Kabinett. Sechs Persönlichkeiten, sechs Agenden.
          </p>
          <button type="button" className={styles.weiter} onClick={advance}>
            Weiter
          </button>
        </div>
      )}

      {/* Beat 3 — Internes Memo */}
      {beat === 3 && (
        <div className={styles.beat3}>
          <pre className={styles.memo}>
            {`AN: Bundeskanzleramt
VON: Koalitionsarbeitsgruppe
BETREFF: Koalitionsvertrag — offene Punkte

Der Entwurf des Koalitionsvertrags liegt vor.
${lawCount} Gesetzentwürfe sind priorisiert.
Politisches Kapital: ${pk} Einheiten verfügbar.${showBundesratLine ? '\n\nErste Bundesratssitzung: in 3 Monaten.' : ''}

Die Arbeit beginnt jetzt.`}
          </pre>
          <button type="button" className={styles.weiter} onClick={advance}>
            Weiter
          </button>
        </div>
      )}

      {/* Beat 4 — Call to Action */}
      {beat === 4 && (
        <div className={styles.beat4}>
          <p className={styles.ctaText}>
            <em>Glückwunsch. Du hast gewonnen.</em>
            <br />
            <strong>Jetzt fängt die Arbeit richtig los.</strong>
          </p>
          <button
            type="button"
            className={styles.insKanzleramt}
            onClick={advance}
          >
            Ins Kanzleramt
          </button>
        </div>
      )}
    </div>
  );
}
