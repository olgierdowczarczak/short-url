FROM node:22-alpine AS build
WORKDIR /app
RUN npm install -g npm@11.7.0
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
