import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { featureActive } from '../../../core/systems/features';
import { ROUTE_INFO } from '../../../core/systems/levels';
import { VorbereitungModal } from '../VorbereitungModal/VorbereitungModal';
import { FramingModal } from '../FramingModal/FramingModal';
import { ConfirmDialog } from '../ConfirmDialog/ConfirmDialog';
import type { Law, RouteType, ViewName } from '../../../core/types';
import styles from './AgendaCard.module.css';

interface AgendaCardActionsProps {
  law: Law;
  pk: number;
  complexity: number;
  canEinbringen: boolean;
  canLobbying: boolean;
  einbringenTooltip: string;
  lobbyingTooltip: string;
  geschaetztePkKosten: number;
  hasFraming: boolean;
  actions: {
    einbringen: (lawId: string) => void;
    einbringenMitFraming: (lawId: string, framingKey: string | null) => void;
    lobbying: (lawId: string) => void;
    abstimmen: (lawId: string) => void;
    setView: (view: ViewName) => void;
    startRoute: (lawId: string, route: RouteType) => void;
    vermittlungsausschuss: (lawId: string) => void;
    ueberstimmeBReinspruch: (lawId: string) => void;
  };
}

export function AgendaCardActions({
  law, pk, complexity, canEinbringen, canLobbying,
  einbringenTooltip, lobbyingTooltip, geschaetztePkKosten,
  hasFraming, actions,
}: AgendaCardActionsProps) {
  const { t } = useTranslation(['common', 'game']);
  const [showVorbereitungModal, setShowVorbereitungModal] = useState(false);
  const [showFramingModal, setShowFramingModal] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ title: string; message: string; cost: number; action: () => void } | null>(null);

  return (
    <>
      <div className={styles.actions}>
        {law.status === 'entwurf' && (
          <>
            {featureActive(complexity, 'kommunal_pilot') && law.kommunal_pilot_moeglich !== false && (
              <button
                type="button"
                className={styles.btn}
                onClick={() => setShowVorbereitungModal(true)}
              >
                + {t('game:vorstufen.vorbereitung')}
              </button>
            )}
            <button
              type="button"
              className={styles.btn}
              disabled={!canEinbringen}
              title={einbringenTooltip}
              onClick={() => {
                const doEinbringen = () => {
                  if (hasFraming) {
                    setShowFramingModal(true);
                  } else {
                    actions.einbringen(law.id);
                  }
                };
                if (geschaetztePkKosten > 10) {
                  setPendingAction({
                    title: t('game:agenda.einbringen'),
                    message: t('game:confirm.einbringenMessage', { name: law.titel || t(`game:laws.${law.id}.titel`), defaultValue: `Gesetz "${law.titel || t(`game:laws.${law.id}.titel`)}" wirklich einbringen?` }),
                    cost: geschaetztePkKosten,
                    action: doEinbringen,
                  });
                } else {
                  doEinbringen();
                }
              }}
            >
              {t('game:agenda.einbringen')} ({geschaetztePkKosten} PK)
            </button>
          </>
        )}
        {(law.status === 'entwurf' || law.status === 'aktiv' || law.status === 'eingebracht') && (
          <button
            type="button"
            className={styles.btn}
            disabled={!canLobbying}
            title={lobbyingTooltip}
            onClick={() => {
              setPendingAction({
                title: t('game:agenda.lobbying'),
                message: t('game:confirm.lobbyingMessage', { name: law.titel || t(`game:laws.${law.id}.titel`), defaultValue: `Lobbying für "${law.titel || t(`game:laws.${law.id}.titel`)}" durchführen?` }),
                cost: 12,
                action: () => actions.lobbying(law.id),
              });
            }}
          >
            {t('game:agenda.lobbying')} (12 PK)
          </button>
        )}
        {law.status === 'aktiv' && (
          <button
            type="button"
            className={styles.btn}
            onClick={() => actions.abstimmen(law.id)}
          >
            {t('game:agenda.abstimmen')}
          </button>
        )}
        {law.status === 'bt_passed' && (
          <button
            type="button"
            className={styles.btn}
            onClick={() => actions.setView('bundesrat')}
          >
            {t('game:agenda.bundesratLobbying')}
          </button>
        )}
        {law.status === 'br_einspruch' && (
          <div className={styles.einspruchActions}>
            <p className={styles.einspruchHint}>
              {t('game:agenda.brEinspruchHint', 'Bundesrat hat Einspruch eingelegt (Art. 77 GG).')}
            </p>
            <button
              type="button"
              className={styles.btn}
              disabled={pk < 15 || law.ja <= 50}
              title={law.ja <= 50 ? t('game:agenda.ueberstimmenKeineMehrheit', 'Absolute Mehrheit im Bundestag nicht erreichbar') : undefined}
              onClick={() => actions.ueberstimmeBReinspruch(law.id)}
            >
              {t('game:agenda.ueberstimmen', 'Einspruch überstimmen')} (15 PK)
            </button>
            <button
              type="button"
              className={styles.btn}
              disabled={pk < 20}
              onClick={() => actions.vermittlungsausschuss(law.id)}
            >
              {t('game:agenda.vermittlungsausschuss', 'Vermittlungsausschuss')} (20 PK)
            </button>
          </div>
        )}
        {law.status === 'blockiert' && law.blockiert === 'bundesrat' && (
          <table className={styles.routeTable}>
            <thead>
              <tr>
                <th>{t('game:agenda.routeName')}</th>
                <th>{t('game:agenda.routeKosten')}</th>
                <th>{t('game:agenda.routeDauer')}</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {(['eu', 'land', 'kommune'] as RouteType[]).map((route) => {
                const info = ROUTE_INFO[route];
                const overrides = law.route_overrides?.[route];
                const cost = overrides?.cost ?? info.cost;
                const dur = overrides?.dur ?? info.dur;
                const canRoute = pk >= cost;
                return (
                  <tr key={route}>
                    <td>{t(`game:routes.${route}`)}</td>
                    <td className={!canRoute ? styles.routeCostInsufficient : undefined}>{cost} PK</td>
                    <td>{dur}</td>
                    <td>
                      <button
                        type="button"
                        className={styles.btn}
                        disabled={!canRoute}
                        onClick={() => actions.startRoute(law.id, route)}
                      >
                        {t('game:agenda.routeStarten')}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {pendingAction && (
        <ConfirmDialog
          title={pendingAction.title}
          message={pendingAction.message}
          cost={pendingAction.cost}
          currentPk={pk}
          onConfirm={() => {
            pendingAction.action();
            setPendingAction(null);
          }}
          onCancel={() => setPendingAction(null)}
        />
      )}
      {showVorbereitungModal && (
        <VorbereitungModal law={law} onClose={() => setShowVorbereitungModal(false)} />
      )}
      {showFramingModal && hasFraming && (
        <FramingModal
          law={law}
          onConfirm={(framingKey) => {
            actions.einbringenMitFraming(law.id, framingKey);
            setShowFramingModal(false);
          }}
          onClose={() => setShowFramingModal(false)}
        />
      )}
    </>
  );
}
