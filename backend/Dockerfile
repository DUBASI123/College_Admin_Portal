# Use node 20 alpine as parent image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files and install production dependencies
COPY package*.json ./
RUN npm ci --only=production

# Copy application source code
COPY src/ ./src/

# Expose API port
EXPOSE 5050

# Start backend server
CMD ["node", "src/server.js"]
