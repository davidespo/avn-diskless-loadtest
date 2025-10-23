## Start from official Node.js LTS image
FROM node:20-slim AS builder

WORKDIR /usr/src/app

# Install dependencies
COPY package*.json ./
RUN npm install

# Copy source
COPY . .

## Runtime image
FROM node:20-slim

WORKDIR /usr/src/app

# Copy only necessary files from builder
COPY --from=builder /usr/src/app .

# Use npm start as requested
CMD ["/bin/sh", "-c", "npm run start"]
