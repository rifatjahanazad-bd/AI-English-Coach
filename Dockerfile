# ==============================================================================
# Dockerfile: AI English Coach (Production Container for Google Cloud / Firebase)
# ==============================================================================
FROM python:3.11-slim

# Prevent Python from writing .pyc files and enable immediate log streaming
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PORT=8080 \
    ENV=production

WORKDIR /app

# Install system dependencies:
# - ffmpeg: Required by audio_to_txt and speaking_evaluator for audio conversion
# - curl: Required for container health checks on Cloud Run / Kubernetes
RUN apt-get update && apt-get install -y --no-install-recommends \
    ffmpeg \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create non-root application user for secure execution
RUN groupadd -g 1000 appuser && \
    useradd -u 1000 -g appuser -s /bin/bash -m appuser

# Install Python dependencies
COPY requirements.txt .
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r requirements.txt

# Copy application source code and curriculum assets
COPY backend/ ./backend/
COPY UI/ ./UI/
COPY lessons/ ./lessons/

# Ensure write permissions for database and generated media
RUN mkdir -p /app/output/memes /app/backend/database && \
    chown -R appuser:appuser /app

# Switch to non-root user
USER appuser

# Expose standard Cloud Run / Container port
EXPOSE 8080

# Health check to ensure FastAPI is responsive
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
    CMD curl -f http://localhost:${PORT:-8080}/api/health || exit 1

# Launch production server via uvicorn
CMD ["python3", "-m", "uvicorn", "backend.server:app", "--host", "0.0.0.0", "--port", "8080"]
