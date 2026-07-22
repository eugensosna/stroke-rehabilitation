FROM node:20-alpine AS builder

WORKDIR /app

COPY frontend/package*.json ./
RUN npm install

COPY frontend/. .

# Injected by Railway at build time — set to the full backend API base URL, e.g.
# https://backend-production-7980.up.railway.app/api
ARG VITE_API_BASE_URL
ENV VITE_API_BASE_URL=${VITE_API_BASE_URL}

RUN npx vite build

FROM node:20-alpine AS runner

WORKDIR /app

# Railway injects PORT at runtime. Default keeps local docker run simple.
ENV PORT=8080

RUN npm install -g serve

COPY --from=builder /app/dist ./dist

EXPOSE 8080

CMD ["sh", "-c", "serve -s dist -l ${PORT}"]
