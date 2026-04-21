from typing import Any

from pydantic import BaseModel, ConfigDict


class IdeologieSchema(BaseModel):
    """Ideologie-Werte (wirtschaft, gesellschaft, staat) für Chars, Gesetze, Milieus, Verbände."""

    wirtschaft: int = 0
    gesellschaft: int = 0
    staat: int = 0


class EffekteSchema(BaseModel):
    """Effekte für Gesetze, Event-Choices und Bundesrat-Tradeoffs."""

    al: float = 0
    hh: float = 0
    gi: float = 0
    zf: float = 0


class CharResponse(BaseModel):
    id: str
    initials: str
    color: str
    mood_start: int
    loyalty_start: int
    ultimatum_mood_thresh: int | None
    ultimatum_event_id: str | None
    bonus_trigger: str | None
    bonus_applies: str | None
    min_complexity: int | None
    ideologie: IdeologieSchema
    name: str
    role: str
    bio: str
    eingangszitat: str | None = None
    bonus_desc: str | None
    interests: list[str]
    keyword: str | None
    partei_id: str | None = None
    partei_kuerzel: str | None = None
    partei_farbe: str | None = None
    # SMA-327: Dynamisches Kabinett
    pool_partei: str | None = None
    ressort: str | None = None
    ressort_partner: str | None = None
    agenda: dict | None = None
    ist_kanzler: bool = False
    # SMA-329: Partner-Minister
    ist_partner_minister: bool = False
    agenda_stufe_aktuell: int | None = None
    agenda_ablehnungen: int = 0

    model_config = ConfigDict(from_attributes=True)


class GesetzResponse(BaseModel):
    id: str
    tags: list[str]
    bt_stimmen_ja: int
    effekte: EffekteSchema
    effekt_lag: int
    foederalismus_freundlich: bool
    ideologie: IdeologieSchema
    ideologie_wert: int = 0
    politikfeld_id: str | None
    politikfeld_sekundaer: list[str]
    kosten_einmalig: float = 0
    kosten_laufend: float = 0
    einnahmeeffekt: float = 0
    pflichtausgaben_delta: float = 0
    investiv: bool = False
    kommunal_pilot_moeglich: bool = True
    laender_pilot_moeglich: bool = True
    eu_initiative_moeglich: bool = True
    framing_optionen: list[dict[str, Any]] = []
    lobby_mood_effekte: dict[str, int] = {}
    lobby_pk_kosten: int = 12
    lobby_gain_range: dict[str, int] = {}
    route_overrides: dict[str, Any] = {}
    sektor_effekte: list[dict[str, Any]] = []
    titel: str
    kurz: str
    desc: str
    locked_until_event: str | None = None
    zustimmungspflichtig: bool | None = None
    langzeit_score: int = 0
    langzeitwirkung_positiv: list[str] = []
    langzeitwirkung_negativ: list[str] = []

    model_config = ConfigDict(from_attributes=True)


class EventChoiceResponse(BaseModel):
    key: str
    type: str
    cost_pk: int
    effekte: EffekteSchema
    char_mood: dict[str, int]
    label: str
    desc: str
    log_msg: str
    koalitionspartner_beziehung_delta: int | None = None
    medienklima_delta: int | None = None
    milieu_delta: dict[str, int] | None = None
    schuldenbremse_spielraum_delta: int | None = None
    steuerpolitik_modifikator_delta: float | None = None
    konjunktur_index_delta: float | None = None
    br_relation_json: dict[str, int] | None = None
    verband_delta: dict[str, int] | None = None
    sektor_delta: dict[str, int] | None = None
    haushalt_saldo_delta_mrd: float | None = None

    model_config = ConfigDict(from_attributes=True)


class EventResponse(BaseModel):
    id: str
    event_type: str
    trigger_type: str | None
    trigger_typ: str | None = None
    trigger_params: dict[str, Any] | None = None
    einmalig: bool | None = True
    min_complexity: int | None
    type_label: str
    title: str
    quote: str
    context: str
    ticker: str
    choices: list[EventChoiceResponse]

    model_config = ConfigDict(from_attributes=True)


class BundesratTradeoffResponse(BaseModel):
    key: str
    effekte: EffekteSchema
    char_mood: dict[str, int]
    label: str
    desc: str

    model_config = ConfigDict(from_attributes=True)


class BundeslandResponse(BaseModel):
    id: str
    name: str
    partei: str | None = None
    koalition: list[str]
    bundesrat_fraktion: str
    wirtschaft_typ: str
    themen: list[str]
    beziehung_start: int
    stimmgewicht: int
    min_complexity: int

    model_config = ConfigDict(from_attributes=True)


class BundesratResponse(BaseModel):
    id: str
    laender: list[str]
    basis_bereitschaft: int
    beziehung_start: int
    sonderregel: str | None = None
    sprecher_initials: str
    sprecher_color: str
    name: str
    sprecher_name: str
    sprecher_partei: str
    sprecher_land: str
    sprecher_bio: str
    tradeoffs: list[BundesratTradeoffResponse]

    model_config = ConfigDict(from_attributes=True)


class VerbandTradeoffResponse(BaseModel):
    key: str
    effekte: EffekteSchema
    feld_druck_delta: int = 0
    label: str
    desc: str

    model_config = ConfigDict(from_attributes=True)


class MilieuResponse(BaseModel):
    id: str
    gewicht: int
    basisbeteiligung: int
    ideologie: IdeologieSchema
    min_complexity: int
    aggregat_gruppe: str | None
    name: str
    kurzcharakter: str
    beschreibung: str

    model_config = ConfigDict(from_attributes=True)


class PolitikfeldResponse(BaseModel):
    id: str
    verband_id: str | None = None
    druck_event_id: str | None = None
    eu_relevanz: int
    kommunal_relevanz: int
    min_complexity: int
    name: str
    kurz: str

    model_config = ConfigDict(from_attributes=True)


class VerbandResponse(BaseModel):
    id: str
    politikfeld_id: str
    ideologie: IdeologieSchema
    beziehung_start: int
    staerke: dict[str, int]
    konflikt_mit: list[str]
    min_complexity: int
    name: str
    kurz: str
    bio: str
    tradeoffs: list[VerbandTradeoffResponse]

    model_config = ConfigDict(from_attributes=True)


class EuEventChoiceResponse(BaseModel):
    key: str
    cost_pk: int
    effekte: EffekteSchema
    eu_klima_delta: int = 0
    kofinanzierung: float = 0
    label: str
    desc: str
    log_msg: str

    model_config = ConfigDict(from_attributes=True)


class EuEventResponse(BaseModel):
    id: str
    event_type: str
    politikfeld_id: str | None
    trigger_klima_min: int | None
    trigger_monat: int | None
    min_complexity: int | None
    title: str
    quote: str
    context: str
    ticker: str
    choices: list[EuEventChoiceResponse]

    model_config = ConfigDict(from_attributes=True)


class MedienAkteurResponse(BaseModel):
    """SMA-392: Medienakteur-Definitionen (Seed aus DB), lokalisierter Name."""

    id: str
    name: str
    typ: str
    reichweite: float
    stimmung_start: int = 0
    min_complexity: int = 2

    model_config = ConfigDict(from_attributes=True)


class ContentBundleResponse(BaseModel):
    characters: list[dict[str, Any]]
    events: list[dict[str, Any]]
    charEvents: dict[str, dict[str, Any]]
    laws: list[dict[str, Any]]
    agendaZiele: list[dict[str, Any]] = []
    koalitionsZiele: list[dict[str, Any]] = []
    bundesrat: list[dict[str, Any]]
    scenario: dict[str, Any]
    scenarios: list[dict[str, Any]] = []
