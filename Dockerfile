# 444.HEIMAT-FUNK — Production Dockerfile (Multi-stage, Non-root)
FROM python:3.11-slim AS builder
WORKDIR /build
COPY backend/requirements.txt .
RUN pip install --no-cache-dir --prefix=/install -r requirements.txt
RUN pip install --no-cache-dir --prefix=/install qrcode[pil] python-socketio

FROM python:3.11-slim AS runtime
# Security: Non-root user
RUN groupadd -r heimatfunk && useradd -r -g heimatfunk -d /app -s /sbin/nologin heimatfunk
WORKDIR /app
COPY --from=builder /install /usr/local
COPY backend/ ./backend/
# Read-only filesystem compatibility
RUN mkdir -p /app/memory && chown -R heimatfunk:heimatfunk /app
USER heimatfunk
EXPOSE 8001
ENV PYTHONUNBUFFERED=1
CMD ["uvicorn", "server:app", "--host", "0.0.0.0", "--port", "8001", "--workers", "2"]
HEALTHCHECK --interval=30s --timeout=5s CMD curl -f http://localhost:8001/api/health || exit 1
