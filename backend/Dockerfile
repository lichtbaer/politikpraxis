# Backend – FastAPI
FROM python:3.14-slim

WORKDIR /app

# System-Abhängigkeiten für asyncpg/cryptography
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Abhängigkeiten
COPY requirements.txt .
# setuptools aktualisieren, bevor requirements installiert werden — das
# Base-Image bringt sonst ein veraltetes, gebündeltes setuptools mit
# (CVE-2025-47273, von Trivy im Image-Scan gemeldet, unabhängig von den
# Paketen in requirements.txt).
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
