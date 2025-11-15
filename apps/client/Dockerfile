# syntax=docker/dockerfile:1

FROM node:20-alpine AS base

WORKDIR /usr/src/app

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

EXPOSE 5173

CMD ["npm", "run", "preview"]

