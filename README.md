# Reading List

Small reading-list tracker. One Express server serves both the JSON API (`/api/*`) and the built React app (`client/dist`). See `CONTRACT.md` for the API.

## Requirements

- Node 20

## Run locally

```bash
npm install
npm run dev        # API on http://localhost:3000, Vite dev server for the client
npm test
```

Production-style run (what Render does):

```bash
npm install
npm run build      # installs + builds client into client/dist, compiles server into server/dist
npm start          # node server/dist/index.js on $PORT (default 3000)
```

Then open http://localhost:3000.

## Deploy to Render

1. Push the repo to GitHub.
2. In Render, choose **New → Blueprint** and select the repo. It picks up `render.yaml`:
   - build: `npm install --include=dev && npm run build`
   - start: `npm start`
   - plan: free, Node 20, health check `/api/books/stats`
3. Render sets `PORT`; the server reads it.

Data is in memory, so it resets on every deploy and whenever the free instance spins down.

### Docker (fallback)

```bash
docker build -t reading-list .
docker run -p 3000:3000 reading-list
```

On Render, a Docker web service can use this `Dockerfile` instead of the Node runtime.
