"""EN-Übersetzungen für bisher nur DE geseedeten Content (Events 013/044/048, Meta, EU).

Revision ID: 059_content_i18n_en
Revises: 058_sma501_agenda_koalition_seed
"""

from __future__ import annotations

from typing import Any

import sqlalchemy as sa
from alembic import op

revision: str = "059_content_i18n_en"
down_revision: str | None = "058_sma501_agenda_koalition_seed"
branch_labels: tuple[str, ...] | None = None
depends_on: tuple[str, ...] | None = None


def _upsert_event_i18n(
    conn: Any,
    eid: str,
    tl: str,
    title: str,
    quote: str,
    context: str,
    ticker: str,
) -> None:
    conn.execute(
        sa.text("""
            INSERT INTO events_i18n (event_id, locale, type_label, title, quote, context, ticker)
            VALUES (:eid, 'en', :tl, :title, :quote, :context, :ticker)
            ON CONFLICT (event_id, locale) DO UPDATE SET
                type_label = EXCLUDED.type_label,
                title = EXCLUDED.title,
                quote = EXCLUDED.quote,
                context = EXCLUDED.context,
                ticker = EXCLUDED.ticker
        """),
        {
            "eid": eid,
            "tl": tl,
            "title": title,
            "quote": quote,
            "context": context,
            "ticker": ticker,
        },
    )


def _upsert_choice_i18n_en(
    conn: Any,
    event_id: str,
    choice_key: str,
    label: str,
    desc: str,
    log: str,
) -> None:
    conn.execute(
        sa.text("""
            INSERT INTO event_choices_i18n (choice_id, locale, label, "desc", log_msg)
            SELECT ec.id, 'en', :label, :desc, :log
            FROM event_choices ec
            WHERE ec.event_id = :eid AND ec.choice_key = :key
            ON CONFLICT (choice_id, locale) DO UPDATE SET
                label = EXCLUDED.label,
                "desc" = EXCLUDED."desc",
                log_msg = EXCLUDED.log_msg
        """),
        {"eid": event_id, "key": choice_key, "label": label, "desc": desc, "log": log},
    )


def _seed_events_013_044_048(conn: Any) -> None:
    events_en = [
        # 013 kommunal + vorstufen
        (
            "kommunal_klima_initiative",
            "Municipal initiative",
            "Hamburg and Munich launch own climate programme",
            '"We will not wait for the federal government any longer."',
            "Major cities have adopted climate measures independently. Pressure from civil society and post-material milieus is high.",
            "Hamburg and Munich: own climate programme — federal government under pressure",
        ),
        (
            "kommunal_sozial_initiative",
            "Municipal initiative",
            "Ruhr cities demand minimum wage increase — now",
            '"Our citizens cannot wait."',
            "Industrial cities in the Ruhr have launched municipal minimum wage initiatives. The social centre feels abandoned by federal policy.",
            "Ruhr: cities demand minimum wage increase — government under scrutiny",
        ),
        (
            "kommunal_sicherheit_initiative",
            "Municipal initiative",
            "Cities demand more police presence — independent measures",
            '"The federal government is not acting — we must."',
            "Municipalities have announced security measures on their own. Traditional voters demand more capacity to act from the federal level.",
            "Municipalities launch own security initiatives — federal government responds",
        ),
        (
            "vorstufe_kommunal_erfolg",
            "Pilot success",
            "Pilot project [city name]: success confirmed",
            '"The model works — time for the federal level."',
            "The municipal pilot was successful. Experience confirms effectiveness — time for nationwide rollout.",
            "Municipal pilot successful — signal for federal government",
        ),
        (
            "vorstufe_laender_erfolg",
            "Pilot success",
            "[Federal state] passes [law] — signal for federal government",
            '"Other states are watching closely."',
            "A federal state has successfully implemented the law as a pilot. Strong signalling effect for other states and the federal government.",
            "State pilot successful — other states watching",
        ),
        # 044 dynamic events
        (
            "dyn_wirtschaftskrise_droht",
            "Economy",
            "Rating agency downgrades creditworthiness",
            "The international rating agency has downgraded Germany's credit rating.",
            "Bond yields are rising. Financial markets and media react nervously.",
            "Rating downgrade: higher interest burden",
        ),
        (
            "dyn_rezession_eintritt",
            "Economy",
            "Germany slides into recession",
            "Economic data confirm two quarters of negative growth.",
            "Tax revenues are collapsing, unemployment is rising. The opposition demands a stimulus package.",
            "Recession: taxes and jobs under pressure",
        ),
        (
            "dyn_boom_steuermehreinnahmen",
            "Economy",
            "Tax windfall: surplus",
            "The economy is running hot — the treasury is overflowing.",
            "The finance ministry reports unexpectedly high additional revenue. Dispute over use erupts.",
            "Boom: additional tax revenue",
        ),
        (
            "dyn_koalitionskrise_gipfel",
            "Coalition",
            "Coalition summit: coalition on the brink",
            "The differences have become too great.",
            "The coalition partner demands a crisis meeting. Without compromise, long-term instability threatens.",
            "Coalition crisis: emergency summit",
        ),
        (
            "dyn_minister_ruecktritt_angebot",
            "Coalition",
            "Resignation offer from the cabinet",
            "After repeated conflicts, a minister signals withdrawal.",
            "The coalition partner is watching closely how you respond.",
            "Cabinet: resignation offered",
        ),
        (
            "dyn_energiekrise_eu",
            "International",
            "EU energy crisis: gas prices explode",
            "Markets are in turmoil — budget and economy suffer.",
            "Brussels coordinates, but the burden falls on member states. Aid or market — you decide.",
            "Energy crisis weighs on Germany",
        ),
        (
            "dyn_fluechtlingswelle",
            "International",
            "Humanitarian crisis at the EU external border",
            "Hundreds of thousands seek protection — pressure on federal and state governments grows.",
            "Media and Bundesrat demand clear lines. Europe expects German leadership.",
            "Refugee movement: EU under pressure",
        ),
        (
            "dyn_naturkatastrophe_inland",
            "Disaster",
            "Severe storms: several states in state of emergency",
            "Emergency aid binds billions — the debt brake becomes a debate.",
            "Disaster relief and reconstruction compete with the budget year.",
            "Storms: state of emergency in regions",
        ),
        (
            "dyn_vertrauenskrise_umfrage",
            "Society",
            "Poll: government trust at rock bottom",
            "Only a fraction of respondents still trust the government.",
            "PK regeneration suffers, election forecast drops. A gesture of renewal could help.",
            "Trust crisis in public opinion",
        ),
        (
            "dyn_desinformation_kampagne",
            "Society",
            "Coordinated disinformation shakes debate",
            "Alternative channels spread narratives by design.",
            "Media climate turns. An initiative costs political capital; silence worsens the damage.",
            "Disinformation: public debate polarised",
        ),
        # 048 sector events
        (
            "dyn_gbd_forderung_aufschwung",
            "Economy",
            "Trade unions demand wage increases",
            "The upswing barely reaches employees.",
            "The GBD demands a stronger share in growth — with concrete demands.",
            "Trade unions: demands in the upswing",
        ),
        (
            "dyn_bdi_krise_forderung",
            "Economy",
            "BDI demands industry package",
            "Industry is under pressure.",
            "The BDI demands rapid political relief to prevent plant closures.",
            "Industry: cry for help to government",
        ),
    ]
    for row in events_en:
        _upsert_event_i18n(conn, *row)

    choices_013 = [
        (
            "kommunal_klima_initiative",
            "als_vorbild",
            "Recognise as model",
            "+2% Bundestag votes for matching laws, no PK cost.",
            "Municipal initiative recognised as model. Positive signal.",
        ),
        (
            "kommunal_klima_initiative",
            "koordinieren",
            "Coordinate and start pilot",
            "8 PK — full municipal pilot with matching law.",
            "Federal government coordinates municipal initiative. Pilot started.",
        ),
        (
            "kommunal_klima_initiative",
            "ignorieren",
            "Ignore",
            "No response. Pressure may rise.",
            "Municipal initiative ignored. Discontent in cities.",
        ),
        (
            "kommunal_sozial_initiative",
            "als_vorbild",
            "Recognise as model",
            "+2% Bundestag votes for matching laws, no PK cost.",
            "Municipal initiative recognised as model.",
        ),
        (
            "kommunal_sozial_initiative",
            "koordinieren",
            "Coordinate and start pilot",
            "8 PK — full municipal pilot.",
            "Federal government coordinates. Pilot started.",
        ),
        (
            "kommunal_sozial_initiative",
            "ignorieren",
            "Ignore",
            "No response.",
            "Municipal initiative ignored.",
        ),
        (
            "kommunal_sicherheit_initiative",
            "als_vorbild",
            "Recognise as model",
            "+2% Bundestag votes for matching laws, no PK cost.",
            "Municipal initiative recognised as model.",
        ),
        (
            "kommunal_sicherheit_initiative",
            "koordinieren",
            "Coordinate and start pilot",
            "8 PK — full municipal pilot.",
            "Federal government coordinates. Pilot started.",
        ),
        (
            "kommunal_sicherheit_initiative",
            "ignorieren",
            "Ignore",
            "No response.",
            "Municipal initiative ignored.",
        ),
        (
            "vorstufe_kommunal_erfolg",
            "zur_kenntnis",
            "Take note",
            "Success confirmed. Bonus applied.",
            "Pilot success noted.",
        ),
        (
            "vorstufe_laender_erfolg",
            "weitere_laender_einladen",
            "Invite more states",
            "12 PK — starts second state pilot with +10% success chance.",
            "More states invited to pilot.",
        ),
        (
            "vorstufe_laender_erfolg",
            "zur_kenntnis",
            "Take note",
            "Success confirmed.",
            "State pilot success noted.",
        ),
    ]
    for eid, key, label, desc, log in choices_013:
        _upsert_choice_i18n_en(conn, eid, key, label, desc, log)

    choices_044 = [
        (
            "dyn_wirtschaftskrise_droht",
            "sparpaket",
            "Announce austerity package",
            "Consolidation — markets like it, approval suffers.",
            "Austerity package announced. Budget relieved, approval drops.",
        ),
        (
            "dyn_wirtschaftskrise_droht",
            "investieren",
            "Counter-investment programme",
            "Expensive but economic stimulus.",
            "Investment programme adopted. Debt rises, economy stabilises.",
        ),
        (
            "dyn_wirtschaftskrise_droht",
            "ignorieren",
            "Wait and see",
            "No immediate PK spend — media grow more critical.",
            "Government waits. Media sharply critical.",
        ),
        (
            "dyn_rezession_eintritt",
            "konjunkturpaket",
            "Stimulus package",
            "Deficit financing for support — burdens budget.",
            "Stimulus package launched. Short-term costs, economic support.",
        ),
        (
            "dyn_rezession_eintritt",
            "struktur",
            "Communicate structural reforms",
            "Long-term course, little immediate effect on economy.",
            "Reform agenda communicated. Trust slightly strengthened.",
        ),
        (
            "dyn_rezession_eintritt",
            "sparen",
            "Prioritise saving",
            "Tighten budget — risky in recession.",
            "Austerity course. Markets calmed, economy and approval suffer.",
        ),
        (
            "dyn_boom_steuermehreinnahmen",
            "schulden_tilgen",
            "Repay debt",
            "Cautious course — solid finances.",
            "Surplus used for debt repayment.",
        ),
        (
            "dyn_boom_steuermehreinnahmen",
            "investieren",
            "Investment programme",
            "Future investments — less buffer.",
            "Investment offensive adopted.",
        ),
        (
            "dyn_boom_steuermehreinnahmen",
            "steuern_senken",
            "Cut taxes",
            "Popularity rises, permanently less fiscal room.",
            "Tax cut announced. Voter-friendly, fiscally risky.",
        ),
        (
            "dyn_koalitionskrise_gipfel",
            "zugestaendnis",
            "Make concession",
            "Costly agreement — coalition stabilises.",
            "Concession to partner. Coalition calmed, PK burdened.",
        ),
        (
            "dyn_koalitionskrise_gipfel",
            "auf_zeit",
            "Play for time",
            "No high PK loss short term — partner cools off.",
            "Delay tactic. Coalition partner angered.",
        ),
        (
            "dyn_koalitionskrise_gipfel",
            "umbildung",
            "Offer cabinet reshuffle",
            "Signal of fresh start — high PK price.",
            "Reshuffle offered. Coalition strengthened, cabinet shaken.",
        ),
        (
            "dyn_minister_ruecktritt_angebot",
            "annehmen",
            "Accept resignation",
            "Clean break — coalition stays intact.",
            "Resignation accepted. Cabinet reshuffled, partner satisfied.",
        ),
        (
            "dyn_minister_ruecktritt_angebot",
            "ablehnen",
            "Reject and defend",
            "Personal loyalty — partner sees affront.",
            "Resignation rejected. Coalition partner displeased.",
        ),
        (
            "dyn_minister_ruecktritt_angebot",
            "kompromiss",
            "Negotiate compromise",
            "Costly agreement without personnel change.",
            "Compromise found. Cabinet stays, coalition moderated.",
        ),
        (
            "dyn_energiekrise_eu",
            "energiehilfen",
            "Expand energy aid",
            "Expensive but social relief.",
            "Energy aid adopted. Budget burdened, population relieved.",
        ),
        (
            "dyn_energiekrise_eu",
            "markt",
            "Let market regulate",
            "Less spending — economy and media suffer.",
            "Market-oriented course. Economy under pressure, media critical.",
        ),
        (
            "dyn_energiekrise_eu",
            "eu_koordination",
            "Seek EU coordination",
            "Diplomatic path — mixed balance.",
            "EU coordination intensified. Room for manoeuvre limited.",
        ),
        (
            "dyn_fluechtlingswelle",
            "aufnahme",
            "Reception programme",
            "Humanitarian — conservative milieus criticise.",
            "Reception programme started. Budget burdened, progressives support.",
        ),
        (
            "dyn_fluechtlingswelle",
            "eu_loesung",
            "Demand EU solution",
            "Less national burden — slower effect.",
            "EU solution demanded. Partners in Brussels approving.",
        ),
        (
            "dyn_fluechtlingswelle",
            "restriktiv",
            "More restrictive line",
            "Polarisation between milieus.",
            "More restrictive measures announced. Polarisation increases.",
        ),
        (
            "dyn_naturkatastrophe_inland",
            "notlage",
            "Use state of emergency",
            "More fiscal room — legally sensitive.",
            "Emergency instruments activated. Aid flows faster.",
        ),
        (
            "dyn_naturkatastrophe_inland",
            "regulaer",
            "Regular funds",
            "Tighter framework, less controversy.",
            "Aid from regular budget. Slower but less controversial.",
        ),
        (
            "dyn_naturkatastrophe_inland",
            "bund_laender",
            "Federal-state special programme",
            "Involve states — Bundesrat stronger in play.",
            "Special programme with states. Bundesrat more involved.",
        ),
        (
            "dyn_vertrauenskrise_umfrage",
            "erneuerung",
            "Start renewal course",
            "Expensive but voters listen.",
            "Renewal initiative started. Trust slowly returns.",
        ),
        (
            "dyn_vertrauenskrise_umfrage",
            "kommunikation",
            "Communication offensive",
            "Medium effect, moderate PK spend.",
            "Communication offensive. Slight improvement in media climate.",
        ),
        (
            "dyn_vertrauenskrise_umfrage",
            "business_as_usual",
            "Continue as before",
            "No PK loss — trust stays weak.",
            "No visible reaction. Polls remain poor.",
        ),
        (
            "dyn_desinformation_kampagne",
            "medienkompetenz",
            "Media literacy initiative",
            "Sensible long term — polarising short term.",
            "Media literacy initiative launched.",
        ),
        (
            "dyn_desinformation_kampagne",
            "plattformregulierung",
            "Demand stricter oversight",
            "Rule of law — risky for liberal milieus.",
            "Stricter oversight announced. Debate hardens.",
        ),
        (
            "dyn_desinformation_kampagne",
            "ignorieren",
            "Do not respond publicly",
            "No PK loss — narratives gain ground.",
            "Government silence. Alternative channels dominate.",
        ),
    ]
    for eid, key, label, desc, log in choices_044:
        _upsert_choice_i18n_en(conn, eid, key, label, desc, log)

    choices_048 = [
        (
            "dyn_gbd_forderung_aufschwung",
            "mindestlohn",
            "Prepare minimum wage increase",
            "Strengthens GBD, burdens industry mood.",
            "Minimum wage initiative announced. Unions satisfied, industry critical.",
        ),
        (
            "dyn_gbd_forderung_aufschwung",
            "tarifautonomie",
            "Strengthen collective bargaining autonomy",
            "Less direct cost — partner may grow restless.",
            "Collective bargaining autonomy emphasised. GBD moderately satisfied.",
        ),
        (
            "dyn_gbd_forderung_aufschwung",
            "ablehnen",
            "Reject demands",
            "Austerity course — GBD and media react negatively.",
            "Union demands rejected. Protests and critical coverage.",
        ),
        (
            "dyn_bdi_krise_forderung",
            "entlastungspaket",
            "Relief package",
            "Higher spending — BDI satisfied, balance burdened.",
            "Industry relief package adopted.",
        ),
        (
            "dyn_bdi_krise_forderung",
            "strukturwandel",
            "Structural change programme",
            "Green sectors benefit, higher spending.",
            "Structural change programme with climate and industry components.",
        ),
        (
            "dyn_bdi_krise_forderung",
            "ablehnen",
            "Reject",
            "Fiscally neutral short term — industry and media angered.",
            "Industry package rejected. BDI and media sharply critical.",
        ),
    ]
    for eid, key, label, desc, log in choices_048:
        _upsert_choice_i18n_en(conn, eid, key, label, desc, log)


def _seed_meta_i18n(conn: Any) -> None:
    milieus_en = [
        (
            "etablierte",
            "Established",
            "Conservative-affluent",
            "Affluent established elites with high turnout.",
        ),
        (
            "leistungstraeger",
            "Achievers",
            "Performance-oriented",
            "Successful professionals with medium to high participation.",
        ),
        (
            "buergerliche_mitte",
            "Bourgeois centre",
            "Middle-class conservative",
            "Traditional middle class with moderate participation.",
        ),
        (
            "traditionelle",
            "Traditional",
            "Values-conservative",
            "Traditionally oriented voters with strong value attachment.",
        ),
        (
            "soziale_mitte",
            "Social centre",
            "Centre-left",
            "Socially oriented centre with progressive tendencies.",
        ),
        (
            "postmaterielle",
            "Post-material",
            "Green-progressive",
            "Environmentally and socially progressive voters.",
        ),
        (
            "prekaere",
            "Precarious",
            "Left behind",
            "Voters threatened by decline with low participation.",
        ),
    ]
    for mid, name, kurz, beschr in milieus_en:
        conn.execute(
            sa.text("""
                INSERT INTO milieus_i18n (milieu_id, locale, name, kurzcharakter, beschreibung)
                VALUES (:id, 'en', :name, :kurz, :beschr)
                ON CONFLICT (milieu_id, locale) DO UPDATE SET
                    name = EXCLUDED.name,
                    kurzcharakter = EXCLUDED.kurzcharakter,
                    beschreibung = EXCLUDED.beschreibung
            """),
            {"id": mid, "name": name, "kurz": kurz, "beschr": beschr},
        )

    politikfelder_en = [
        ("wirtschaft_finanzen", "Economy & Finance", "Econ"),
        ("arbeit_soziales", "Labour & Social Affairs", "Soc"),
        ("umwelt_energie", "Environment & Energy", "Env"),
        ("innere_sicherheit", "Internal Security", "Sec"),
        ("bildung_forschung", "Education & Research", "Edu"),
        ("gesundheit_pflege", "Health & Care", "Health"),
        ("digital_infrastruktur", "Digital & Infrastructure", "Dig"),
        ("landwirtschaft", "Agriculture", "Agri"),
    ]
    for fid, name, kurz in politikfelder_en:
        conn.execute(
            sa.text("""
                INSERT INTO politikfelder_i18n (feld_id, locale, name, kurz)
                VALUES (:id, 'en', :name, :kurz)
                ON CONFLICT (feld_id, locale) DO UPDATE SET
                    name = EXCLUDED.name,
                    kurz = EXCLUDED.kurz
            """),
            {"id": fid, "name": name, "kurz": kurz},
        )

    verbaende_en = [
        (
            "bdi",
            "Federation of German Industries",
            "BDI",
            "Peak association of German industry.",
        ),
        (
            "gbd",
            "German Trade Union Confederation",
            "GBD",
            "Umbrella organisation of trade unions.",
        ),
        (
            "uvb",
            "Environmental Associations Germany",
            "UVB",
            "Umbrella of environmental and nature conservation NGOs.",
        ),
        (
            "sgd",
            "Security Associations Germany",
            "SGD",
            "Interest representation for internal security.",
        ),
        (
            "bvd",
            "Education Associations Germany",
            "BVD",
            "Umbrella of education associations.",
        ),
        (
            "pvd",
            "Care Associations Germany",
            "PVD",
            "Interest representation of the care sector.",
        ),
        (
            "dwv",
            "Digital Economy Association",
            "DWV",
            "Association of the digital economy.",
        ),
        (
            "bvl",
            "Federal Agriculture Association",
            "BVL",
            "Peak association of agriculture.",
        ),
    ]
    for vid, name, kurz, bio in verbaende_en:
        conn.execute(
            sa.text("""
                INSERT INTO verbaende_i18n (verband_id, locale, name, kurz, bio)
                VALUES (:id, 'en', :name, :kurz, :bio)
                ON CONFLICT (verband_id, locale) DO UPDATE SET
                    name = EXCLUDED.name,
                    kurz = EXCLUDED.kurz,
                    bio = EXCLUDED.bio
            """),
            {"id": vid, "name": name, "kurz": kurz, "bio": bio},
        )

    agenda_en = [
        (
            "ag_gesetz_klimawende",
            "Advance the climate transition",
            "Pass at least two laws from Environment & Energy successfully.",
        ),
        (
            "ag_gesetz_wirtschaftsstandort",
            "Strengthen business location",
            "Pass at least two laws from Economy & Finance.",
        ),
        (
            "ag_gesetz_breit_regieren",
            "Govern broadly",
            "Pass five laws successfully in the legislative term.",
        ),
        (
            "ag_milieu_prekaere",
            "Reach the precarious",
            "Keep or reach milieu 'Precarious' at at least 42% approval.",
        ),
        (
            "ag_milieu_mitte",
            "Hold the centre",
            "Keep social centre stable at at least 48% approval.",
        ),
        (
            "ag_medien_praesenz",
            "Media presence",
            "Maintain media climate above 55 for at least 24 months.",
        ),
        (
            "ag_medien_krisenfest",
            "Crisis-proof in public",
            "At most six months with media climate below 35.",
        ),
        (
            "ag_verband_gewerkschaften",
            "Unions on board",
            "Keep GBD relationship at at least 60.",
        ),
        (
            "ag_verband_wirtschaft",
            "Bind business associations",
            "Keep BDI relationship at at least 58.",
        ),
        (
            "ag_haushalt_schwarze_null",
            "Balanced budget",
            "At least twelve consecutive months with non-negative budget balance (≥ 0 bn €).",
        ),
        (
            "ag_haushalt_investition",
            "Investment offensive",
            "Pass three laws marked as investment successfully.",
        ),
        (
            "ag_kabinett_zusammenhalt",
            "Cabinet cohesion",
            "Keep average cabinet mood at at least 3.0.",
        ),
    ]
    for aid, titel, besch in agenda_en:
        conn.execute(
            sa.text("""
                INSERT INTO agenda_ziele_i18n (agenda_ziel_id, locale, titel, beschreibung)
                VALUES (:id, 'en', :titel, :besch)
                ON CONFLICT (agenda_ziel_id, locale) DO UPDATE SET
                    titel = EXCLUDED.titel,
                    beschreibung = EXCLUDED.beschreibung
            """),
            {"id": aid, "titel": titel, "besch": besch},
        )

    koalition_en = [
        (
            "kz_gp_umweltgesetz",
            "Greens: clear environmental law",
            "At least one Environment & Energy law must pass — otherwise coalition pressure grows.",
        ),
        (
            "kz_gp_postmateriell",
            "Post-material milieu",
            "Post-material approval should not fall below 45%.",
        ),
        (
            "kz_gp_uvb",
            "Do not alienate UVB",
            "Keep relationship with environmental association (UVB) at at least 50.",
        ),
        (
            "kz_sdp_sozialgesetz",
            "SPD: social policy signal",
            "At least one Labour & Social Affairs law must pass.",
        ),
        (
            "kz_sdp_soziale_mitte",
            "Secure social centre",
            "Social centre approval at least 45%.",
        ),
        ("kz_sdp_gbd", "Union trust", "Keep GBD relationship at at least 50."),
    ]
    for kid, titel, besch in koalition_en:
        conn.execute(
            sa.text("""
                INSERT INTO koalitions_ziele_i18n (koalitions_ziel_id, locale, titel, beschreibung)
                VALUES (:id, 'en', :titel, :besch)
                ON CONFLICT (koalitions_ziel_id, locale) DO UPDATE SET
                    titel = EXCLUDED.titel,
                    beschreibung = EXCLUDED.beschreibung
            """),
            {"id": kid, "titel": titel, "besch": besch},
        )


def _seed_eu_events_en(conn: Any) -> None:
    eu_events_en = [
        (
            "eu_rl_mindestlohn",
            "EU minimum wage directive",
            '"Brussels demands binding minimum wage standards."',
            "The EU directive on adequate minimum wages must be transposed.",
            "EU minimum wage directive: implementation pressure from Brussels",
        ),
        (
            "eu_rl_lieferkette",
            "EU supply chain directive",
            '"Due diligence obligations along the supply chain become mandatory."',
            "The EU directive on sustainable supply chains requires national implementation.",
            "EU supply chain directive: companies under pressure",
        ),
        (
            "eu_rl_klima",
            "EU climate tightening",
            '"Climate targets are tightened — Germany must follow."',
            "Brussels tightens climate requirements. High co-financing required.",
            "EU tightens climate targets — national adjustment needed",
        ),
        (
            "eu_rechtsruck",
            "European shift to the right",
            '"Right-wing populist parties gain in several member states."',
            "Political mood in Europe is shifting. Coalition partner reacts with concern.",
            "Shift to the right in Europe — government under scrutiny",
        ),
        (
            "eu_gipfel_frankreich",
            "Franco-German summit",
            '"Paris and Berlin must find common positions."',
            "The Franco-German summit is approaching. All EU routes have -15% PK for 4 months.",
            "Franco-German summit — marathon negotiations",
        ),
        (
            "europawahl",
            "European election",
            '"The European election has taken place — results are in."',
            "The European election changes EU climate values in all fields by ±10.",
            "European election completed — new majorities in Brussels",
        ),
    ]
    for eid, title, quote, context, ticker in eu_events_en:
        conn.execute(
            sa.text("""
                INSERT INTO eu_events_i18n (event_id, locale, title, quote, context, ticker)
                VALUES (:eid, 'en', :title, :quote, :context, :ticker)
                ON CONFLICT (event_id, locale) DO UPDATE SET
                    title = EXCLUDED.title,
                    quote = EXCLUDED.quote,
                    context = EXCLUDED.context,
                    ticker = EXCLUDED.ticker
            """),
            {
                "eid": eid,
                "title": title,
                "quote": quote,
                "context": context,
                "ticker": ticker,
            },
        )

    eu_choices_en = [
        (
            "eu_rl_mindestlohn",
            "sofort_umsetzen",
            "Implement immediately",
            "Full transposition — costly but compliant.",
            "EU directive implemented immediately.",
        ),
        (
            "eu_rl_mindestlohn",
            "minimal_umsetzen",
            "Minimal implementation",
            "Narrow transposition — Brussels may object.",
            "Minimum implementation chosen. EU review possible.",
        ),
        (
            "eu_rl_mindestlohn",
            "klagen",
            "Challenge legally",
            "Buy time — risk of fine.",
            "Legal challenge initiated against directive.",
        ),
        (
            "eu_rl_lieferkette",
            "sofort",
            "Implement immediately",
            "Companies bear full due diligence burden.",
            "Supply chain law implemented in full.",
        ),
        (
            "eu_rl_lieferkette",
            "minimal",
            "Minimal scope",
            "Relief for SMEs — NGOs criticise.",
            "Narrow supply chain rules adopted.",
        ),
        (
            "eu_rl_lieferkette",
            "klagen",
            "Challenge legally",
            "Postpone — EU infringement risk.",
            "Legal steps against supply chain directive.",
        ),
        (
            "eu_rl_klima",
            "sofort",
            "Implement immediately",
            "High co-financing — climate targets met.",
            "Climate directive transposed quickly.",
        ),
        (
            "eu_rl_klima",
            "minimal",
            "Minimal implementation",
            "Lower costs — environmental groups protest.",
            "Minimal climate transposition.",
        ),
        (
            "eu_rl_klima",
            "klagen",
            "Challenge legally",
            "Delay — fine risk remains.",
            "Legal challenge on climate directive.",
        ),
        (
            "eu_rechtsruck",
            "reagieren",
            "Respond clearly",
            "Position against right-wing shift — costs PK.",
            "Clear response to European shift to the right.",
        ),
        (
            "eu_rechtsruck",
            "neutral",
            "Stay neutral",
            "No PK cost — partner uneasy.",
            "Neutral stance on European developments.",
        ),
        (
            "eu_rechtsruck",
            "gegenposition",
            "Counter-position",
            "Strong signal — coalition partner divided.",
            "Counter-position to right-wing trend in Europe.",
        ),
        (
            "eu_gipfel_frankreich",
            "thema_a",
            "Topic A: climate",
            "Focus climate — industry sceptical.",
            "Franco-German summit focused on climate.",
        ),
        (
            "eu_gipfel_frankreich",
            "thema_b",
            "Topic B: economy",
            "Focus economy — Greens uneasy.",
            "Franco-German summit focused on economy.",
        ),
        (
            "eu_gipfel_frankreich",
            "beide_neutral",
            "Both topics neutral",
            "Low PK cost — little progress.",
            "Summit without clear priority.",
        ),
        (
            "europawahl",
            "zur_kenntnis",
            "Take note",
            "EU climate values adjust by ±10.",
            "European election results noted.",
        ),
    ]
    for eid, key, label, desc, log in eu_choices_en:
        conn.execute(
            sa.text("""
                INSERT INTO eu_event_choices_i18n (choice_id, locale, label, "desc", log_msg)
                SELECT ec.id, 'en', :label, :desc, :log
                FROM eu_event_choices ec
                WHERE ec.event_id = :eid AND ec.choice_key = :key
                ON CONFLICT (choice_id, locale) DO UPDATE SET
                    label = EXCLUDED.label,
                    "desc" = EXCLUDED."desc",
                    log_msg = EXCLUDED.log_msg
            """),
            {"eid": eid, "key": key, "label": label, "desc": desc, "log": log},
        )


def upgrade() -> None:
    conn = op.get_bind()
    _seed_events_013_044_048(conn)
    _seed_meta_i18n(conn)
    _seed_eu_events_en(conn)


def downgrade() -> None:
    conn = op.get_bind()
    dyn_ids = [
        "dyn_wirtschaftskrise_droht",
        "dyn_rezession_eintritt",
        "dyn_boom_steuermehreinnahmen",
        "dyn_koalitionskrise_gipfel",
        "dyn_minister_ruecktritt_angebot",
        "dyn_energiekrise_eu",
        "dyn_fluechtlingswelle",
        "dyn_naturkatastrophe_inland",
        "dyn_vertrauenskrise_umfrage",
        "dyn_desinformation_kampagne",
        "dyn_gbd_forderung_aufschwung",
        "dyn_bdi_krise_forderung",
    ]
    kommunal_ids = [
        "kommunal_klima_initiative",
        "kommunal_sozial_initiative",
        "kommunal_sicherheit_initiative",
        "vorstufe_kommunal_erfolg",
        "vorstufe_laender_erfolg",
    ]
    for eid in dyn_ids + kommunal_ids:
        conn.execute(
            sa.text("""
                DELETE FROM event_choices_i18n WHERE choice_id IN (
                    SELECT id FROM event_choices WHERE event_id = :eid
                ) AND locale = 'en'
            """),
            {"eid": eid},
        )
        conn.execute(
            sa.text("DELETE FROM events_i18n WHERE event_id = :eid AND locale = 'en'"),
            {"eid": eid},
        )
    for table, _id_col in [
        ("milieus_i18n", "milieu_id"),
        ("politikfelder_i18n", "feld_id"),
        ("verbaende_i18n", "verband_id"),
        ("agenda_ziele_i18n", "agenda_ziel_id"),
        ("koalitions_ziele_i18n", "koalitions_ziel_id"),
    ]:
        conn.execute(sa.text(f"DELETE FROM {table} WHERE locale = 'en'"))
    eu_ids = [
        "eu_rl_mindestlohn",
        "eu_rl_lieferkette",
        "eu_rl_klima",
        "eu_rechtsruck",
        "eu_gipfel_frankreich",
        "europawahl",
    ]
    for eid in eu_ids:
        conn.execute(
            sa.text("""
                DELETE FROM eu_event_choices_i18n WHERE choice_id IN (
                    SELECT id FROM eu_event_choices WHERE event_id = :eid
                ) AND locale = 'en'
            """),
            {"eid": eid},
        )
        conn.execute(
            sa.text(
                "DELETE FROM eu_events_i18n WHERE event_id = :eid AND locale = 'en'"
            ),
            {"eid": eid},
        )
