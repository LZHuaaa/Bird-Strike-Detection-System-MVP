# Use Python 3.11 slim image
FROM python:3.11-slim

# Set working directory
WORKDIR /app

# Install system dependencies (required for some Python packages like librosa/scipy)
RUN apt-get update && apt-get install -y \
    libsndfile1 \
    ffmpeg \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first to leverage Docker cache
COPY requirements-deploy.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements-deploy.txt

# Copy the entire backend code
COPY backend/ ./backend/

# Expose the port Hugging Face expects
EXPOSE 7860

# Command to run the FastAPI app on the Hugging Face expected port
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
