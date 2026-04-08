/** SMA-501: Agenda- und Koalitionsziele aus Content (DB/API). */

export interface AgendaZielContent {
  id: string;
  kategorie: string;
  schwierigkeit: number;
  partei_filter: string[] | null;
  min_complexity: number;
  bedingung_typ: string;
  bedingung_param: Record<string, unknown>;
  titel: string;
  beschreibung: string;
}

export interface KoalitionsZielContent {
  id: string;
  partner_profil: string;
  kategorie: string;
  min_complexity: number;
  bedingung_typ: string;
  bedingung_param: Record<string, unknown>;
  beziehung_malus: number;
  titel: string;
  beschreibung: string;
}
