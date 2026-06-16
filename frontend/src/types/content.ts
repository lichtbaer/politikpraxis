/** API-Response-Typen für Content-Endpoints (/api/content/*).
 *
 * Single Source of Truth sind die Backend-Pydantic-Schemas
 * (backend/app/schemas/content.py). Sie werden als OpenAPI-Schema exportiert und nach
 * ./api-generated.ts generiert. Die hier definierten Aliase halten die etablierten
 * `*Api`-Namen stabil, damit Importstellen unverändert bleiben.
 *
 * NICHT die Feldlisten hier von Hand pflegen — ändere stattdessen das Backend-Schema und
 * regeneriere:  `npm run gen:api-types`  (CI-Drift-Check:  `npm run check:api-types`).
 */
import type { components } from './api-generated';

type Schemas = components['schemas'];

export type Effekte = Schemas['EffekteSchema'];
export type IdeologieApi = Schemas['IdeologieSchema'];
export type CharApi = Schemas['CharResponse'];
export type GesetzApi = Schemas['GesetzResponse'];
export type EventChoiceApi = Schemas['EventChoiceResponse'];
export type EventApi = Schemas['EventResponse'];
export type MilieuApi = Schemas['MilieuResponse'];
export type PolitikfeldApi = Schemas['PolitikfeldResponse'];
export type VerbandTradeoffApi = Schemas['VerbandTradeoffResponse'];
export type VerbandApi = Schemas['VerbandResponse'];
export type BundesratTradeoffApi = Schemas['BundesratTradeoffResponse'];
export type BundesratFraktionApi = Schemas['BundesratResponse'];
export type BundeslandApi = Schemas['BundeslandResponse'];
export type MedienAkteurApi = Schemas['MedienAkteurResponse'];
export type EuEventChoiceApi = Schemas['EuEventChoiceResponse'];
export type EuEventApi = Schemas['EuEventResponse'];

/** SMA-501: Spieler-Agenda-Ziel (API).
 *  Manuell gepflegt — die Route /content/agenda-ziele hat (noch) kein response_model,
 *  daher kein Component-Schema im OpenAPI-Export. */
export interface AgendaZielApi {
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

/** SMA-501: Koalitionspartner-Ziel (API).
 *  Manuell gepflegt — Route /content/koalitions-ziele ohne response_model (s. o.). */
export interface KoalitionsZielApi {
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
