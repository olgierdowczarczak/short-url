FROM node:22-alpine AS build
WORKDIR /app
RUN npm install -g npm@11.7.0
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:22-alpine
WORKDIR /app
ENV NODE_ENV=production
RUN npm install -g npm@11.7.0
COPY package*.json ./
RUN npm ci --omit=dev
COPY --from=build /app/dist ./dist
EXPOSE 3000
CMD ["sh", "-c", "npm run typeorm -- migration:run && exec node dist/main.js"]
