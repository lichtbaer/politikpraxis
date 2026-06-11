/**
 * English fallback for media events (SMA-277) — mirrors medienEvents.ts
 */
import type { MedienEventContent } from '../../core/types';

export const DEFAULT_MEDIEN_EVENTS_EN: MedienEventContent[] = [
  {
    id: 'medien_skandal_spesen',
    event_subtype: 'skandal',
    trigger_type: 'random',
    medienklima_delta: -8,
    min_complexity: 2,
    trigger_monat_min: 1,
    title: 'Expense scandal in ministry',
    quote: '"MPs claimed private trips as official travel."',
    context:
      'A media report reveals that several MPs claimed private holiday trips as official travel. The opposition demands consequences.',
    ticker: 'Expense scandal: government under pressure',
    choices: [
      { key: 'aufklaeren', cost_pk: 4, medienklima_delta: 3, label: 'Investigate', desc: 'Promise full disclosure.', log_msg: 'Government promises full investigation of expense scandal.' },
      { key: 'schweigen', cost_pk: 0, medienklima_delta: -2, label: 'Stay silent', desc: 'No statement.', log_msg: 'Government does not comment on expense scandal.' },
      { key: 'ruecktritt', cost_pk: 0, medienklima_delta: 5, label: 'Demand resignation', desc: 'Require resignation of those involved.', log_msg: 'Government demands resignation of affected MP.' },
    ],
  },
  {
    id: 'medien_skandal_datenpanne',
    event_subtype: 'skandal',
    trigger_type: 'random',
    medienklima_delta: -10,
    min_complexity: 2,
    trigger_monat_min: 1,
    title: 'Data leak at federal agency',
    quote: '"Personal data of 50,000 citizens exposed online."',
    context:
      'A cyber attack has compromised sensitive data at a federal agency. Opposition and privacy advocates criticise IT security.',
    ticker: 'Data breach: agency under fire',
    choices: [
      { key: 'entschuldigen', cost_pk: 6, medienklima_delta: 2, label: 'Apologise publicly', desc: 'Personal apology.', log_msg: 'Government apologises publicly for data breach.' },
      { key: 'untersuchung', cost_pk: 3, medienklima_delta: 1, label: 'Inquiry committee', desc: 'Launch parliamentary inquiry.', log_msg: 'Inquiry committee on data breach appointed.' },
      { key: 'bagatellisieren', cost_pk: 0, medienklima_delta: -4, label: 'Downplay', desc: 'Portray as isolated case.', log_msg: 'Government downplays data breach as isolated incident.' },
    ],
  },
  {
    id: 'medien_skandal_koalitionsleck',
    event_subtype: 'skandal',
    trigger_type: 'conditional',
    medienklima_delta: -12,
    min_complexity: 3,
    trigger_monat_min: 6,
    title: 'Coalition internals leaked to press',
    quote: '"Confidential strategy paper in editors\' hands."',
    context:
      'Confidential coalition documents have reached the press. Trust between coalition partners is damaged.',
    ticker: 'Coalition leak: confidential papers public',
    choices: [
      { key: 'ermitteln', cost_pk: 6, medienklima_delta: 2, label: 'Investigate internally', desc: 'Find the source.', log_msg: 'Coalition launches internal leak investigation.' },
      { key: 'geschlossenheit', cost_pk: 4, medienklima_delta: 3, label: 'Show unity', desc: 'Joint press conference.', log_msg: 'Coalition shows unity after leak.' },
      { key: 'ignorieren', cost_pk: 0, medienklima_delta: -3, label: 'Ignore issue', desc: 'No reaction.', log_msg: 'Coalition does not comment on leak.' },
    ],
  },
  {
    id: 'medien_skandal_lobbying',
    event_subtype: 'skandal',
    trigger_type: 'random',
    medienklima_delta: -6,
    min_complexity: 2,
    trigger_monat_min: 1,
    title: 'Lobby influence on draft law',
    quote: '"Internal paper shows: industry reps dictated wording."',
    context:
      'An investigative report shows how lobbyists inserted wording into a draft law. The government comes under pressure.',
    ticker: 'Lobby influence: government under pressure',
    choices: [
      { key: 'transparenz', cost_pk: 5, medienklima_delta: 4, label: 'More transparency', desc: 'Tighten lobby register.', log_msg: 'Government announces stricter lobby register.' },
      { key: 'abwehren', cost_pk: 2, medienklima_delta: -1, label: 'Deny', desc: 'Reject undue influence.', log_msg: 'Government denies improper lobby influence.' },
      { key: 'personell', cost_pk: 8, medienklima_delta: 6, label: 'Personnel consequences', desc: 'Replace those responsible.', log_msg: 'Government announces personnel consequences.' },
    ],
  },
  {
    id: 'medien_skandal_haushaltsloch',
    event_subtype: 'skandal',
    trigger_type: 'conditional',
    medienklima_delta: -12,
    min_complexity: 3,
    trigger_monat_min: 12,
    title: 'Budget gap of 20 billion',
    quote: '"Finance ministry concealed extra spending for months."',
    context:
      'A budget gap of 20 billion euros was revealed late. The opposition accuses the government of a cover-up.',
    ticker: 'Budget gap: government criticised',
    choices: [
      { key: 'transparenz', cost_pk: 8, medienklima_delta: 4, label: 'Full transparency', desc: 'Disclose all figures.', log_msg: 'Finance ministry discloses budget situation.' },
      { key: 'sparpaket', cost_pk: 4, medienklima_delta: 1, label: 'Announce austerity', desc: 'Promise savings.', log_msg: 'Government announces austerity package.' },
      { key: 'vertuschen', cost_pk: 0, medienklima_delta: -6, label: 'Keep covering up', desc: 'No change.', log_msg: 'Government refuses to comment on budget.' },
    ],
  },
  {
    id: 'medien_skandal_persoenlich',
    event_subtype: 'skandal',
    trigger_type: 'random',
    medienklima_delta: -7,
    min_complexity: 2,
    trigger_monat_min: 1,
    title: 'Minister embroiled in private affair',
    quote: '"Photos of minister at private party cause stir."',
    context:
      'Photos of a minister at a private party make headlines. The opposition seizes the opportunity to attack.',
    ticker: 'Private affair: minister under pressure',
    choices: [
      { key: 'erklaeren', cost_pk: 3, medienklima_delta: 1, label: 'Explain', desc: 'Minister faces questions.', log_msg: 'Minister explains private affair.' },
      { key: 'entschuldigen', cost_pk: 5, medienklima_delta: 3, label: 'Apologise', desc: 'Public apology.', log_msg: 'Minister apologises publicly.' },
      { key: 'rechtsweg', cost_pk: 2, medienklima_delta: -1, label: 'Threaten legal action', desc: 'Involve lawyers.', log_msg: 'Minister threatens legal steps.' },
    ],
  },
  {
    id: 'medien_positiv_intl_lob',
    event_subtype: 'positiv',
    trigger_type: 'random',
    medienklima_delta: 6,
    min_complexity: 2,
    trigger_monat_min: 1,
    title: 'International recognition',
    quote: '"OECD praises German reform policy as model."',
    context:
      'An OECD study highlights German reform policy as exemplary. The government receives unexpected praise abroad.',
    ticker: 'OECD praises German reform policy',
    choices: [
      { key: 'dankbar', cost_pk: 0, medienklima_delta: 2, label: 'Accept gratefully', desc: 'Accept praise.', log_msg: 'Government gratefully accepts international praise.' },
      { key: 'nutzen', cost_pk: 2, medienklima_delta: 3, label: 'Use for media', desc: 'Press conference with OECD.', log_msg: 'Government presents OECD study prominently.' },
      { key: 'bescheiden', cost_pk: 0, medienklima_delta: 1, label: 'Stay modest', desc: 'Do not make a big deal.', log_msg: 'Government stays modest about international praise.' },
    ],
  },
  {
    id: 'medien_positiv_opp_fehler',
    event_subtype: 'positiv',
    trigger_type: 'conditional',
    medienklima_delta: 5,
    min_complexity: 2,
    trigger_monat_min: 6,
    title: 'Opposition makes mistake',
    quote: '"Opposition faction walks back false claim."',
    context:
      'An opposition politician badly miscalculated in a debate. Media cover the retreat.',
    ticker: 'Opposition: false claim withdrawn',
    choices: [
      { key: 'thematisieren', cost_pk: 2, medienklima_delta: 2, label: 'Highlight', desc: 'Feature opposition error in press.', log_msg: 'Government uses opposition error for media appearance.' },
      { key: 'ignorieren', cost_pk: 0, medienklima_delta: 0, label: 'Ignore', desc: 'No reaction.', log_msg: 'Government does not comment on opposition error.' },
      { key: 'nachfragen', cost_pk: 1, medienklima_delta: 1, label: 'Press for answers', desc: 'Ask opposition for consequences.', log_msg: 'Government demands opposition statement.' },
    ],
  },
  {
    id: 'medien_positiv_buerger_lob',
    event_subtype: 'positiv',
    trigger_type: 'random',
    medienklima_delta: 4,
    min_complexity: 1,
    trigger_monat_min: 1,
    title: 'Citizens praise government work',
    quote: '"Poll: majority satisfied with current policy."',
    context:
      'A new poll shows a majority of citizens rate government work positively. Public mood improves.',
    ticker: 'Poll: citizens satisfied with government',
    choices: [
      { key: 'freuen', cost_pk: 0, medienklima_delta: 1, label: 'Welcome', desc: 'Take satisfaction on board.', log_msg: 'Government pleased with positive poll.' },
      { key: 'kommunizieren', cost_pk: 1, medienklima_delta: 2, label: 'Communicate', desc: 'Spread result in press.', log_msg: 'Government actively communicates poll result.' },
      { key: 'vorsichtig', cost_pk: 0, medienklima_delta: 0, label: 'Stay cautious', desc: 'Do not overinterpret.', log_msg: 'Government remains cautious about poll.' },
    ],
  },
];
