import { beforeEach, describe, expect, it } from 'vitest';
import request from 'supertest';
import type { Express } from 'express';
import type { Book, BookStatus, StatusCounts } from '../shared/types.js';
import * as server from '../server/src/index.js';
import { resetStore } from '../server/src/store.js';

// CONTRACT.md does not say whether index.ts exports the app as named `app` or default.
const app = ((server as Record<string, unknown>).app ??
  (server as Record<string, unknown>).default) as Express;

const STATUS_ERROR = 'status must be one of: to-read, reading, done';
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function addBook(body: { title: string; author?: string; status?: BookStatus }): Promise<Book> {
  const res = await request(app).post('/api/books').send(body);
  expect(res.status).toBe(201);
  return res.body as Book;
}

beforeEach(() => {
  resetStore();
});

describe('POST /api/books', () => {
  it('adds a valid book and returns 201 with every Book field', async () => {
    const res = await request(app)
      .post('/api/books')
      .send({ title: 'Dune', author: 'Frank Herbert', status: 'reading' });

    expect(res.status).toBe(201);
    const book = res.body as Book;
    expect(Object.keys(book).sort()).toEqual(['author', 'createdAt', 'id', 'status', 'title']);
    expect(book.id).toMatch(UUID);
    expect(book.title).toBe('Dune');
    expect(book.author).toBe('Frank Herbert');
    expect(book.status).toBe('reading');
    expect(typeof book.createdAt).toBe('string');
    expect(new Date(book.createdAt).toISOString()).toBe(book.createdAt);
  });

  it('defaults status to to-read and author to empty string', async () => {
    const res = await request(app).post('/api/books').send({ title: 'Dune' });

    expect(res.status).toBe(201);
    expect(res.body.status).toBe('to-read');
    expect(res.body.author).toBe('');
  });

  it('returns 400 when title is missing', async () => {
    const res = await request(app).post('/api/books').send({ author: 'Nobody' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'title is required' });
  });

  it('returns 400 when title is whitespace-only', async () => {
    const res = await request(app).post('/api/books').send({ title: '   ' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: 'title is required' });
  });

  it('returns 400 for an invalid status', async () => {
    const res = await request(app).post('/api/books').send({ title: 'Dune', status: 'finished' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: STATUS_ERROR });
  });
});

describe('GET /api/books', () => {
  it('lists all books', async () => {
    const a = await addBook({ title: 'A' });
    const b = await addBook({ title: 'B', status: 'reading' });
    const c = await addBook({ title: 'C', status: 'done' });

    const res = await request(app).get('/api/books');

    expect(res.status).toBe(200);
    const ids = (res.body.books as Book[]).map((book) => book.id).sort();
    expect(ids).toEqual([a.id, b.id, c.id].sort());
  });

  it('filters by ?status=reading', async () => {
    await addBook({ title: 'A' });
    const b = await addBook({ title: 'B', status: 'reading' });
    const c = await addBook({ title: 'C', status: 'reading' });
    await addBook({ title: 'D', status: 'done' });

    const res = await request(app).get('/api/books?status=reading');

    expect(res.status).toBe(200);
    const books = res.body.books as Book[];
    expect(books.map((book) => book.id).sort()).toEqual([b.id, c.id].sort());
    expect(books.every((book) => book.status === 'reading')).toBe(true);
  });

  it('returns 400 for an invalid status query', async () => {
    const res = await request(app).get('/api/books?status=finished');

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: STATUS_ERROR });
  });
});

describe('GET /api/books/stats', () => {
  it('returns all three keys as 0 when empty', async () => {
    const res = await request(app).get('/api/books/stats');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ counts: { 'to-read': 0, reading: 0, done: 0 } satisfies StatusCounts });
  });

  it('returns correct counts per status', async () => {
    await addBook({ title: 'A' });
    await addBook({ title: 'B', status: 'to-read' });
    await addBook({ title: 'C', status: 'reading' });
    await addBook({ title: 'D', status: 'done' });
    await addBook({ title: 'E', status: 'done' });
    await addBook({ title: 'F', status: 'done' });

    const res = await request(app).get('/api/books/stats');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ counts: { 'to-read': 2, reading: 1, done: 3 } satisfies StatusCounts });
  });
});

describe('PATCH /api/books/:id', () => {
  it('updates status and returns 200 with the updated book', async () => {
    const book = await addBook({ title: 'Dune', author: 'Frank Herbert' });

    const res = await request(app).patch(`/api/books/${book.id}`).send({ status: 'done' });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ ...book, status: 'done' });
  });

  it('returns 400 for an invalid status', async () => {
    const book = await addBook({ title: 'Dune' });

    const res = await request(app).patch(`/api/books/${book.id}`).send({ status: 'Done' });

    expect(res.status).toBe(400);
    expect(res.body).toEqual({ error: STATUS_ERROR });
  });

  it('returns 404 for an unknown id', async () => {
    const res = await request(app)
      .patch('/api/books/00000000-0000-4000-8000-000000000000')
      .send({ status: 'done' });

    expect(res.status).toBe(404);
    expect(res.body).toEqual({ error: 'book not found' });
  });
});
