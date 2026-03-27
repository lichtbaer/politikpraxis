import { useTranslation } from 'react-i18next';
import { useGameStore } from '../../../store/gameStore';
import { useGameActions } from '../../hooks/useGameActions';
import { gesetzKongruenz } from '../../../core/ideologie';
import { featureActive } from '../../../core/systems/features';
import { getVorstufenBoni } from '../../../core/systems/gesetzLebenszyklus';
import { isVerfassungsgerichtBlockiert } from '../../../core/systems/parliament';
import { applyKongruenzEffekte, getEinbringenPkKosten } from '../../../core/systems/kongruenz';
import { getMedienPkZusatzkosten } from '../../../core/systems/medienklima';
import {
  kannGesetzEingebracht,
  getFehlendeRequires,
  getAusschliessendeExcludes,
  getAktiveEnhances,
} from '../../../core/gesetz';
import { GesetzStepper } from '../GesetzStepper/GesetzStepper';
import { AgendaCardEffects } from './AgendaCardEffects';
import { AgendaCardProgress } from './AgendaCardProgress';
import { AgendaCardActions } from './AgendaCardActions';
import type { Law, LawStatus } from '../../../core/types';
import { formatMrd } from '../../../utils/format';
import styles from './AgendaCard.module.css';

interface AgendaCardProps {
  law: Law;
  isRecommended?: boolean;
  showKongruenz?: boolean;
  recommendationScore?: number;
}

const STATUS_KEYS: Partial<Record<LawStatus, string>> = {
  entwurf: 'game.status.entwurf',
  eingebracht: 'game.status.eingebracht',
  aktiv: 'game.status.aktiv',
  bt_passed: 'game.status.bt_passed',
  blockiert: 'game.status.blockiert',
  beschlossen: 'game.status.beschlossen',
  ausweich: 'game.status.ausweich',
  br_einspruch: 'game.status.br_einspruch',
};

const STATUS_CLASS: Partial<Record<LawStatus, string>> = {
  entwurf: styles.statusEntwurf,
  eingebracht: styles.statusEingebracht,
  aktiv: styles.statusAktiv,
  bt_passed: styles.statusAktiv,
  blockiert: styles.statusBlockiert,
  beschlossen: styles.statusBeschlossen,
  ausweich: styles.statusAusweich,
  br_einspruch: styles.statusBlockiert,
};

export function AgendaCard({ law, isRecommended, showKongruenz, recommendationScore }: AgendaCardProps) {
  const { t } = useTranslation(['common', 'game']);
  const { state, content, complexity, ausrichtung } = useGameStore();
  const actions = useGameActions();
  const gesetzRelationen = content.gesetzRelationen;
  const expanded = law.expanded;
  const pk = state.pk;

  const kongruenz = gesetzKongruenz(ausrichtung, law);
  const projekt = state.gesetzProjekte?.[law.id];
  const boni = getVorstufenBoni(state, law.id);
  const hasFraming = featureActive(complexity, 'framing') && (law.framing_optionen?.length ?? 0) > 0;

  const haushalt = state.haushalt;
  const spielraum = haushalt?.spielraum ?? 0;
  const jahresbudget = haushalt ? haushalt.einnahmen - haushalt.pflichtausgaben : 0;

  const kongruenzEffekt = applyKongruenzEffekte(state, law.id, ausrichtung, complexity);
  const medienZusatz = featureActive(complexity, 'medienklima')
    ? getMedienPkZusatzkosten(state.medienKlima ?? 55)
    : 0;
  const geschaetztePkKosten =
    law.status === 'entwurf'
      ? Math.max(2, getEinbringenPkKosten(kongruenzEffekt.pkModifikator) - boni.pkKostenRabatt + medienZusatz)
      : 0;

  const handleHeaderClick = () => actions.toggleAgenda(law.id);

  const verfassungsgerichtBlockiert = isVerfassungsgerichtBlockiert(state, law);
  const canEinbringenRelationen = kannGesetzEingebracht(state, law.id, gesetzRelationen);
  const canEinbringen =
    law.status === 'entwurf' &&
    pk >= 20 &&
    !verfassungsgerichtBlockiert &&
    canEinbringenRelationen;
  const canLobbying = (law.status === 'entwurf' || law.status === 'aktiv' || law.status === 'eingebracht') && pk >= 12;

  const fehlendeRequires = law.status === 'entwurf' ? getFehlendeRequires(state, law.id, gesetzRelationen) : null;
  const ausschliessendeExcludes = law.status === 'entwurf' ? getAusschliessendeExcludes(state, law.id, gesetzRelationen) : null;
  const aktiveEnhances = law.status === 'entwurf' ? getAktiveEnhances(state, law.id, gesetzRelationen) : [];
  const isLocked = !!fehlendeRequires;
  const isExcluded = !!ausschliessendeExcludes;
  const hasSynergy = aktiveEnhances.length > 0;

  const getGesetzTitel = (id: string) => content.laws?.find((l) => l.id === id)?.titel ?? t(`game:laws.${id}.titel`, id);

  const einbringenTooltip = !canEinbringen && law.status === 'entwurf'
    ? verfassungsgerichtBlockiert
      ? t('game:gesetz.blockiertVerfassungsgericht')
      : !canEinbringenRelationen && fehlendeRequires
        ? t('game:gesetz.benoetigt', { gesetz: getGesetzTitel(fehlendeRequires.targetId), defaultValue: `Benötigt: ${getGesetzTitel(fehlendeRequires.targetId)}` })
        : !canEinbringenRelationen && ausschliessendeExcludes
          ? t('game:gesetz.ausgeschlossen', { gesetz: getGesetzTitel(ausschliessendeExcludes.targetId), defaultValue: `Nicht möglich: Du hast bereits ${getGesetzTitel(ausschliessendeExcludes.targetId)} beschlossen` })
          : pk < 20
            ? t('game:gesetz.pkNichtGenug', { required: 20, current: pk })
            : ''
    : '';
  const lobbyingTooltip = !canLobbying
    ? pk < 12
      ? t('game:gesetz.pkNichtGenug', { required: 12, current: pk })
      : ''
    : '';

  return (
    <div
      className={`${styles.card} ${isLocked || isExcluded ? styles.gesetzLocked : ''} ${hasSynergy ? styles.gesetzSynergy : ''}`}
      title={isLocked && fehlendeRequires ? getGesetzTitel(fehlendeRequires.targetId) : isExcluded && ausschliessendeExcludes ? getGesetzTitel(ausschliessendeExcludes.targetId) : undefined}
    >
      <header className={styles.header} onClick={handleHeaderClick}>
        <span className={`${styles.badge} ${STATUS_CLASS[law.status] ?? ''}`}>
          {t(STATUS_KEYS[law.status] ?? law.status, { ns: 'common' })}
        </span>
        {(law.steuer_id || ((law.einnahmeeffekt ?? 0) > 0 && (law.kosten_laufend ?? 0) <= 0)) && (
          <span className={styles.steuergesetzBadge}>
            📊 {t('game:gesetz.steuergesetz', 'Steuergesetz')}
            {(law.einnahmeeffekt ?? 0) > 0 && (
              <> — +{formatMrd(law.einnahmeeffekt!)} Mrd.</>
            )}
          </span>
        )}
        {(() => {
          const gekoppelt = state.gekoppelteGesetze?.[law.id];
          return gekoppelt && gekoppelt.length > 0 ? (
          <span className={styles.kopplungsHinweis}>
            🔗 {t('game:gesetz.wartetAuf', {
              gesetz: gekoppelt.map((id) => getGesetzTitel(id)).join(', '),
              defaultValue: `Wartet auf: ${gekoppelt.map((id) => getGesetzTitel(id)).join(', ')}`,
            })}
          </span>
          ) : null;
        })()}
        {isRecommended && (
          <span className={styles.empfohlenBadge}>
            {t('game:gesetzAgenda.empfohlen')}
          </span>
        )}
        {recommendationScore != null && (
          <span
            className={styles.scoreBadge}
            title={t('game:gesetzAgenda.scoreTip', { score: recommendationScore, defaultValue: `Empfehlungswert: ${recommendationScore}/100 (KPI-Bedarf, Erfolgschance, Kongruenz, Effizienz)` })}
          >
            {recommendationScore}
          </span>
        )}
        <h3 className={styles.title}>{law.titel || t(`game:laws.${law.id}.titel`)}</h3>
        {showKongruenz && (
          <span
            className={styles.kongruenzBadge}
            title={t('game:gesetzAgenda.kongruenzTooltip')}
          >
            <span className={styles.kongruenzLabel}>{t('game:gesetzAgenda.kongruenzLabel')}</span>
            <span className={styles.kongruenzValue}>
              {t('game:gesetzAgenda.kongruenz', { percent: kongruenz })}%
            </span>
          </span>
        )}
        <span className={styles.arrow}>{expanded ? '▲' : '▼'}</span>
      </header>

      {expanded && (
        <div className={styles.body}>
          {law.status !== 'entwurf' && (
            <GesetzStepper
              status={law.status}
              brauchtBundesrat={law.tags?.includes('bund') && law.brVoteMonth != null}
            />
          )}
          {law.status === 'entwurf' && (
            <>
              {fehlendeRequires && (
                <div className={styles.gesetzLockedBadge}>
                  🔒 {t('game:gesetz.benoetigt', { gesetz: getGesetzTitel(fehlendeRequires.targetId), defaultValue: `Benötigt: ${getGesetzTitel(fehlendeRequires.targetId)}` })}
                </div>
              )}
              {ausschliessendeExcludes && (
                <div className={styles.gesetzExcludedBadge}>
                  ⛔ {t('game:gesetz.ausgeschlossen', { gesetz: getGesetzTitel(ausschliessendeExcludes.targetId), defaultValue: `Ausgeschlossen durch: ${getGesetzTitel(ausschliessendeExcludes.targetId)}` })}
                </div>
              )}
              {hasSynergy && aktiveEnhances.map((rel) => (
                <div key={rel.targetId} className={styles.gesetzSynergyBadge}>
                  ⚡ {t('game:gesetz.synergie', {
                    pct: Math.round(((rel.enhancesFaktor ?? 1) - 1) * 100),
                    gesetz: getGesetzTitel(rel.targetId),
                    defaultValue: `Synergieeffekt +${Math.round(((rel.enhancesFaktor ?? 1) - 1) * 100)}% mit ${getGesetzTitel(rel.targetId)}`,
                  })}
                </div>
              ))}
            </>
          )}
          <p className={styles.desc}>{law.desc || t(`game:laws.${law.id}.desc`)}</p>

          <AgendaCardEffects
            law={law}
            complexity={complexity}
            kongruenz={kongruenz}
            geschaetztePkKosten={geschaetztePkKosten}
            spielraum={spielraum}
            jahresbudget={jahresbudget}
          />

          <div className={styles.tags}>
            {law.tags.map((tag) => (
              <span key={tag} className={styles.tag}>
                {t(`game.tags.${tag}`, { ns: 'common' }) ?? tag}
              </span>
            ))}
          </div>

          <AgendaCardProgress
            law={law}
            state={state}
            complexity={complexity}
            projekt={projekt}
            boni={boni}
            actions={actions}
            getGesetzTitel={getGesetzTitel}
          />

          <AgendaCardActions
            law={law}
            pk={pk}
            complexity={complexity}
            canEinbringen={canEinbringen}
            canLobbying={canLobbying}
            einbringenTooltip={einbringenTooltip}
            lobbyingTooltip={lobbyingTooltip}
            geschaetztePkKosten={geschaetztePkKosten}
            hasFraming={hasFraming}
            actions={actions}
          />
        </div>
      )}
    </div>
  );
}
