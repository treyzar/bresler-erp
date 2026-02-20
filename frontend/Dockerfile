FROM node:22-alpine AS dev

WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm ci

# Code is mounted via volume in docker-compose, not copied
EXPOSE 5173

CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
