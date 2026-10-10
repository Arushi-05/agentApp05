import { Router } from 'express';
import { getBooks, getStats } from '../store.js';
import type { BookStatus } from '../../../shared/types.js';

const VALID_STATUSES: BookStatus[] = ['to-read', 'reading', 'done'];

function isBookStatus(value: unknown): value is BookStatus {
  return typeof value === 'string' && (VALID_STATUSES as string[]).includes(value);
}

export const readRouter = Router();

// Registered before anything matching /api/books/:id so "stats" is never treated as an id.
readRouter.get('/api/books/stats', (_req, res) => {
  res.status(200).json({ counts: getStats() });
});

readRouter.get('/api/books', (req, res) => {
  const { status } = req.query;

  if (status === undefined) {
    res.status(200).json({ books: getBooks() });
    return;
  }

  if (!isBookStatus(status)) {
    res.status(400).json({ error: 'status must be one of: to-read, reading, done' });
    return;
  }

  res.status(200).json({ books: getBooks(status) });
});
