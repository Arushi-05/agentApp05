# Fallback deploy path; Render uses render.yaml by default.
FROM node:20-slim
WORKDIR /app

COPY . .
RUN npm install --include=dev && npm run build && npm prune --omit=dev

ENV NODE_ENV=production
EXPOSE 3000
CMD ["node", "server/dist/index.js"]
