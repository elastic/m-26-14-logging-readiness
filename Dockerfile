# Build the Vite + React SPA, then serve the static bundle with nginx.
#
# For the EBC/GPS hosting platform: the platform builds this image keylessly from the
# repo's CI (per-repo Workload Identity Federation) and serves it at
# ms2614-reference-architecture.gps.elastic.dev behind Google IAP. nginx listens on :80
# (the workload manifest sets spec.port: 80), and the SPA fallback in nginx.conf keeps
# react-router BrowserRouter deep links working.

FROM node:20-slim AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
# SPA fallback + static serving (deep links -> index.html).
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
