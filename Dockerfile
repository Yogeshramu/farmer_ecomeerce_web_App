FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY prisma ./prisma/

# Install python and edge-tts for high-quality natural voice
RUN apk add --no-cache python3 py3-pip
RUN pip3 install edge-tts --break-system-packages

# Install dependencies
RUN npm ci

# Copy source code
COPY . .

# Generate Prisma client
RUN npx prisma generate

# Build the application
RUN npm run build

EXPOSE 3000

# Start script that handles database setup and app startup
COPY start.sh ./
RUN chmod +x start.sh

CMD ["./start.sh"]