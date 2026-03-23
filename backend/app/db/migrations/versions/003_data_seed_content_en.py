"""Seed Content EN — Chars, Gesetze, Events, Bundesrat (EN)

Revision ID: 003_seed_en
Revises: 002_seed
Create Date: 2025-03-17

Migrates EN translations from public/locales/en/game.json into *_i18n tables.
Content is served via API /api/content/*?locale=en.

Institution name convention (EN):
- Bundesrat → "Bundesrat (Federal Council)"
- Bundestag → "Bundestag (Federal Parliament)"
- Bundesland/Länder → "Federal States"
- Politisches Kapital → "Political Capital (PK)"
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision: str = "003_seed_en"
down_revision: Union[str, Sequence[str], None] = "002_seed"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Insert EN translations into all *_i18n tables."""
    conn = op.get_bind()

    # --- chars_i18n (EN) ---
    op.bulk_insert(
        sa.table(
            "chars_i18n",
            sa.column("char_id"),
            sa.column("locale"),
            sa.column("name"),
            sa.column("role"),
            sa.column("bio"),
            sa.column("bonus_desc"),
            sa.column("interests"),
            sa.column("keyword"),
        ),
        [
            {
                "char_id": "kanzler",
                "locale": "en",
                "name": "Anna Hoffmann",
                "role": "Chancellor",
                "bio": "Leads the coalition with a pragmatic course. Holds the threads together — but expects loyalty in return.",
                "bonus_desc": "Gives +5 parliament votes for all laws",
                "interests": ["Coalition stability", "Re-election"],
                "keyword": "Stability",
            },
            {
                "char_id": "fm",
                "locale": "en",
                "name": "Robert Lehmann",
                "role": "Finance Minister",
                "bio": "Strict budget guardian of the CDU. Consistently opposes expensive reforms — but is usually right.",
                "bonus_desc": "Accelerates laws without budget costs",
                "interests": ["Fiscal discipline", "Debt brake"],
                "keyword": "Budget",
            },
            {
                "char_id": "wm",
                "locale": "en",
                "name": "Petra Maier",
                "role": "Economics Minister",
                "bio": "Pragmatic and solution-oriented. Important ally — maintains contacts with industry and state premiers.",
                "bonus_desc": "+3% parliament votes for economic laws",
                "interests": ["Business location policy", "Industrial transformation"],
                "keyword": "Business location",
            },
            {
                "char_id": "im",
                "locale": "en",
                "name": "Klaus Braun",
                "role": "Interior Minister",
                "bio": "Conservative maverick. Fundamentally distrusts the coalition — actively seeks reasons to torpedo it.",
                "bonus_desc": "Stabilises Bundesrat (Federal Council) votes in 3 states",
                "interests": ["Domestic security", "Migration limits"],
                "keyword": "Security",
            },
            {
                "char_id": "jm",
                "locale": "en",
                "name": "Sara Kern",
                "role": "Justice Minister",
                "bio": "Lawyer with uncompromising principles. Blocks unconstitutional projects — but also protects the coalition from costly mistakes.",
                "bonus_desc": "Prevents constitutional challenges against laws",
                "interests": ["Rule of law", "Fundamental rights"],
                "keyword": "Rule of law",
            },
            {
                "char_id": "um",
                "locale": "en",
                "name": "Jonas Wolf",
                "role": "Environment Minister",
                "bio": "Drives climate policy forward, sometimes against the rest of the cabinet. Strong network among progressive voters.",
                "bonus_desc": "+4% approval in progressive milieu",
                "interests": ["Climate protection", "Energy transition"],
                "keyword": "Climate",
            },
        ],
    )

    # --- gesetze_i18n (EN) ---
    op.bulk_insert(
        sa.table(
            "gesetze_i18n",
            sa.column("gesetz_id"),
            sa.column("locale"),
            sa.column("titel"),
            sa.column("kurz"),
            sa.column("desc"),
        ),
        [
            {
                "gesetz_id": "ee",
                "locale": "en",
                "titel": "Renewable Energy Acceleration Act",
                "kurz": "EE-BeschG",
                "desc": "Doubling of expansion targets, simplified permitting.",
            },
            {
                "gesetz_id": "wb",
                "locale": "en",
                "titel": "Federal Housing Construction Offensive",
                "kurz": "BWO",
                "desc": "400,000 new apartments p.a., building law reform.",
            },
            {
                "gesetz_id": "sr",
                "locale": "en",
                "titel": "Corporate Tax Reform",
                "kurz": "USR",
                "desc": "Corporate tax 15%, digital tax financing.",
            },
            {
                "gesetz_id": "bp",
                "locale": "en",
                "titel": "National Education Package",
                "kurz": "NBP",
                "desc": "Federal school funding via cooperation article.",
            },
        ],
    )

    # --- events_i18n (EN) ---
    events_en = [
        (
            "haushalt",
            "Budget crisis",
            "Billion-euro hole in federal budget",
            '"Unexpected tax shortfalls tear a hole of 14 billion euros."',
            "The Finance Ministry has revised estimates downward. Finance Minister Lehmann demands immediate countermeasures.",
            "Budget hole: Government under pressure — Lehmann demands austerity package",
        ),
        (
            "skandal",
            "Political scandal",
            "Media reports on ministry waste",
            '"Der Spiegel reports on questionable consultancy contracts in the federal ministry."',
            "The opposition demands resignation. Braun uses the opportunity to destabilise the coalition.",
            "Spiegel report shakes coalition — opposition smells blood",
        ),
        (
            "euklage",
            "EU treaty violation",
            "Brussels initiates proceedings against Germany",
            '"The European Commission criticises the sluggish implementation of EU directives."',
            "Three directives have not yet been transposed into national law. A fine of up to 500 million euros looms.",
            "EU infringement proceedings against Germany opened",
        ),
        (
            "konjunktur",
            "Economic downturn",
            "ECB rate hike hits German economy",
            '"Investment collapses, short-time work rises — recession risk grows."',
            "Maier warns against hasty spending cuts. Lehmann insists on fiscal discipline.",
            "Economic downturn: Recession risk rises to 35%",
        ),
        (
            "koalition_krise",
            "Coalition crisis",
            "Coalition partner threatens to leave",
            '"We can no longer support this policy", warns the coalition partner.',
            "Dispute over energy law escalates. The junior partner demands renegotiation of the coalition agreement.",
            "COALITION CRISIS: Junior partner issues ultimatum to Chancellery",
        ),
        (
            "demo",
            "Society",
            "Major demonstration shakes Berlin",
            '"500,000 people on the streets — the largest demo in years."',
            "The protest targets social inequality. Progressives are mobilised but also dissatisfied with the government.",
            "Berlin: Historic demonstration for social justice",
        ),
        (
            "eufoerder",
            "EU funding",
            "EU releases billion-euro structural funds",
            '"Brussels provides 4.8 billion euros for German climate investments."',
            "A rare piece of good news: EU funds arrive earlier than expected. How will they be used?",
            "EU releases 4.8 bn euros for Germany — government decides use",
        ),
        (
            "fm_ultimatum",
            "Cabinet crisis",
            "Lehmann issues budget ultimatum",
            '"Not a single law without full funding proof — or I resign."',
            "Finance Minister Lehmann is at the end of his patience. Too many expensive projects without funding.",
            "CABINET CRISIS: Finance Minister Lehmann threatens resignation",
        ),
        (
            "braun_ultimatum",
            "Coalition conflict",
            "Braun sabotages Bundesrat (Federal Council) vote",
            '"I have advised the state interior ministers to vote against this law."',
            "Braun has acted behind the coalition's back and influenced three state interior ministers.",
            "Interior Minister Braun sabotages coalition partner in Bundesrat (Federal Council)",
        ),
        (
            "wolf_ultimatum",
            "Climate dispute",
            "Wolf threatens resignation over climate policy",
            '"If the energy law is watered down further, I can no longer represent this cabinet."',
            "Wolf is frustrated with sluggish climate policy.",
            "Environment Minister Wolf issues climate ultimatum to Chancellery",
        ),
        (
            "kern_ultimatum",
            "Constitutional conflict",
            "Kern blocks law over constitutional concerns",
            '"I will not sign any law that cannot withstand the Federal Constitutional Court."',
            "Kern has stopped the emergency law on the EU directive. She is substantively right — but time is running out.",
            "Justice Minister stops emergency law — constitutional concerns in cabinet",
        ),
        (
            "kanzler_ultimatum",
            "Vote of confidence",
            "Hoffmann considers vote of confidence",
            '"If the coalition cannot find a common line, I will call a vote of confidence."',
            "Internal divisions have become public. Hoffmann wants a clear commitment.",
            "Chancellor Hoffmann considers vote of confidence — coalition under pressure",
        ),
        (
            "kohl_bundesrat_sabotage",
            "Bundesrat (Federal Council) sabotage",
            "Kohl requests mediation committee",
            '"Without concessions to the East I will request every mediation committee."',
            "Matthias Kohl (Ostblock) has independently filed a mediation committee request. The law will be delayed by at least 2 months.",
            "Kohl requests mediation committee — law delayed",
        ),
        (
            "wm_ultimatum",
            "Economic dispute",
            "Maier threatens resignation over business location policy",
            '"The combination of tax increase and regulation drives companies abroad."',
            "Maier sees economic policy on the wrong track.",
            "Economics Minister Maier issues business location ultimatum",
        ),
        (
            "laenderfinanzausgleich",
            "State financial equalisation",
            "State financial equalisation dispute escalates",
            '"Pragmatic Centre and Ostblock demand redistribution of financial flows — or blockade."',
            "Factions Brenner and Kohl have allied. They demand a revision of state financial equalisation. Without concessions, blockade threatens in all consent-required laws.",
            "State financial equalisation: Brenner and Kohl demand redistribution",
        ),
        (
            "landtagswahl",
            "State election",
            "State election topples faction",
            '"Surprising change of government — the political map shifts."',
            "A state election has changed the governing party in a federal state. The faction composition in the Bundesrat (Federal Council) changes. The affected faction must renegotiate.",
            "State election: Change of government alters Bundesrat (Federal Council) majorities",
        ),
        (
            "kohl_eskaliert",
            "Special session",
            "Kohl escalates — special session convened",
            '"Without concessions to the East I will request every mediation committee."',
            "Matthias Kohl has filed a mediation committee request for an ongoing law. The law will be delayed by 2 months. How do you respond?",
            "Kohl requests mediation committee — law delayed",
        ),
        (
            "sprecher_wechsel",
            "Speaker change",
            "New faction speaker in Bundesrat (Federal Council)",
            '"The faction has elected a new speaker — with different priorities."',
            "A faction speaker has been replaced. The new character has different interests and a new trade-off pool. The relationship must be rebuilt.",
            "Speaker change: Faction with new face",
        ),
        (
            "bundesrat_initiative",
            "Bundesrat (Federal Council) initiative",
            "Federal States bring own law",
            '"The Federal States want not just to react — they want to shape."',
            "A faction has introduced its own law. You must decide: approval strengthens the relationship, blockade costs sympathy and popularity.",
            "Bundesrat (Federal Council) initiative: Federal States demand say",
        ),
        (
            "foederalismusgipfel",
            "Federalism summit",
            "Federalism summit — all speakers at one table",
            '"Historic opportunity: All four faction speakers received simultaneously."',
            "At the federalism summit you can cultivate all four factions simultaneously — at reduced cost of 8 PK per faction instead of 15.",
            "Federalism summit: All faction speakers in Berlin",
        ),
    ]

    for eid, type_label, title, quote, context, ticker in events_en:
        conn.execute(
            sa.text("""
                INSERT INTO events_i18n (event_id, locale, type_label, title, quote, context, ticker)
                VALUES (:event_id, 'en', :type_label, :title, :quote, :context, :ticker)
            """),
            {
                "event_id": eid,
                "type_label": type_label,
                "title": title,
                "quote": quote,
                "context": context,
                "ticker": ticker,
            },
        )

    # --- event_choices_i18n (EN) — order matches 002_data_seed_content ---
    choices_en = [
        (
            "haushalt",
            "Push through austerity package",
            "Short-term consolidation, lowers popularity",
            "Austerity package passed. Budget stabilised, popularity drops.",
        ),
        (
            "haushalt",
            "Take on new debt",
            "Violates debt brake — legal risk",
            "Debt brake stretched. Constitutional challenge threatens.",
        ),
        (
            "haushalt",
            "Announce tax increase",
            "Burdens centre milieu, stabilises budget",
            "Tax increase announced. Business association protests.",
        ),
        (
            "skandal",
            "Full transparency",
            "Disclose everything, short-term damage",
            "Full disclosure. Short-term damage, long-term trust.",
        ),
        (
            "skandal",
            "Distraction offensive",
            "Divert media with new topic",
            "Distraction manoeuvre launched. Media sceptical.",
        ),
        (
            "skandal",
            "Dismiss minister",
            "Clear signal, costs coalition stability",
            "Minister dismissed. Coalition partners angered.",
        ),
        (
            "euklage",
            "Rapid implementation",
            "Emergency legislation, ignores Bundesrat (Federal Council)",
            "EU directives quickly implemented. Constitutional concerns remain.",
        ),
        (
            "euklage",
            "Open EU negotiations",
            "Gain time, no immediate costs",
            "Negotiations with Brussels opened. Outcome open.",
        ),
        (
            "euklage",
            "Include Bundesrat (Federal Council)",
            "Correct but slow, fine risk",
            "Regular procedure chosen. Fine risk remains.",
        ),
        (
            "konjunktur",
            "Launch stimulus package",
            "Expensive but effective",
            "Stimulus package passed. Budget burdened, economy stabilised.",
        ),
        (
            "konjunktur",
            "Wait and see",
            "Cheap but risky",
            "Wait-and-see stance. Economy worsens further.",
        ),
        (
            "konjunktur",
            "Announce structural reforms",
            "Right long-term, ineffective short-term",
            "Structural reforms announced. Markets react positively.",
        ),
        (
            "koalition_krise",
            "Renegotiate",
            "Stability gain, reform loss",
            "Coalition agreement renegotiated. Reform watered down.",
        ),
        (
            "koalition_krise",
            "Risk confrontation",
            "Principled but destabilising",
            "Coalition crisis escalates. Early elections discussed.",
        ),
        (
            "koalition_krise",
            "Offer trade-off",
            "Sacrifice another project, save coalition",
            "Trade-off agreed. Coalition temporarily saved.",
        ),
        (
            "demo",
            "Offer dialogue",
            "Signal of openness",
            "Dialogue with demonstrators offered. Progressive milieu calmed.",
        ),
        (
            "demo",
            "Reject demands",
            "Clear position but polarisation",
            "Demands rejected. Progressives disappointed.",
        ),
        (
            "demo",
            "Announce emergency programme",
            "Expensive, high sympathy gain",
            "Emergency programme announced. Broad approval.",
        ),
        (
            "eufoerder",
            "Climate & infrastructure",
            "Effective long-term",
            "EU funds used for climate investments.",
        ),
        (
            "eufoerder",
            "Prioritise housing",
            "Popular, quickly visible",
            "EU funds strengthen housing offensive.",
        ),
        (
            "eufoerder",
            "Debt repayment",
            "Finance Ministry delighted",
            "Debt repaid. Budget improved, room for reforms.",
        ),
        (
            "fm_ultimatum",
            "Promise funding proof",
            "Dilutes expensive laws, calms Lehmann",
            "Funding pledge made. Lehmann appeased, reforms restricted.",
        ),
        (
            "fm_ultimatum",
            "Publicly contradict",
            "Clear course but coalition risk",
            "Public dispute with Lehmann. Coalition destabilised.",
        ),
        (
            "fm_ultimatum",
            "Call special meeting",
            "Gain time, costs political capital",
            "Coalition summit at Chancellery. Compromise found.",
        ),
        (
            "braun_ultimatum",
            "Publicly reprimand Braun",
            "Clear signal, Braun becomes enemy",
            "Braun officially reprimanded. Internal tension at maximum.",
        ),
        (
            "braun_ultimatum",
            "Include Braun",
            "Gives him influence, costs reform substance",
            "Braun receives concessions. Coalition stabilised, reform watered down.",
        ),
        (
            "braun_ultimatum",
            "Dismiss Braun",
            "Clean solution, needs coalition partner",
            "Braun dismissed. Cabinet reshuffled.",
        ),
        (
            "wolf_ultimatum",
            "Prioritise energy law",
            "Wolf satisfied, progressive votes rise",
            "Energy law put on priority list. Wolf stays.",
        ),
        (
            "wolf_ultimatum",
            "Persuade Wolf to stay",
            "Symbolic concession",
            "Personal talk with Wolf. Provisional agreement.",
        ),
        (
            "wolf_ultimatum",
            "Accept resignation",
            "Wolf leaves, progressive milieu collapses",
            "Wolf resigns. Progressive voters feel betrayed.",
        ),
        (
            "kern_ultimatum",
            "Adapt law to constitution",
            "Delay but legally secure",
            "Law revised. Constitutionally sound but delayed.",
        ),
        (
            "kern_ultimatum",
            "Appoint expert commission",
            "Further time gain",
            "Constitutional commission appointed. Kern cooperates.",
        ),
        (
            "kern_ultimatum",
            "Apply political pressure",
            "Risky — Kern could sue",
            "Kern feels overruled. Constitutional challenge threatens.",
        ),
        (
            "kanzler_ultimatum",
            "Call coalition summit",
            "All conflicts on the table",
            "Coalition summit creates new unity.",
        ),
        (
            "kanzler_ultimatum",
            "Risk vote of confidence",
            "Gamble — win or early election",
            "Vote of confidence called. Coalition holds narrowly.",
        ),
        (
            "kohl_bundesrat_sabotage",
            "Accept delay",
            "Law voted 2 months later",
            "Mediation committee procedure running. Vote delayed.",
        ),
        (
            "kohl_bundesrat_sabotage",
            "Address Kohl directly",
            "Relationship building, costs 15 PK",
            "Talk with Kohl. Relationship improved, delay remains.",
        ),
        (
            "kohl_bundesrat_sabotage",
            "Publicly criticise",
            "Relationship with Kohl drops further",
            "Kohl publicly criticised. Ostblock hardens position.",
        ),
        (
            "wm_ultimatum",
            "Accelerate tax reform",
            "Maier stays, budget suffers",
            "Tax reform brought forward. Economy stabilised, budget burdened.",
        ),
        (
            "wm_ultimatum",
            "Roll back regulation",
            "Popular with industry, unpopular with progressives",
            "Regulation pause decided. Industry relieved.",
        ),
        (
            "wm_ultimatum",
            "Outvote Maier",
            "Coalition discipline, Maier loses influence",
            "Coalition discipline enforced. Maier complies.",
        ),
        (
            "laenderfinanzausgleich",
            "Make concessions",
            "Budget -0.2, Brenner relationship +8",
            "Concessions on state financial equalisation. Brenner satisfied, budget burdened.",
        ),
        (
            "laenderfinanzausgleich",
            "Reject",
            "Brenner relationship -10, Kohl -8",
            "Demands rejected. Brenner and Kohl angered.",
        ),
        (
            "laenderfinanzausgleich",
            "Commission expert report",
            "Gain time, costs 15 PK",
            "Expert report commissioned. Topic postponed for now.",
        ),
        (
            "landtagswahl",
            "Accept new majorities",
            "Acknowledge political reality",
            "Change of government accepted. Faction composition updated.",
        ),
        (
            "kohl_eskaliert",
            "Cooperate",
            "Improve Kohl relationship, 15 PK",
            "Cooperation with Kohl. Relationship improved, delay remains.",
        ),
        (
            "kohl_eskaliert",
            "Block legally",
            "Legal steps, costs 20 PK",
            "Legal review initiated. Delay remains, Kohl angered.",
        ),
        (
            "kohl_eskaliert",
            "Publicly criticise",
            "Kohl relationship drops further",
            "Kohl publicly criticised. Ostblock hardens position.",
        ),
        (
            "sprecher_wechsel",
            "Include new speaker",
            "Begin relationship building",
            "New speaker acknowledged. Relationship building required.",
        ),
        (
            "bundesrat_initiative",
            "Approve",
            "Relationship to initiating faction +12",
            "Bundesrat (Federal Council) initiative approved. Relationship to faction improved.",
        ),
        (
            "bundesrat_initiative",
            "Block",
            "Relationship -15, popularity -3",
            "Bundesrat (Federal Council) initiative blocked. Faction angered, popularity drops.",
        ),
        (
            "foederalismusgipfel",
            "Cultivate all four factions",
            "32 PK (8 per faction), relationship +3 for all",
            "Federalism summit: Relationship to all factions improved.",
        ),
        (
            "foederalismusgipfel",
            "Invite only Centre and Ostblock",
            "16 PK, relationship +3 for Brenner and Kohl",
            "Federalism summit with Brenner and Kohl. Relationship improved.",
        ),
        (
            "foederalismusgipfel",
            "Cancel summit",
            "No cost, missed chance",
            "Federalism summit cancelled. Chance missed.",
        ),
    ]

    # Get choice_id from event_choices by event_id + order
    event_order = [
        "haushalt",
        "skandal",
        "euklage",
        "konjunktur",
        "koalition_krise",
        "demo",
        "eufoerder",
        "fm_ultimatum",
        "braun_ultimatum",
        "wolf_ultimatum",
        "kern_ultimatum",
        "kanzler_ultimatum",
        "kohl_bundesrat_sabotage",
        "wm_ultimatum",
        "laenderfinanzausgleich",
        "landtagswahl",
        "kohl_eskaliert",
        "sprecher_wechsel",
        "bundesrat_initiative",
        "foederalismusgipfel",
    ]
    choice_counts = [3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 3, 2, 3, 3, 3, 1, 3, 1, 2, 3]

    choice_id = 1
    choice_idx = 0
    for _event_id, choices_in_event in zip(event_order, choice_counts, strict=True):
        for _ in range(choices_in_event):
            _, label, desc, log = choices_en[choice_idx]
            conn.execute(
                sa.text("""
                    INSERT INTO event_choices_i18n (choice_id, locale, label, "desc", log_msg)
                    VALUES (:choice_id, 'en', :label, :desc, :log_msg)
                """),
                {"choice_id": choice_id, "label": label, "desc": desc, "log_msg": log},
            )
            choice_id += 1
            choice_idx += 1

    # --- bundesrat_fraktionen_i18n (EN) ---
    op.bulk_insert(
        sa.table(
            "bundesrat_fraktionen_i18n",
            sa.column("fraktion_id"),
            sa.column("locale"),
            sa.column("name"),
            sa.column("sprecher_name"),
            sa.column("sprecher_partei"),
            sa.column("sprecher_land"),
            sa.column("sprecher_bio"),
        ),
        [
            {
                "fraktion_id": "koalitionstreue",
                "locale": "en",
                "name": "Coalition-loyal",
                "sprecher_name": "Petra Schulz",
                "sprecher_partei": "SPD",
                "sprecher_land": "Niedersachsen",
                "sprecher_bio": "Pragmatic and cooperative. Reliable base but sensitive when federal policy overrides state competencies.",
            },
            {
                "fraktion_id": "pragmatische_mitte",
                "locale": "en",
                "name": "Pragmatic Centre",
                "sprecher_name": "Hans Brenner",
                "sprecher_partei": "SPD",
                "sprecher_land": "Rheinland-Pfalz",
                "sprecher_bio": "The decisive swing voter. Open to deals but always negotiates. Unpredictable without quid pro quo.",
            },
            {
                "fraktion_id": "konservativer_block",
                "locale": "en",
                "name": "Conservative Block",
                "sprecher_name": "Edmund Huber",
                "sprecher_partei": "CSU",
                "sprecher_land": "Bayern",
                "sprecher_bio": "Ideological opponent of the coalition. Fundamentally votes against Red-Green — exception: when a law strengthens state rights.",
            },
            {
                "fraktion_id": "ostblock",
                "locale": "en",
                "name": "Ostblock",
                "sprecher_name": "Matthias Kohl",
                "sprecher_partei": "CDU",
                "sprecher_land": "Sachsen",
                "sprecher_bio": "The unpredictable one. Structural change trauma shapes all decisions. Eastern investments open him — ignore him and he becomes an active saboteur.",
            },
        ],
    )

    # --- bundesrat_tradeoffs_i18n (EN) — IDs 1–12 match 002 order ---
    tradeoffs_en = [
        (
            1,
            "Port infrastructure in stimulus package",
            "Northern German ports receive additional funds — burdens budget.",
        ),
        (
            2,
            "Education package with state veto rights",
            "Federal States receive extended veto rights on education decisions.",
        ),
        (
            3,
            "Increase structural fund allocations",
            "More EU structural funds for northern German regions.",
        ),
        (
            4,
            "No digital tax on SMEs",
            "Exempt medium-sized companies from digital tax.",
        ),
        (
            5,
            "Wine-growing exception in energy law",
            "Wine-growing receives special rules on energy requirements.",
        ),
        (
            6,
            "Double municipal infrastructure funds",
            "Doubling of federal funds for municipal infrastructure.",
        ),
        (
            7,
            "Constitutional federalism guarantee",
            "Anchor federalism more strongly in constitution.",
        ),
        (
            8,
            "No federal competence for education",
            "Education remains exclusively state matter.",
        ),
        (
            9,
            "Automotive industry exception in EE law",
            "Automotive industry receives transition periods.",
        ),
        (
            10,
            "Eastern Germany investment programme (€3 bn)",
            "Special programme for eastern German structural support.",
        ),
        (
            11,
            "Delay coal phase-out by 3 years",
            "Longer transition periods for eastern German coal regions.",
        ),
        (
            12,
            "Special depreciation for eastern German companies",
            "Tax incentives for investments in the East.",
        ),
    ]

    for tid, label, desc in tradeoffs_en:
        conn.execute(
            sa.text("""
                INSERT INTO bundesrat_tradeoffs_i18n (tradeoff_id, locale, label, "desc")
                VALUES (:tid, 'en', :label, :desc)
            """),
            {"tid": tid, "label": label, "desc": desc},
        )


def downgrade() -> None:
    """Remove all EN content from *_i18n tables."""
    conn = op.get_bind()
    conn.execute(sa.text("DELETE FROM bundesrat_tradeoffs_i18n WHERE locale = 'en'"))
    conn.execute(sa.text("DELETE FROM bundesrat_fraktionen_i18n WHERE locale = 'en'"))
    conn.execute(sa.text("DELETE FROM event_choices_i18n WHERE locale = 'en'"))
    conn.execute(sa.text("DELETE FROM events_i18n WHERE locale = 'en'"))
    conn.execute(sa.text("DELETE FROM gesetze_i18n WHERE locale = 'en'"))
    conn.execute(sa.text("DELETE FROM chars_i18n WHERE locale = 'en'"))
