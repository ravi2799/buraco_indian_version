# Cloud Run Deployment Guide

## Prerequisites
- Google Cloud CLI (`gcloud`) installed
- Docker installed (for local testing)
- A Google Cloud project with billing enabled

## Quick Deploy

### 1. Authenticate with Google Cloud
```bash
gcloud auth login
gcloud config set project YOUR_PROJECT_ID
```

### 2. Enable required services
```bash
gcloud services enable cloudbuild.googleapis.com run.googleapis.com
```

### 3. Deploy to Cloud Run (auto-builds from source)
```bash
gcloud run deploy buraco-game \
  --source . \
  --region us-central1 \
  --allow-unauthenticated \
  --port 8080 \
  --memory 512Mi \
  --min-instances 0 \
  --max-instances 2
```

This command will:
- Build the Docker image using Cloud Build
- Push it to Container Registry
- Deploy to Cloud Run

Your app will be available at: `https://buraco-game-XXXXX.run.app`

## Local Testing with Docker

```bash
# Build the image
docker build -t buraco-game .

# Run locally
docker run -p 8080:8080 buraco-game

# Visit http://localhost:8080
```

## Important Notes

1. **WebSocket Support**: Cloud Run supports WebSockets, but connections may be interrupted during scale-down. The app has keep-alive pings to maintain connections.

2. **In-Memory State**: Game rooms are stored in memory. If the instance restarts, active games will be lost. For production, consider:
   - Redis for session storage
   - Cloud Memorystore

3. **Cold Starts**: With `min-instances 0`, the first request after inactivity may take a few seconds.

## Environment Variables (Optional)
- `PORT` - Server port (default: 8080)
- `NODE_ENV` - Set to "production" automatically
