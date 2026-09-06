# Backend – FastAPI
# Version muss zu backend/pyproject.toml (requires-python, ruff, mypy) und
# .github/workflows/lint.yml (setup-python) passen — Produktion darf nicht auf
# einer Runtime laufen, gegen die nicht getestet wird.
FROM python:3.13-slim

WORKDIR /app

# System-Abhängigkeiten für asyncpg/cryptography
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Abhängigkeiten
COPY requirements.txt .
# pip/setuptools/wheel zuerst aktualisieren: das Base-Image bringt ein
# veraltetes, gebündeltes setuptools (CVE-2025-47273) und ein von pip vendored
# msgpack (GHSA-6v7p-g79w-8964) mit — beides meldet Trivy im Image-Scan,
# unabhängig von den Paketen in requirements.txt.
RUN pip install --no-cache-dir --upgrade pip setuptools wheel \
    && pip install --no-cache-dir -r requirements.txt

# Anwendung (tests/, scripts/, openapi.json, *.md via .dockerignore ausgeschlossen)
COPY . .

# Nicht-root User
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Prüft /api/health; das Compose-File setzt für Prod ggf. einen abweichenden
# CMD (alembic upgrade + mehrere Worker), der Healthcheck bleibt identisch.
HEALTHCHECK --interval=15s --timeout=5s --retries=5 --start-period=10s \
  CMD ["python", "-c", "import sys, urllib.request; sys.exit(0 if urllib.request.urlopen('http://localhost:8000/api/health', timeout=3).status == 200 else 1)"]

# Host 0.0.0.0 damit der Container von außen erreichbar ist
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
