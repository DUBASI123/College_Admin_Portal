# College Admin Backend - Docker Image
# Serves both the API and the pre-built React admin portal
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy backend source code
COPY src/ ./src/

# Copy pre-built React frontend (built locally and committed to repo)
# This serves the admin portal at / and the API at /api
COPY public/ ./public/

# Expose port (Render uses PORT env var, defaults to 10000)
EXPOSE 10000

# Start server (serves API + frontend + APK download)
CMD ["node", "src/server.js"]
