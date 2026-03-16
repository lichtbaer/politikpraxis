# Backend – FastAPI
FROM python:3.13-slim

WORKDIR /app

# System-Abhängigkeiten für asyncpg/cryptography
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq5 \
    && rm -rf /var/lib/apt/lists/*

# Abhängigkeiten
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Anwendung
COPY . .
COPY alembic.ini .

# Nicht-root User
RUN useradd -m appuser && chown -R appuser:appuser /app
USER appuser

EXPOSE 8000

# Host 0.0.0.0 damit der Container von außen erreichbar ist
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
