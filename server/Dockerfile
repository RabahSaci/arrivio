FROM node:18-alpine

WORKDIR /usr/src/app

# Copy backend package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy backend source files
COPY . .

# Metadata
EXPOSE 8080

# Cloud Run injects the PORT environment variable
ENV PORT 8080

CMD ["node", "index.js"]
