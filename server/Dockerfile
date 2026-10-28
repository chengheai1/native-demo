FROM python:3.11-slim

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app
COPY requirements.txt ./requirements.txt
RUN pip install -r requirements.txt
COPY app ./app

ENV APP_ENV=production \
    DATABASE_PATH=/data/app.db \
    PUBLIC_BASE_URL=https://app.api.stack021.com \
    FRONTEND_ORIGIN=https://app.api.stack021.com \
    NATIVE_REDIRECT_URIS=nativedemo://auth \
    COOKIE_SECURE=true \
    ALLOW_DEMO_AUTH=false

EXPOSE 8000
VOLUME ["/data"]

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
