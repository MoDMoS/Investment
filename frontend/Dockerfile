FROM node:22-alpine AS build
WORKDIR /app
ARG VITE_BASE=/Investment/
ARG VITE_GOLD_AGENT_URL=/gold/
ENV VITE_BASE=$VITE_BASE
ENV VITE_GOLD_AGENT_URL=$VITE_GOLD_AGENT_URL
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:1.27-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
