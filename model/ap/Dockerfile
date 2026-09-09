# syntax=docker/dockerfile:1.7
# Spine Analysis API - Docker Image
FROM python:3.12-slim-bookworm

COPY --from=ghcr.io/astral-sh/uv:0.12.10 /uv /usr/local/bin/uv

ENV UV_PYTHON_DOWNLOADS=never \
    UV_LINK_MODE=copy \
    UV_COMPILE_BYTECODE=1 \
    PATH="/app/.venv/bin:$PATH"

# Set working directory
WORKDIR /app

# Install system dependencies. AP and lateral images share the compatible apt cache.
RUN --mount=type=cache,id=xiehe-model-apt-cache,target=/var/cache/apt,sharing=locked \
    --mount=type=cache,id=xiehe-model-apt-lib,target=/var/lib/apt,sharing=locked \
    rm -f /etc/apt/apt.conf.d/docker-clean && \
    echo 'Binary::apt::APT::Keep-Downloaded-Packages "true";' > /etc/apt/apt.conf.d/keep-cache && \
    apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1

# Both services install the same locked runtime before copying service code.
COPY pyproject.toml uv.lock .python-version ./
RUN --mount=type=cache,id=xiehe-model-uv,target=/root/.cache/uv,sharing=locked \
    uv sync --locked --no-dev --no-install-project

# Copy application code
COPY shared/ ./shared/
COPY ap/ ./ap/

# Prevent cached model file layers from reusing stale weights.
ARG WEIGHTS_CACHE_BUST=0
RUN echo "$WEIGHTS_CACHE_BUST" > /dev/null

# Copy model weights
COPY ap/weights/ ./ap/weights/

ENV YOLO_CONFIG_DIR=/tmp \
    MPLCONFIGDIR=/tmp/matplotlib

# Expose port
EXPOSE 8001

# Health check
HEALTHCHECK --interval=5s --timeout=5s --start-period=30s --retries=3 \
    CMD python -c "import urllib.request; urllib.request.urlopen('http://localhost:8001/health', timeout=3).close()"

# Run the application
CMD ["uvicorn", "ap.interfaces.http.app:app", "--host", "0.0.0.0", "--port", "8001"]
