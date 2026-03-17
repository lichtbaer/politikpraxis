/**
 * Fallback Medien-Events (Skandale, positiv) — SMA-277
 * Entspricht Backend-Migration 017_seed_medien_events
 */
import type { MedienEventContent } from '../../core/types';

export const DEFAULT_MEDIEN_EVENTS: MedienEventContent[] = [
  {
    id: 'medien_skandal_spesen',
    event_subtype: 'skandal',
    trigger_type: 'random',
    medienklima_delta: -8,
    min_complexity: 2,
    trigger_monat_min: 1,
    title: 'Spesenaffäre im Ministerium',
    quote: '„Abgeordnete haben private Reisen als Dienstreisen abgerechnet."',
    context:
      'Ein Medienbericht deckt auf: Mehrere Abgeordnete haben private Urlaubsreisen als Dienstreisen abgerechnet. Die Opposition fordert Konsequenzen.',
    ticker: 'Spesenaffäre: Regierung unter Druck',
    choices: [
      { key: 'aufklaeren', cost_pk: 4, medienklima_delta: 3, label: 'Aufklären', desc: 'Vollständige Aufklärung versprechen.', log_msg: 'Spesenaffäre: Regierung verspricht lückenlose Aufklärung.' },
      { key: 'schweigen', cost_pk: 0, medienklima_delta: -2, label: 'Schweigen', desc: 'Keine Stellungnahme.', log_msg: 'Regierung äußert sich nicht zur Spesenaffäre.' },
      { key: 'ruecktritt', cost_pk: 0, medienklima_delta: 5, label: 'Rücktritt fordern', desc: 'Betroffenen Rücktritt abverlangen.', log_msg: 'Regierung fordert Rücktritt des betroffenen Abgeordneten.' },
    ],
  },
  {
    id: 'medien_skandal_datenpanne',
    event_subtype: 'skandal',
    trigger_type: 'random',
    medienklima_delta: -10,
    min_complexity: 2,
    trigger_monat_min: 1,
    title: 'Datenleck bei Behörde',
    quote: '„Persönliche Daten von 50.000 Bürgern ungeschützt im Netz."',
    context:
      'Ein Hackerangriff hat sensible Daten einer Bundesbehörde kompromittiert. Die Opposition und Datenschützer kritisieren mangelnde IT-Sicherheit.',
    ticker: 'Datenpanne: Behörde unter Kritik',
    choices: [
      { key: 'entschuldigen', cost_pk: 6, medienklima_delta: 2, label: 'Öffentlich entschuldigen', desc: 'Persönliche Entschuldigung.', log_msg: 'Regierung entschuldigt sich öffentlich für Datenpanne.' },
      { key: 'untersuchung', cost_pk: 3, medienklima_delta: 1, label: 'Untersuchungsausschuss', desc: 'Parlamentarische Untersuchung einleiten.', log_msg: 'Untersuchungsausschuss zur Datenpanne eingesetzt.' },
      { key: 'bagatellisieren', cost_pk: 0, medienklima_delta: -4, label: 'Bagatellisieren', desc: 'Vorfall als Einzelfall darstellen.', log_msg: 'Regierung stuft Datenpanne als Einzelfall ein.' },
    ],
  },
  {
    id: 'medien_skandal_koalitionsleck',
    event_subtype: 'skandal',
    trigger_type: 'conditional',
    medienklima_delta: -12,
    min_complexity: 3,
    trigger_monat_min: 6,
    title: 'Koalitionsinterna an Presse geleakt',
    quote: '„Vertrauliches Strategiepapier liegt der Redaktion vor."',
    context:
      'Vertrauliche Koalitionsunterlagen sind an die Presse gelangt. Das Vertrauen zwischen den Koalitionspartnern ist beschädigt.',
    ticker: 'Koalitionsleck: Vertrauliche Papiere öffentlich',
    choices: [
      { key: 'ermitteln', cost_pk: 6, medienklima_delta: 2, label: 'Intern ermitteln', desc: 'Quelle finden.', log_msg: 'Koalition leitet interne Ermittlungen zum Leak ein.' },
      { key: 'geschlossenheit', cost_pk: 4, medienklima_delta: 3, label: 'Geschlossenheit zeigen', desc: 'Gemeinsame Pressekonferenz.', log_msg: 'Koalition zeigt Geschlossenheit nach Leak.' },
      { key: 'ignorieren', cost_pk: 0, medienklima_delta: -3, label: 'Thema ignorieren', desc: 'Keine Reaktion.', log_msg: 'Koalition äußert sich nicht zum Leak.' },
    ],
  },
  {
    id: 'medien_skandal_lobbying',
    event_subtype: 'skandal',
    trigger_type: 'random',
    medienklima_delta: -6,
    min_complexity: 2,
    trigger_monat_min: 1,
    title: 'Lobby-Einfluss auf Gesetzentwurf',
    quote: '„Internes Papier zeigt: Verbandsvertreter haben Formulierungen diktiert."',
    context:
      'Ein investigativer Bericht zeigt, wie Lobbyisten Formulierungen in einen Gesetzentwurf eingebracht haben. Die Regierung gerät unter Druck.',
    ticker: 'Lobby-Einfluss: Regierung unter Druck',
    choices: [
      { key: 'transparenz', cost_pk: 5, medienklima_delta: 4, label: 'Mehr Transparenz', desc: 'Lobbyregister verschärfen.', log_msg: 'Regierung kündigt verschärftes Lobbyregister an.' },
      { key: 'abwehren', cost_pk: 2, medienklima_delta: -1, label: 'Abwehren', desc: 'Einfluss bestreiten.', log_msg: 'Regierung bestreitet unzulässigen Lobby-Einfluss.' },
      { key: 'personell', cost_pk: 8, medienklima_delta: 6, label: 'Personelle Konsequenzen', desc: 'Verantwortliche ablösen.', log_msg: 'Regierung kündigt personelle Konsequenzen an.' },
    ],
  },
  {
    id: 'medien_skandal_haushaltsloch',
    event_subtype: 'skandal',
    trigger_type: 'conditional',
    medienklima_delta: -12,
    min_complexity: 3,
    trigger_monat_min: 12,
    title: 'Haushaltslücke von 20 Milliarden',
    quote: '„Finanzministerium hat Mehrausgaben monatelang verschwiegen."',
    context:
      'Eine Haushaltslücke von 20 Milliarden Euro wurde erst spät bekannt. Die Opposition wirft der Regierung Vertuschung vor.',
    ticker: 'Haushaltslücke: Regierung unter Kritik',
    choices: [
      { key: 'transparenz', cost_pk: 8, medienklima_delta: 4, label: 'Volle Transparenz', desc: 'Alle Zahlen offenlegen.', log_msg: 'Finanzministerium legt Haushaltslage offen.' },
      { key: 'sparpaket', cost_pk: 4, medienklima_delta: 1, label: 'Sparpaket ankündigen', desc: 'Einsparungen versprechen.', log_msg: 'Regierung kündigt Sparpaket an.' },
      { key: 'vertuschen', cost_pk: 0, medienklima_delta: -6, label: 'Weiter vertuschen', desc: 'Keine Änderung.', log_msg: 'Regierung weigert sich, Haushaltslage zu kommentieren.' },
    ],
  },
  {
    id: 'medien_skandal_persoenlich',
    event_subtype: 'skandal',
    trigger_type: 'random',
    medienklima_delta: -7,
    min_complexity: 2,
    trigger_monat_min: 1,
    title: 'Minister in Privataffäre verwickelt',
    quote: '„Bilder von Minister bei privater Feier sorgen für Aufsehen."',
    context:
      'Fotos eines Ministers bei einer privaten Feier sorgen für Schlagzeilen. Die Opposition nutzt die Gelegenheit für Angriffe.',
    ticker: 'Privataffäre: Minister unter Druck',
    choices: [
      { key: 'erklaeren', cost_pk: 3, medienklima_delta: 1, label: 'Erklären', desc: 'Minister stellt sich den Fragen.', log_msg: 'Minister erklärt sich zu Privataffäre.' },
      { key: 'entschuldigen', cost_pk: 5, medienklima_delta: 3, label: 'Entschuldigen', desc: 'Öffentliche Entschuldigung.', log_msg: 'Minister entschuldigt sich öffentlich.' },
      { key: 'rechtsweg', cost_pk: 2, medienklima_delta: -1, label: 'Rechtsweg androhen', desc: 'Anwalt einschalten.', log_msg: 'Minister droht mit rechtlichen Schritten.' },
    ],
  },
  {
    id: 'medien_positiv_intl_lob',
    event_subtype: 'positiv',
    trigger_type: 'random',
    medienklima_delta: 6,
    min_complexity: 2,
    trigger_monat_min: 1,
    title: 'Internationale Anerkennung',
    quote: '„OECD lobt deutsche Reformpolitik als Vorbild."',
    context:
      'Eine OECD-Studie hebt die deutsche Reformpolitik als vorbildlich hervor. Die Regierung erhält unerwartetes Lob aus dem Ausland.',
    ticker: 'OECD lobt deutsche Reformpolitik',
    choices: [
      { key: 'dankbar', cost_pk: 0, medienklima_delta: 2, label: 'Dankbar aufnehmen', desc: 'Lob annehmen.', log_msg: 'Regierung nimmt internationales Lob dankbar auf.' },
      { key: 'nutzen', cost_pk: 2, medienklima_delta: 3, label: 'Medienwirksam nutzen', desc: 'Pressekonferenz mit OECD.', log_msg: 'Regierung präsentiert OECD-Studie medienwirksam.' },
      { key: 'bescheiden', cost_pk: 0, medienklima_delta: 1, label: 'Bescheiden bleiben', desc: 'Keine große Sache machen.', log_msg: 'Regierung bleibt bescheiden bei internationalem Lob.' },
    ],
  },
  {
    id: 'medien_positiv_opp_fehler',
    event_subtype: 'positiv',
    trigger_type: 'conditional',
    medienklima_delta: 5,
    min_complexity: 2,
    trigger_monat_min: 6,
    title: 'Opposition macht Fehler',
    quote: '„Oppositionsfraktion rudert nach Falschaussage zurück."',
    context:
      'Ein Oppositionspolitiker hat sich in einer Debatte schwer verrechnet. Die Medien thematisieren den Rückzieher.',
    ticker: 'Opposition: Falschaussage zurückgenommen',
    choices: [
      { key: 'thematisieren', cost_pk: 2, medienklima_delta: 2, label: 'Thematisieren', desc: 'Oppositionsfehler in Presse thematisieren.', log_msg: 'Regierung nutzt Oppositionsfehler für Medienauftritt.' },
      { key: 'ignorieren', cost_pk: 0, medienklima_delta: 0, label: 'Ignorieren', desc: 'Keine Reaktion.', log_msg: 'Regierung kommentiert Oppositionsfehler nicht.' },
      { key: 'nachfragen', cost_pk: 1, medienklima_delta: 1, label: 'Nachfragen', desc: 'Opposition zu Konsequenzen befragen.', log_msg: 'Regierung fordert Opposition zu Stellungnahme auf.' },
    ],
  },
  {
    id: 'medien_positiv_buerger_lob',
    event_subtype: 'positiv',
    trigger_type: 'random',
    medienklima_delta: 4,
    min_complexity: 1,
    trigger_monat_min: 1,
    title: 'Bürger loben Regierungsarbeit',
    quote: '„Umfrage: Mehrheit zufrieden mit aktueller Politik."',
    context:
      'Eine neue Umfrage zeigt: Die Mehrheit der Bürger bewertet die Regierungsarbeit positiv. Die Stimmung in der Bevölkerung hebt sich.',
    ticker: 'Umfrage: Bürger zufrieden mit Regierung',
    choices: [
      { key: 'freuen', cost_pk: 0, medienklima_delta: 1, label: 'Freuen', desc: 'Zufriedenheit zur Kenntnis nehmen.', log_msg: 'Regierung freut sich über positive Umfrage.' },
      { key: 'kommunizieren', cost_pk: 1, medienklima_delta: 2, label: 'Kommunizieren', desc: 'Ergebnis in Presse verbreiten.', log_msg: 'Regierung kommuniziert Umfrageergebnis aktiv.' },
      { key: 'vorsichtig', cost_pk: 0, medienklima_delta: 0, label: 'Vorsichtig bleiben', desc: 'Nicht überinterpretieren.', log_msg: 'Regierung bleibt bei Umfrage vorsichtig.' },
    ],
  },
];
