from __future__ import annotations

from uuid import UUID

from sqlalchemy import case, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.game_stat import GameStat
from app.schemas.stats import (
    CommunityStatsResponse,
    GameStatCreateRequest,
    HighscoreItem,
    HighscoresResponse,
    MeStatItem,
    NachParteiRow,
    PolitikfeldCount,
    TitelCount,
)


async def create_game_stat(
    db: AsyncSession,
    req: GameStatCreateRequest,
    user_id: UUID | None,
) -> GameStat:
    row = GameStat(
        user_id=user_id,
        session_id=req.session_id.strip(),
        partei=req.partei.strip().lower(),
        complexity=req.complexity,
        gewonnen=req.gewonnen,
        wahlprognose=req.wahlprognose,
        monate_gespielt=req.monate_gespielt,
        gesetze_beschlossen=req.gesetze_beschlossen,
        gesetze_gescheitert=req.gesetze_gescheitert,
        koalitionsbruch=req.koalitionsbruch,
        saldo_final=req.saldo_final,
        gini_final=req.gini_final,
        arbeitslosigkeit_final=req.arbeitslosigkeit_final,
        medienklima_final=req.medienklima_final,
        skandale_gesamt=req.skandale_gesamt,
        pk_verbraucht=req.pk_verbraucht,
        top_politikfeld=req.top_politikfeld,
        bewertung_gesamt=req.bewertung_gesamt,
        titel=req.titel,
        opt_in_community=req.opt_in_community,
    )
    db.add(row)
    await db.flush()
    return row


async def get_community_stats(db: AsyncSession) -> CommunityStatsResponse:
    total_r = await db.execute(
        select(func.count()).select_from(GameStat).where(GameStat.opt_in_community.is_(True))
    )
    gesamt = int(total_r.scalar_one() or 0)

    if gesamt == 0:
        return CommunityStatsResponse(
            gesamt=0,
            gewinnrate=0.0,
            wahlprognose_avg=0.0,
            nach_partei=[],
            top_politikfelder=[],
            titel_verteilung=[],
        )

    won_r = await db.execute(
        select(func.count())
        .select_from(GameStat)
        .where(GameStat.opt_in_community.is_(True), GameStat.gewonnen.is_(True))
    )
    won_n = int(won_r.scalar_one() or 0)
    gewinnrate = round(100.0 * won_n / gesamt, 1)

    avg_wp_r = await db.execute(
        select(func.avg(GameStat.wahlprognose)).where(GameStat.opt_in_community.is_(True))
    )
    wahlprognose_avg = round(float(avg_wp_r.scalar_one() or 0), 1)

    # Nach Partei
    partei_rows = await db.execute(
        select(
            GameStat.partei,
            func.count().label("n"),
            func.avg(case((GameStat.gewonnen.is_(True), 1.0), else_=0.0)).label("wr"),
            func.avg(GameStat.wahlprognose).label("avg_wp"),
        )
        .where(GameStat.opt_in_community.is_(True))
        .group_by(GameStat.partei)
        .order_by(func.count().desc())
    )
    nach_partei: list[NachParteiRow] = []
    for partei, n, wr, avg_wp in partei_rows.all():
        nach_partei.append(
            NachParteiRow(
                partei=str(partei),
                anzahl=int(n),
                gewinnrate=round(float(wr or 0) * 100, 1),
                wahlprognose_avg=round(float(avg_wp or 0), 1),
            )
        )

    # Top Politikfelder (nicht leer)
    pf_rows = await db.execute(
        select(GameStat.top_politikfeld, func.count().label("c"))
        .where(
            GameStat.opt_in_community.is_(True),
            GameStat.top_politikfeld.isnot(None),
            GameStat.top_politikfeld != "",
        )
        .group_by(GameStat.top_politikfeld)
        .order_by(func.count().desc())
        .limit(12)
    )
    top_politikfelder = [
        PolitikfeldCount(feld=str(a), anzahl=int(b)) for a, b in pf_rows.all() if a
    ]

    titel_rows = await db.execute(
        select(GameStat.titel, func.count().label("c"))
        .where(
            GameStat.opt_in_community.is_(True),
            GameStat.titel.isnot(None),
            GameStat.titel != "",
        )
        .group_by(GameStat.titel)
        .order_by(func.count().desc())
        .limit(20)
    )
    titel_verteilung = [
        TitelCount(titel=str(a), anzahl=int(b)) for a, b in titel_rows.all() if a
    ]

    return CommunityStatsResponse(
        gesamt=gesamt,
        gewinnrate=gewinnrate,
        wahlprognose_avg=wahlprognose_avg,
        nach_partei=nach_partei,
        top_politikfelder=top_politikfelder,
        titel_verteilung=titel_verteilung,
    )


async def get_user_stats_history(db: AsyncSession, user_id: UUID) -> list[MeStatItem]:
    r = await db.execute(
        select(GameStat)
        .where(GameStat.user_id == user_id)
        .order_by(GameStat.created_at.desc())
        .limit(100)
    )
    rows = r.scalars().all()
    return [
        MeStatItem(
            id=str(x.id),
            partei=x.partei,
            complexity=x.complexity,
            gewonnen=x.gewonnen,
            wahlprognose=float(x.wahlprognose),
            monate_gespielt=x.monate_gespielt,
            bewertung_gesamt=x.bewertung_gesamt,
            titel=x.titel,
            created_at=x.created_at,
        )
        for x in rows
    ]


async def get_highscores(
    db: AsyncSession,
    partei: str | None,
    complexity: int | None,
    limit: int,
) -> HighscoresResponse:
    q = select(GameStat).where(GameStat.opt_in_community.is_(True))
    if partei:
        q = q.where(GameStat.partei == partei.strip().lower())
    if complexity is not None:
        q = q.where(GameStat.complexity == complexity)
    q = q.order_by(GameStat.wahlprognose.desc(), GameStat.created_at.desc()).limit(
        min(max(limit, 1), 100)
    )
    r = await db.execute(q)
    rows = r.scalars().all()
    items = [
        HighscoreItem(
            titel=x.titel,
            partei=x.partei,
            wahlprognose=float(x.wahlprognose),
            gesetze_beschlossen=x.gesetze_beschlossen,
            saldo_final=float(x.saldo_final) if x.saldo_final is not None else None,
            complexity=x.complexity,
            created_at=x.created_at,
        )
        for x in rows
    ]
    return HighscoresResponse(items=items)
