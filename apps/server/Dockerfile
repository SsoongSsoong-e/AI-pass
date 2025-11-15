# syntax=docker/dockerfile:1

FROM node:20-alpine AS base

WORKDIR /usr/src/app

# Install dependencies for the workspace
COPY package.json package-lock.json ./
COPY apps/server/package.json apps/server/package.json
COPY packages packages
RUN npm install

# Copy source code
COPY apps/server apps/server

WORKDIR /usr/src/app/apps/server

# Build the application
RUN npm run build

EXPOSE 5002

CMD ["npm", "run", "start"]

