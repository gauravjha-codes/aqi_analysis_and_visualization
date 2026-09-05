# Use official Python runtime as base image
FROM python:3.10-slim

# Prevent Python from writing .pyc files & enable unbuffered logging
ENV PYTHONDONTWRITEBYTECODE=1
ENV PYTHONUNBUFFERED=1
ENV PORT=5000

# Install R runtime, build dependencies, and clean up apt cache
RUN apt-get update && apt-get install -y --no-install-recommends \
    r-base \
    r-base-dev \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Install required R packages
RUN R -e "install.packages(c('randomForest', 'jsonlite'), repos='https://cloud.r-project.org')"

# Set working directory
WORKDIR /app

# Copy requirements and install Python dependencies
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir -r /app/requirements.txt

# Copy the rest of the application files
COPY . /app

# Expose server port
EXPOSE 5000

# Start server using Gunicorn WSGI
CMD ["sh", "-c", "gunicorn --bind 0.0.0.0:${PORT} app:app --workers 2 --timeout 120"]
