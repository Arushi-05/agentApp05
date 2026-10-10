# Reading List — project rules for all agent sessions

Read `CONTRACT.md` before writing any code. It is the source of truth for types, endpoints, and layout. Do not change it.

## Context

Small reading-list tracker. Five agent sessions are working on this repo **in parallel**, each in its own git worktree on its own branch. You are one of them. Other sessions' files may not exist in your worktree yet — that is expected.

## Hard rules

1. **Stay in your lane.** Only create or edit the files your task names. If you need something another session owns (e.g. `store.ts`), import it and assume it matches `CONTRACT.md`. Do not write it yourself.
2. **Never redefine shared types.** Import from `shared/types.ts`. No local copies of `Book`, `BookStatus`, `StatusCounts`.
3. **Follow the contract exactly** — field names, status strings, status codes, error shapes.
4. **No database.** In-memory only.
5. **No auth.** Not in scope.
6. **No new dependencies** beyond those listed below without saying so clearly in your output.
7. **Commit your own work** when done: `git add -A && git commit -m "<short message>"`.

## Stack (fixed)

- Node 20, TypeScript (strict), ESM
- Server: Express 4
- Client: React 19 + Vite + TypeScript. Plain CSS or inline styles — no Tailwind, no component library, no build plugins beyond `@vitejs/plugin-react`.
- Tests: Vitest + Supertest
- Deploy: single Render web service

## Commands

```bash
npm run dev      # server + client in dev
npm run build    # build client, compile server
npm start        # production: node server/dist/index.js
npm test         # vitest
```

## Style

- Keep it small and readable. No abstractions you don't need.
- Validation lives in the route handlers; the store does not validate.
- Errors always `{ "error": "..." }` with the status code from the contract.
- Prefer clear names over clever ones.

## When you finish

Print a short summary: files created, anything you assumed about another session's work, anything you think conflicts with the contract.