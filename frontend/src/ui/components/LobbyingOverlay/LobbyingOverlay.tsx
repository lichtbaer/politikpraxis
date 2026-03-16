import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../../store/gameStore';
import { isLobbyingActive } from '../../../core/systems/bundesrat';
import type { BundesratFraktion, Law } from '../../../core/types';
import styles from './LobbyingOverlay.module.css';

const PK_SCHICHT_1 = 15;
const PK_SCHICHT_1_REDUZIERT = 10;
const PK_REPARATUR = 25;

function getPkCost(beziehung: number): number {
  return beziehung >= 60 && beziehung <= 79 ? PK_SCHICHT_1_REDUZIERT : PK_SCHICHT_1;
}

function canLobby(fraktion: BundesratFraktion, state: { month: number }): boolean {
  if (fraktion.beziehung >= 20) return true;
  if (fraktion.reparaturEndMonth != null && state.month >= fraktion.reparaturEndMonth) return true;
  return false;
}

interface LobbyingOverlayProps {
  fraktion: BundesratFraktion;
  law: Law;
  onClose: () => void;
}

export function LobbyingOverlay({ fraktion, law, onClose }: LobbyingOverlayProps) {
  const { t } = useTranslation('game');
  const state = useGameStore((s) => s.state);
  const doLobbyFraktion = useGameStore((s) => s.doLobbyFraktion);

  const lobbyingActive = isLobbyingActive(state, law.id);
  const lobby = law.lobbyFraktionen?.[fraktion.id];
  const lobbyGesperrt = !canLobby(fraktion, state);
  const pkCost = getPkCost(fraktion.beziehung);

  const monateBisAbstimmung = law.brVoteMonth ? law.brVoteMonth - state.month : 0;

  const tradeoffVerfuegbar =
    lobbyingActive &&
    !lobbyGesperrt &&
    !lobby?.tradeoffAngenommen &&
    !lobby?.tradeoffAblehnen &&
    !lobby?.tradeoffGegenvorschlag &&
    fraktion.tradeoffPool.length > 0;

  const ersterTradeoff = fraktion.tradeoffPool[0];

  const handlePkInvestieren = () => {
    doLobbyFraktion(fraktion.id, law.id, 1);
    onClose();
  };

  const handleForderungAnnehmen = () => {
    if (ersterTradeoff) {
      doLobbyFraktion(fraktion.id, law.id, 2, {
        action: 'annehmen',
        tradeoffId: ersterTradeoff.id,
      });
      onClose();
    }
  };

  const handleAblehnen = () => {
    if (ersterTradeoff) {
      doLobbyFraktion(fraktion.id, law.id, 2, {
        action: 'ablehnen',
        tradeoffId: ersterTradeoff.id,
      });
      onClose();
    }
  };

  const handleReparatur = () => {
    doLobbyFraktion(fraktion.id, law.id, 'reparatur');
    onClose();
  };

  return (
    <div className={styles.overlay} onClick={onClose}>
      <div className={styles.sheet} onClick={(e) => e.stopPropagation()}>
        <button type="button" className={styles.closeBtn} onClick={onClose} aria-label={t('game:bundesrat.close')}>
          ×
        </button>

        <div className={styles.portrait}>
          <div
            className={styles.avatar}
            style={{
              backgroundColor: `${fraktion.sprecher.color}33`,
              borderColor: fraktion.sprecher.color,
            }}
          >
            {fraktion.sprecher.initials}
          </div>
          <blockquote className={styles.zitat}>
            „{fraktion.sprecher.quote ? t(`game:bundesratFraktionen.${fraktion.id}.sprecher.quote`) : t(`game:bundesratFraktionen.${fraktion.id}.sprecher.bio`)}“
          </blockquote>
        </div>

        <div className={styles.countdown}>
          {t('game:bundesrat.monateBisAbstimmung', { count: monateBisAbstimmung })}
        </div>

        {lobbyGesperrt ? (
          <div className={styles.gesperrt}>
            <p className={styles.gesperrtHinweis}>
              {t('game:bundesrat.lobbyingGesperrt')}
            </p>
            <button
              type="button"
              className={styles.btnReparatur}
              onClick={handleReparatur}
              disabled={state.pk < PK_REPARATUR}
            >
              {t('game:bundesrat.reparatur')}
            </button>
          </div>
        ) : (
          <>
            {tradeoffVerfuegbar && ersterTradeoff && (
              <div className={styles.forderung}>
                <h4 className={styles.forderungTitle}>{t('game:bundesrat.forderungTitle')}</h4>
                <p className={styles.forderungLabel}>{t(`game:bundesratFraktionen.${fraktion.id}.tradeoffPool.${ersterTradeoff.id}.label`)}</p>
                <p className={styles.forderungDesc}>{t(`game:bundesratFraktionen.${fraktion.id}.tradeoffPool.${ersterTradeoff.id}.desc`)}</p>
              </div>
            )}

            <div className={styles.aktionen}>
              {!lobby?.pkInvestiert && lobbyingActive && (
                <button
                  type="button"
                  className={styles.btn}
                  onClick={handlePkInvestieren}
                  disabled={state.pk < pkCost}
                >
                  {t('game:bundesrat.pkInvestieren', { cost: pkCost })}
                </button>
              )}
              {tradeoffVerfuegbar && ersterTradeoff && (
                <>
                  <button type="button" className={styles.btnPrimary} onClick={handleForderungAnnehmen}>
                    {t('game:bundesrat.forderungAnnehmen')}
                  </button>
                  <button type="button" className={styles.btnSecondary} onClick={handleAblehnen}>
                    Ablehnen
                  </button>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
