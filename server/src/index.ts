import express from 'express';
import { pathToFileURL } from 'node:url';
import type { BookStatus } from '../../shared/types.js';
import { addBook } from './store.js';
import { readRouter } from './routes/read.js';
import { mountStatic } from './static.js';

const STATUSES: BookStatus[] = ['to-read', 'reading', 'done'];

function isBookStatus(value: unknown): value is BookStatus {
  return typeof value === 'string' && (STATUSES as string[]).includes(value);
}

export const app = express();
app.use(express.json());

// Read routes first: /api/books/stats must be registered before any /api/books/:id route.
app.use(readRouter);

app.post('/api/books', (req, res) => {
  const { title, author, status } = req.body ?? {};

  if (typeof title !== 'string' || title.trim() === '') {
    res.status(400).json({ error: 'title is required' });
    return;
  }
  if (status !== undefined && !isBookStatus(status)) {
    res.status(400).json({ error: 'status must be one of: to-read, reading, done' });
    return;
  }

  const book = addBook({
    title: title.trim(),
    author: typeof author === 'string' ? author : '',
    status,
  });
  res.status(201).json(book);
});

// Must stay after every API router: static files + SPA fallback for non-/api GETs.
mountStatic(app);

// Only listen when run directly, so tests can import `app` without opening a port.
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = Number(process.env.PORT) || 3000;
  app.listen(port, () => {
    console.log(`Server listening on port ${port}`);
  });
}
