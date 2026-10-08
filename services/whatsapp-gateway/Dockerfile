FROM node:22-alpine

WORKDIR /gateway
RUN apk add --no-cache git
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.mjs ./

ENV NODE_ENV=production
ENV GATEWAY_PORT=3100
ENV WHATSAPP_SESSION_DIR=/data/sessions

EXPOSE 3100
CMD ["npm", "start"]
