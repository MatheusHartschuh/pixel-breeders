FROM python:3.10-slim

ENV PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1

WORKDIR /app

COPY requirements.txt .
RUN python -m pip install --upgrade pip setuptools wheel \
    && pip install --no-cache-dir --prefer-binary -r requirements.txt

RUN groupadd --system app \
    && useradd --system --gid app --home-dir /app --create-home --shell /usr/sbin/nologin app

COPY --chown=app:app app ./app

EXPOSE 8000

USER app

CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
