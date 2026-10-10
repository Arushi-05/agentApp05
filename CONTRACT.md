# API Contract — Reading List

**This file is the single source of truth. Do not change it. If something here seems wrong, flag it — do not improvise.**

## Shared types

Defined once in `shared/types.ts`, imported by BOTH client and server. Never redeclare these locally.

```ts
export type BookStatus = 'to-read' | 'reading' | 'done';

export interface Book {
  id: string;        // uuid
  title: string;     // non-empty
  author: string;    // may be '' but always present
  status: BookStatus;
  createdAt: string; // ISO 8601
}

export interface StatusCounts {
  'to-read': number;
  reading: number;
  done: number;
}

export interface ApiError { error: string; }
```

Status values are **lowercase, hyphenated, exactly**: `to-read`, `reading`, `done`.

## Endpoints

All under `/api`. JSON in, JSON out.

| Method | Path | Body | 2xx | Errors |
|---|---|---|---|---|
| POST | `/api/books` | `{title: string, author?: string, status?: BookStatus}` | `201` → `Book` | `400` → `ApiError` |
| GET | `/api/books` | — (query `?status=BookStatus` optional) | `200` → `{books: Book[]}` | `400` → `ApiError` |
| PATCH | `/api/books/:id` | `{status: BookStatus}` | `200` → `Book` | `400`, `404` → `ApiError` |
| GET | `/api/books/stats` | — | `200` → `{counts: StatusCounts}` | — |

### Rules

- `title` is required and must be non-empty after trim → else `400 {"error": "title is required"}`
- Invalid `status` anywhere (body or query) → `400 {"error": "status must be one of: to-read, reading, done"}`
- Unknown id on PATCH → `404 {"error": "book not found"}`
- `status` omitted on POST defaults to `to-read`; `author` omitted defaults to `''`
- `/api/books/stats` always returns all three keys, `0` when empty
- Route order matters: register `/api/books/stats` BEFORE `/api/books/:id`

## Storage

Module-level in-memory array in `server/src/store.ts`. No database. Exports:

```ts
addBook(input: {title: string; author?: string; status?: BookStatus}): Book
getBooks(status?: BookStatus): Book[]
updateStatus(id: string, status: BookStatus): Book | null
getStats(): StatusCounts
resetStore(): void   // tests only
```

## Serving

**One** Render service. Express serves the API **and** the built React bundle:

- API at `/api/*`
- Static files from `client/dist`
- SPA fallback: any non-`/api` GET returns `client/dist/index.html`
- Port from `process.env.PORT`, default `3000`

Client calls the API at **relative paths** (`/api/books`). No base URL, no CORS, no env vars.

## Repo layout

```
reading-list/
├── shared/types.ts          # the types above
├── server/src/              # index.ts, store.ts, routes/
├── client/src/              # React + Vite
├── tests/                   # vitest + supertest
├── package.json             # root scripts
└── render.yaml
```