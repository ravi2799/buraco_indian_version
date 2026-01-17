# Build stage - Frontend
FROM node:20-alpine AS frontend-build
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Production stage
FROM node:20-alpine AS production
WORKDIR /app

# Copy backend
COPY backend/package*.json ./backend/
RUN cd backend && npm ci --only=production

COPY backend/ ./backend/

# Copy built frontend
COPY --from=frontend-build /app/frontend/dist ./frontend/dist
COPY frontend/config.js ./frontend/dist/
COPY frontend/assets ./frontend/dist/assets

# Set environment
ENV NODE_ENV=production
ENV PORT=8080

# Cloud Run uses port 8080 by default
EXPOSE 8080

# Start the server
CMD ["node", "backend/server.js"]
