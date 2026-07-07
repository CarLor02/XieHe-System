# syntax=docker/dockerfile:1.7
# Spine Scoliosis Analysis API - Docker Image
FROM python:3.9-slim

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    libgl1 \
    libglib2.0-0 \
    libsm6 \
    libxext6 \
    libxrender1 \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for better caching
COPY lat/requirements.txt ./requirements.txt

# Install Python dependencies
RUN --mount=type=cache,target=/root/.cache/pip \
    pip install -r requirements.txt

# Copy application code
COPY shared/ ./shared/
COPY lat/ ./lat/

# Prevent cached model file layers from reusing stale weights.
ARG WEIGHTS_CACHE_BUST=0
RUN echo "$WEIGHTS_CACHE_BUST" > /dev/null

# Copy model weights
COPY lat/weights/ ./lat/weights/

ENV YOLO_CONFIG_DIR=/tmp \
    MPLCONFIGDIR=/tmp/matplotlib

# Expose port
EXPOSE 8002

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import requests; requests.get('http://localhost:8002/health')"

# Run the application
CMD ["uvicorn", "lat.interfaces.http.app:app", "--host", "0.0.0.0", "--port", "8002"]
