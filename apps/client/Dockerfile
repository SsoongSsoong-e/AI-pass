# syntax=docker/dockerfile:1
# Multi-stage Build: React 빌드 최적화

# Stage 1: 빌드 단계
FROM node:20-alpine AS builder

WORKDIR /usr/src/app

# 빌드 시점 환경 변수 (Vite는 빌드 시점에 환경 변수를 코드에 주입)
ARG VITE_API_URL
ARG VITE_BASE_URL

# 환경 변수를 빌드 시점에 사용할 수 있도록 설정
ENV VITE_API_URL=${VITE_API_URL}
ENV VITE_BASE_URL=${VITE_BASE_URL}

# Copy root package files
COPY package.json package-lock.json ./

# Copy workspace package files
COPY apps/client/package.json apps/client/package.json
COPY packages packages

# Install all dependencies (workspace dependencies included)
RUN npm install

# Copy client source code
COPY apps/client apps/client

WORKDIR /usr/src/app/apps/client

# Build the application
RUN npm run build

# Stage 2: 실행 단계 (빌드 결과물만 복사)
FROM nginx:alpine

# 빌드 결과물만 복사
COPY --from=builder /usr/src/app/apps/client/dist /usr/share/nginx/html

# Nginx 설정 (SPA 라우팅)
RUN echo 'server { \
    listen 80; \
    server_name _; \
    root /usr/share/nginx/html; \
    index index.html; \
    location / { \
        try_files $uri $uri/ /index.html; \
    } \
}' > /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
