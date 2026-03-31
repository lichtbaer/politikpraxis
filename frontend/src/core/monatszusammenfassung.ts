/**
 * SMA-396: Monatszusammenfassung — Diff zwischen Spielzustand vor/nach einem Monats-Tick.
 */
import type { ContentBundle, GameState, Law, MonatsDiff } from './types';
import type { MedienAkteurTyp } from '../data/defaults/medienAkteure';
import { berechneMedienSpielerPerspektive } from './medienSpielerPerspektive';

export type { MonatsDiff } from './types';

function lawById(gesetze: Law[], id: string): Law | undefined {
  return gesetze.find((g) => g.id === id);
}

function collectNeueFired(before: string[] | undefined, after: string[] | undefined): string[] {
  const prev = new Set(before ?? []);
  const a = after ?? [];
  return a.filter((id) => !prev.has(id));
}

function buildMedienGrund(
  beschlossene: string[],
  gescheiterte: string[],
  content: ContentBundle,
  index: number,
): string {
  if (index < beschlossene.length) {
    const law = content.laws.find((l) => l.id === beschlossene[index]);
    return law ? `${law.kurz} beschlossen` : 'Gesetz beschlossen';
  }
  const bi = index - beschlossene.length;
  if (bi >= 0 && bi < gescheiterte.length) {
    const law = content.laws.find((l) => l.id === gescheiterte[bi]);
    return law ? `${law.kurz} gescheitert` : 'Gesetz gescheitert';
  }
  return 'Monatsverlauf';
}

/**
 * Berechnet die Zusammenfassung für den Monat `nach.month` (Zustand nach dem Tick).
 */
export function berechneMonatsDiff(
  vor: GameState,
  nach: GameState,
  content: ContentBundle,
): MonatsDiff {
  const monat = nach.month;

  const beschlosseneGesetze = nach.gesetze
    .filter((g) => g.status === 'beschlossen')
    .filter((g) => lawById(vor.gesetze, g.id)?.status !== 'beschlossen')
    .map((g) => g.id);

  const gescheiterteGesetze: string[] = [];
  for (const law of nach.gesetze) {
    if (law.status !== 'blockiert' || !law.blockiert) continue;
    const prevLaw = lawById(vor.gesetze, law.id);
    if (prevLaw?.status === 'blockiert' && prevLaw.blockiert === law.blockiert) continue;
    gescheiterteGesetze.push(law.id);
  }

  const eingebrachteGesetze = (nach.eingebrachteGesetze ?? [])
    .filter((e) => e.eingebrachtMonat === monat)
    .map((e) => e.gesetzId);

  const medienVor = vor.medienKlima ?? vor.zust.g;
  const medienNach = nach.medienKlima ?? nach.zust.g;
  const saldoVor = vor.haushalt?.saldo ?? 0;
  const saldoNach = nach.haushalt?.saldo ?? 0;

  const wahlVor = vor.zust.g;
  const wahlNach = nach.zust.g;

  const round1 = (n: number) => Math.round(n * 10) / 10;

  const milieu_deltas: Record<string, number> = {};
  const mzNach = nach.milieuZustimmung ?? {};
  const mzVor = vor.milieuZustimmung ?? {};
  for (const id of Object.keys(mzNach)) {
    const delta = round1((mzNach[id] ?? 0) - (mzVor[id] ?? 0));
    if (Math.abs(delta) >= 2) {
      milieu_deltas[id] = delta;
    }
  }

  const medienAkteurContent = content.medienAkteureContent;
  const medien_highlights: MonatsDiff['medien_highlights'] = [];
  if (
    nach.medienAkteure &&
    vor.medienAkteure &&
    Object.keys(nach.medienAkteure).length > 0 &&
    medienAkteurContent?.length
  ) {
    const rows: {
      akteurId: string;
      akteurLabel: string;
      delta: number;
      akteur_typ: MedienAkteurTyp;
      delta_bedeutung: 'stimmung' | 'reichweite';
    }[] = [];
    for (const [id, st] of Object.entries(nach.medienAkteure)) {
      const prevSt = vor.medienAkteure[id];
      if (!prevSt) continue;
      const meta = medienAkteurContent.find((a) => a.id === id);
      const typ = meta?.typ ?? 'oeffentlich';
      const useReichweite = typ === 'alternativ';
      const delta = useReichweite
        ? round1(st.reichweite - prevSt.reichweite)
        : round1(st.stimmung - prevSt.stimmung);
      if (delta === 0) continue;
      rows.push({
        akteurId: id,
        akteurLabel: meta?.name ?? id,
        delta,
        akteur_typ: typ,
        delta_bedeutung: useReichweite ? 'reichweite' : 'stimmung',
      });
    }
    rows.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
    const top = rows.slice(0, 3);
    for (let i = 0; i < top.length; i++) {
      const row = top[i];
      medien_highlights.push({
        akteurId: row.akteurId,
        akteurLabel: row.akteurLabel,
        delta: row.delta,
        akteur_typ: row.akteur_typ,
        delta_bedeutung: row.delta_bedeutung,
        spieler_perspektive: berechneMedienSpielerPerspektive(row.akteur_typ, row.delta),
        grund: buildMedienGrund(beschlosseneGesetze, gescheiterteGesetze, content, i),
      });
    }
  }

  const evRand = collectNeueFired(vor.firedEvents, nach.firedEvents);
  const evChar = collectNeueFired(vor.firedCharEvents, nach.firedCharEvents);
  const evBr = collectNeueFired(vor.firedBundesratEvents, nach.firedBundesratEvents);
  const evKom = collectNeueFired(vor.firedKommunalEvents, nach.firedKommunalEvents);
  const evDyn = collectNeueFired(vor.ausgeloesteEvents, nach.ausgeloesteEvents);
  const events_ausgeloest = [...new Set([...evRand, ...evChar, ...evBr, ...evKom, ...evDyn])];

  return {
    monat,
    beschlosseneGesetze,
    gescheiterteGesetze,
    eingebrachteGesetze,
    wahlprognose_delta: Math.round(wahlNach - wahlVor),
    medienklima_delta: Math.round(medienNach - medienVor),
    saldo_delta: round1(saldoNach - saldoVor),
    koalition_delta: Math.round(nach.coalition - vor.coalition),
    pk_delta: nach.pk - vor.pk,
    wahlprognose_vor: Math.round(wahlVor),
    wahlprognose_nach: Math.round(wahlNach),
    medienklima_vor: Math.round(medienVor),
    medienklima_nach: Math.round(medienNach),
    saldo_vor: round1(saldoVor),
    saldo_nach: round1(saldoNach),
    koalition_vor: Math.round(vor.coalition),
    koalition_nach: Math.round(nach.coalition),
    milieu_deltas,
    medien_highlights,
    events_ausgeloest,
  };
}
