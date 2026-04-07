import logging
import time
from collections.abc import AsyncGenerator, Callable
from contextlib import asynccontextmanager
from typing import cast

from fastapi import FastAPI, Request
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.responses import Response

from app.config import get_settings
from app.limiter import limiter
from app.routes import (
    admin,
    analytics,
    auth,
    content,
    kontakt,
    mods,
    saves,
    stats,
    usertest_feedback,
)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s %(levelname)s %(name)s %(message)s",
)
logger = logging.getLogger("bundesrepublik")

settings = get_settings()


@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None]:
    logger.info("Bundesrepublik API starting up")
    yield
    logger.info("Bundesrepublik API shutting down")


app = FastAPI(
    title=settings.app_name,
    version="0.1.0",
    docs_url="/api/docs" if settings.debug else None,
    openapi_url="/api/openapi.json" if settings.debug else None,
    redoc_url=None,
    lifespan=lifespan,
)
app.state.limiter = limiter
app.add_exception_handler(
    RateLimitExceeded,
    cast(
        Callable[[Request, Exception], Response],
        _rate_limit_exceeded_handler,
    ),
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type", "Accept", "Accept-Language"],
)


@app.middleware("http")
async def request_logging(request: Request, call_next: Callable) -> Response:
    t0 = time.monotonic()
    response = await call_next(request)
    duration_ms = (time.monotonic() - t0) * 1000
    logger.info(
        "%s %s %d %.0fms",
        request.method,
        request.url.path,
        response.status_code,
        duration_ms,
    )
    return response


@app.middleware("http")
async def security_headers(request: Request, call_next: Callable) -> Response:
    response = await call_next(request)
    if request.url.path.startswith("/api"):
        response.headers["Strict-Transport-Security"] = (
            "max-age=31536000; includeSubDomains"
        )
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["Referrer-Policy"] = "no-referrer"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["Permissions-Policy"] = (
            "camera=(), microphone=(), geolocation=()"
        )
    return response


app.include_router(auth.router, prefix="/api/auth", tags=["auth"])
app.include_router(saves.router, prefix="/api/saves", tags=["saves"])
app.include_router(content.router, prefix="/api/content", tags=["content"])
app.include_router(analytics.router, prefix="/api/analytics", tags=["analytics"])
app.include_router(mods.router, prefix="/api/mods", tags=["mods"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])
app.include_router(kontakt.router, prefix="/api", tags=["kontakt"])
app.include_router(stats.router, prefix="/api/stats", tags=["stats"])
app.include_router(usertest_feedback.router, prefix="/api", tags=["usertest-feedback"])


@app.get("/api/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}
