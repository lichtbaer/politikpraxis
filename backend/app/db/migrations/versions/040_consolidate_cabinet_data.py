"""Kabinett-Daten konsolidieren: Legacy-Chars entfernen, Pool-Minister vervollständigen.

Revision ID: 040_consolidate_cabinet
Revises: 039_game_stats_sma343
Create Date: 2026-03-24

- Legacy-Chars (kanzler, fm, wm, im, jm, um, am, gm, bm) entfernen
- partei_id FK für Pool-Minister setzen (→ partei_kuerzel/farbe im JOIN)
- ultimatum_mood_thresh fixen (auf -1 wenn kein Event)
- Ideologie-Werte für Pool-Minister setzen
- sdp_kanzler ergänzen (fehlte bisher)
- Bonus-Trigger/Applies für Schlüssel-Minister setzen
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = "040_consolidate_cabinet"
down_revision: Union[str, Sequence[str], None] = "039_game_stats_sma343"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

# Legacy-Chars die entfernt werden
LEGACY_IDS = ["kanzler", "fm", "wm", "im", "jm", "um", "am", "gm", "bm"]

# Legacy-Char-ID -> neue Pool-Char-ID
# Damit FK-Referenzen (z.B. events, ministerial_initiativen) beim Cleanup erhalten bleiben.
LEGACY_TO_POOL_CHAR = {
    "kanzler": "cdp_kanzler",
    "fm": "cdp_fm",
    "wm": "sdp_wm",
    "im": "cdp_im",
    "jm": "cdp_jm",
    "um": "gp_um",
    "am": "sdp_am",
    "gm": "sdp_gm",
    "bm": "sdp_bm",
}

# Pool-Partei → Partei-ID (FK zu parteien-Tabelle)
POOL_TO_PARTEI = {
    "sdp": "sdp",
    "cdp": "cdp",
    "gp": "gp",
    "ldp": "ldp",
    "lp": "lp",
}

# Ideologie-Werte pro Partei (Basis aus parteien-Tabelle mit individuellen Abweichungen)
PARTEI_IDEOLOGIE = {
    "sdp": {"wirtschaft": -30, "gesellschaft": -30, "staat": -20},
    "cdp": {"wirtschaft": 30, "gesellschaft": 20, "staat": 10},
    "gp": {"wirtschaft": -10, "gesellschaft": -50, "staat": -30},
    "ldp": {"wirtschaft": 60, "gesellschaft": -10, "staat": 60},
    "lp": {"wirtschaft": -65, "gesellschaft": -40, "staat": -60},
}

# Individuelle Abweichungen pro Minister (delta zu Partei-Basis)
MINISTER_IDEOLOGIE_DELTA: dict[str, dict[str, int]] = {
    # SDP
    "sdp_fm": {"wirtschaft": 10, "gesellschaft": 0, "staat": 5},
    "sdp_wm": {"wirtschaft": 15, "gesellschaft": 5, "staat": 0},
    "sdp_am": {"wirtschaft": -10, "gesellschaft": -5, "staat": -5},
    "sdp_gm": {"wirtschaft": 0, "gesellschaft": -10, "staat": 0},
    "sdp_im": {"wirtschaft": 5, "gesellschaft": 15, "staat": 10},
    "sdp_bm": {"wirtschaft": 0, "gesellschaft": -10, "staat": -5},
    # CDP
    "cdp_kanzler": {"wirtschaft": 0, "gesellschaft": 0, "staat": 0},
    "cdp_fm": {"wirtschaft": 15, "gesellschaft": 5, "staat": 10},
    "cdp_im": {"wirtschaft": 5, "gesellschaft": 20, "staat": 15},
    "cdp_wm": {"wirtschaft": 10, "gesellschaft": 0, "staat": 5},
    "cdp_jm": {"wirtschaft": -5, "gesellschaft": -10, "staat": -5},
    "cdp_bm": {"wirtschaft": 0, "gesellschaft": 5, "staat": 0},
    # GP
    "gp_kanzlerin": {"wirtschaft": 0, "gesellschaft": 0, "staat": 0},
    "gp_um": {"wirtschaft": -10, "gesellschaft": -5, "staat": -10},
    "gp_wm": {"wirtschaft": 10, "gesellschaft": -5, "staat": 0},
    "gp_fm": {"wirtschaft": 5, "gesellschaft": 0, "staat": 5},
    "gp_jm": {"wirtschaft": -5, "gesellschaft": -10, "staat": -5},
    "gp_im": {"wirtschaft": 0, "gesellschaft": 5, "staat": 5},
    # LDP
    "ldp_kanzler": {"wirtschaft": 0, "gesellschaft": 0, "staat": 0},
    "ldp_fm": {"wirtschaft": 5, "gesellschaft": 0, "staat": 10},
    "ldp_wm": {"wirtschaft": 10, "gesellschaft": -5, "staat": 5},
    "ldp_jm": {"wirtschaft": -5, "gesellschaft": -10, "staat": -5},
    "ldp_im": {"wirtschaft": 0, "gesellschaft": 5, "staat": 10},
    "ldp_bm": {"wirtschaft": 5, "gesellschaft": -5, "staat": 0},
    # LP
    "lp_kanzlerin": {"wirtschaft": 0, "gesellschaft": 0, "staat": 0},
    "lp_fm": {"wirtschaft": 10, "gesellschaft": 0, "staat": 5},
    "lp_am": {"wirtschaft": -10, "gesellschaft": -5, "staat": -10},
    "lp_jm": {"wirtschaft": -5, "gesellschaft": -10, "staat": -5},
    "lp_wm": {"wirtschaft": 5, "gesellschaft": 5, "staat": 0},
    "lp_im": {"wirtschaft": 0, "gesellschaft": 10, "staat": 5},
}

# Bonus-Trigger und Applies für Schlüssel-Minister
MINISTER_BONUSES: dict[str, dict[str, str]] = {
    # Umweltminister (alle Parteien): prog-Boost bei guter Stimmung
    "gp_um": {"trigger": "mood>=4", "applies": "prog_boost"},
    "sdp_am": {"trigger": "mood>=4", "applies": "arbeit_boost"},
    # Finanzminister: Haushalts-Bonus bei guter Stimmung
    "cdp_fm": {"trigger": "mood>=4", "applies": "hh_boost"},
    "sdp_fm": {"trigger": "mood>=4", "applies": "hh_boost"},
    "gp_fm": {"trigger": "mood>=4", "applies": "hh_boost"},
    "ldp_fm": {"trigger": "mood>=4", "applies": "hh_boost"},
    "lp_fm": {"trigger": "mood>=4", "applies": "hh_boost"},
    # Innenminister: Sabotage-Risiko bei schlechter Stimmung
    "cdp_im": {"trigger": "mood<=1", "applies": "br_sabotage"},
    # Wirtschaftsminister: Arbeitslosenquote-Bonus
    "sdp_wm": {"trigger": "mood>=4", "applies": "wirt_bonus"},
    "cdp_wm": {"trigger": "mood>=4", "applies": "wirt_bonus"},
    "gp_wm": {"trigger": "mood>=4", "applies": "wirt_bonus"},
    "ldp_wm": {"trigger": "mood>=4", "applies": "wirt_bonus"},
    "lp_wm": {"trigger": "mood>=4", "applies": "wirt_bonus"},
}


def upgrade() -> None:
    conn = op.get_bind()

    # 1. FK-Referenzen von Legacy-IDs auf Pool-Minister umhängen
    for legacy_id, pool_id in LEGACY_TO_POOL_CHAR.items():
        conn.execute(
            sa.text("UPDATE events SET char_id = :pool WHERE char_id = :legacy"),
            {"pool": pool_id, "legacy": legacy_id},
        )
        conn.execute(
            sa.text(
                "UPDATE ministerial_initiativen SET char_id = :pool WHERE char_id = :legacy"
            ),
            {"pool": pool_id, "legacy": legacy_id},
        )

    # 2. Legacy-Chars und deren i18n-Einträge entfernen
    for cid in LEGACY_IDS:
        conn.execute(
            sa.text("DELETE FROM chars_i18n WHERE char_id = :cid"),
            {"cid": cid},
        )
        conn.execute(
            sa.text("DELETE FROM chars WHERE id = :cid"),
            {"cid": cid},
        )

    # 3. partei_id FK setzen (damit JOIN auf parteien funktioniert → partei_kuerzel/farbe)
    for pool, partei in POOL_TO_PARTEI.items():
        conn.execute(
            sa.text("UPDATE chars SET partei_id = :partei WHERE pool_partei = :pool"),
            {"partei": partei, "pool": pool},
        )

    # 4. ultimatum_mood_thresh auf -1 für Minister ohne Event (deaktiviert)
    conn.execute(
        sa.text(
            "UPDATE chars SET ultimatum_mood_thresh = -1 "
            "WHERE ultimatum_event_id IS NULL AND pool_partei IS NOT NULL"
        )
    )

    # 5. Ideologie-Werte setzen
    for char_id, delta in MINISTER_IDEOLOGIE_DELTA.items():
        pool = char_id.split("_")[0]
        basis = PARTEI_IDEOLOGIE.get(
            pool, {"wirtschaft": 0, "gesellschaft": 0, "staat": 0}
        )
        w = basis["wirtschaft"] + delta.get("wirtschaft", 0)
        g = basis["gesellschaft"] + delta.get("gesellschaft", 0)
        s = basis["staat"] + delta.get("staat", 0)
        conn.execute(
            sa.text(
                "UPDATE chars SET ideologie_wirtschaft = :w, ideologie_gesellschaft = :g, "
                "ideologie_staat = :s WHERE id = :cid"
            ),
            {"w": w, "g": g, "s": s, "cid": char_id},
        )

    # 6. Bonus-Trigger setzen
    for char_id, bonus in MINISTER_BONUSES.items():
        conn.execute(
            sa.text(
                "UPDATE chars SET bonus_trigger = :trigger, bonus_applies = :applies "
                "WHERE id = :cid"
            ),
            {"trigger": bonus["trigger"], "applies": bonus["applies"], "cid": char_id},
        )

    # 7. Fehlenden SDP-Kanzler ergänzen
    conn.execute(
        sa.text("""
            INSERT INTO chars (id, initials, color, mood_start, loyalty_start, min_complexity,
                pool_partei, ressort, ist_kanzler, partei_id, ultimatum_mood_thresh,
                ideologie_wirtschaft, ideologie_gesellschaft, ideologie_staat)
            VALUES ('sdp_kanzler', 'MK', '#E3000F', 3, 5, 2,
                'sdp', NULL, true, 'sdp', -1,
                :w, :g, :s)
        """),
        {
            "w": PARTEI_IDEOLOGIE["sdp"]["wirtschaft"],
            "g": PARTEI_IDEOLOGIE["sdp"]["gesellschaft"],
            "s": PARTEI_IDEOLOGIE["sdp"]["staat"],
        },
    )
    conn.execute(
        sa.text("""
            INSERT INTO chars_i18n (char_id, locale, name, role, bio, bonus_desc, interests, eingangszitat, keyword)
            VALUES ('sdp_kanzler', 'de', 'Martin Krause', 'Kanzler-Kandidat', 'Langjähriger Fraktionsvorsitzender der SDP. Bekannt für pragmatische Kompromisse und seine Fähigkeit, unterschiedliche Parteiflügel zusammenzuhalten.', NULL, '{}', 'Zusammenhalt entsteht durch gemeinsame Verantwortung.', 'Pragmatiker')
        """)
    )
    conn.execute(
        sa.text("""
            INSERT INTO chars_i18n (char_id, locale, name, role, bio, bonus_desc, interests, eingangszitat, keyword)
            VALUES ('sdp_kanzler', 'en', 'Martin Krause', 'Chancellor candidate', 'Long-serving SDP parliamentary group leader. Known for pragmatic compromises and his ability to unite different party factions.', NULL, '{}', 'Unity comes from shared responsibility.', 'Pragmatist')
        """)
    )

    # 8. Kanzler-Kandidaten als ist_kanzler markieren (falls noch nicht)
    conn.execute(
        sa.text(
            "UPDATE chars SET ist_kanzler = true "
            "WHERE id IN ('cdp_kanzler', 'gp_kanzlerin', 'ldp_kanzler', 'lp_kanzlerin', 'sdp_kanzler')"
        )
    )


def downgrade() -> None:
    """Rollback: Legacy-Chars wiederherstellen ist nicht trivial — hier nur Pool-Updates zurücknehmen."""
    conn = op.get_bind()

    # SDP-Kanzler entfernen
    conn.execute(sa.text("DELETE FROM chars_i18n WHERE char_id = 'sdp_kanzler'"))
    conn.execute(sa.text("DELETE FROM chars WHERE id = 'sdp_kanzler'"))

    # partei_id zurücksetzen
    conn.execute(
        sa.text("UPDATE chars SET partei_id = NULL WHERE pool_partei IS NOT NULL")
    )

    # ultimatum zurücksetzen
    conn.execute(
        sa.text(
            "UPDATE chars SET ultimatum_mood_thresh = 0 WHERE pool_partei IS NOT NULL AND ultimatum_event_id IS NULL"
        )
    )

    # Ideologie zurücksetzen
    conn.execute(
        sa.text(
            "UPDATE chars SET ideologie_wirtschaft = 0, ideologie_gesellschaft = 0, ideologie_staat = 0 WHERE pool_partei IS NOT NULL"
        )
    )

    # Bonuses zurücksetzen
    conn.execute(
        sa.text(
            "UPDATE chars SET bonus_trigger = NULL, bonus_applies = NULL WHERE pool_partei IS NOT NULL"
        )
    )

    # Kanzler-Kandidaten zurücksetzen
    conn.execute(
        sa.text(
            "UPDATE chars SET ist_kanzler = false WHERE id IN ('cdp_kanzler', 'gp_kanzlerin', 'ldp_kanzler', 'lp_kanzlerin')"
        )
    )
