# Stage 1: Build React app
FROM node:20-alpine AS builder

WORKDIR /app
COPY frontend/package*.json ./
RUN npm ci --ignore-scripts
COPY frontend/ ./

# VITE_API_BASE_URL is /api at build time; nginx proxies /api → backend
ARG VITE_API_BASE_URL=/api
ARG VITE_SWAGGER_URL=/docs
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL
ENV VITE_SWAGGER_URL=$VITE_SWAGGER_URL

RUN npm run build

# Stage 2: Serve with nginx
FROM nginx:alpine AS runner

COPY frontend/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
