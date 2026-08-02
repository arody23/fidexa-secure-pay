# Railway / prod — whatsapp-web.js + Chromium
FROM node:20-bookworm-slim

RUN apt-get update && apt-get install -y --no-install-recommends \
    chromium \
    fonts-liberation \
    ca-certificates \
    && rm -rf /var/lib/apt/lists/*

ENV PUPPETEER_SKIP_DOWNLOAD=true \
    PUPPETEER_EXECUTABLE_PATH=/usr/bin/chromium \
    CHROME_PATH=/usr/bin/chromium \
    WWEBJS_AUTH_PATH=/data/.wwebjs_auth \
    NODE_ENV=production \
    WHATSAPP_ENABLED=true \
    PORT=3099

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev --ignore-scripts --legacy-peer-deps
COPY src ./src

# Volume Railway → monter /data (session WhatsApp persistante)
VOLUME ["/data"]
EXPOSE 3099
CMD ["node", "src/index.js"]
