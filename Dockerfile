FROM node:20-alpine AS builder

WORKDIR /app

COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install

COPY frontend ./frontend

RUN cd frontend && npm run build

FROM node:20-alpine AS runner

WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY frontend/package*.json ./frontend/
RUN cd frontend && npm install --omit=dev

COPY --from=builder /app/frontend/.next /app/frontend/.next
COPY --from=builder /app/frontend/public /app/frontend/public
COPY --from=builder /app/frontend/next.config.ts /app/frontend/next.config.ts

WORKDIR /app/frontend

EXPOSE 3000

CMD ["npm", "run", "start"]
