import { useEffect, useState, type FormEvent } from 'react';
import type { Book, BookStatus, StatusCounts } from '@shared/types';

const STATUSES: BookStatus[] = ['to-read', 'reading', 'done'];

const STATUS_LABELS: Record<BookStatus, string> = {
  'to-read': 'To read',
  reading: 'Reading',
  done: 'Done',
};

type Filter = BookStatus | 'all';
type Feedback = { kind: 'success' | 'error'; message: string } | null;

// Fetch JSON from the API; on a non-2xx response, throw with the `error` field from the body.
async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...init?.headers },
  });
  const body: unknown = await res.json().catch(() => null);
  if (!res.ok) {
    const message =
      typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
        ? body.error
        : `Request failed (${res.status})`;
    throw new Error(message);
  }
  return body as T;
}

function errorMessage(err: unknown): string {
  return err instanceof Error ? err.message : 'Something went wrong';
}

export default function App() {
  const [books, setBooks] = useState<Book[]>([]);
  const [counts, setCounts] = useState<StatusCounts | null>(null);
  const [filter, setFilter] = useState<Filter>('all');
  const [feedback, setFeedback] = useState<Feedback>(null);

  const [title, setTitle] = useState('');
  const [author, setAuthor] = useState('');
  const [status, setStatus] = useState<BookStatus>('to-read');
  const [submitting, setSubmitting] = useState(false);

  async function loadBooks(currentFilter: Filter) {
    const query = currentFilter === 'all' ? '' : `?status=${encodeURIComponent(currentFilter)}`;
    const data = await api<{ books: Book[] }>(`/api/books${query}`);
    setBooks(data.books);
  }

  async function loadStats() {
    const data = await api<{ counts: StatusCounts }>('/api/books/stats');
    setCounts(data.counts);
  }

  async function refresh(currentFilter: Filter = filter) {
    try {
      await Promise.all([loadBooks(currentFilter), loadStats()]);
    } catch (err) {
      setFeedback({ kind: 'error', message: errorMessage(err) });
    }
  }

  useEffect(() => {
    void refresh(filter);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function handleAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    try {
      const book = await api<Book>('/api/books', {
        method: 'POST',
        body: JSON.stringify({ title, author, status }),
      });
      setFeedback({ kind: 'success', message: `Added "${book.title}"` });
      setTitle('');
      setAuthor('');
      setStatus('to-read');
      await refresh();
    } catch (err) {
      setFeedback({ kind: 'error', message: errorMessage(err) });
    } finally {
      setSubmitting(false);
    }
  }

  async function handleStatusChange(book: Book, newStatus: BookStatus) {
    try {
      const updated = await api<Book>(`/api/books/${encodeURIComponent(book.id)}`, {
        method: 'PATCH',
        body: JSON.stringify({ status: newStatus }),
      });
      setFeedback({
        kind: 'success',
        message: `"${updated.title}" moved to ${STATUS_LABELS[updated.status]}`,
      });
      await refresh();
    } catch (err) {
      setFeedback({ kind: 'error', message: errorMessage(err) });
    }
  }

  return (
    <main className="app">
      <h1>Reading List</h1>

      {feedback && (
        <div className={`feedback feedback-${feedback.kind}`} role={feedback.kind === 'error' ? 'alert' : 'status'}>
          <span>{feedback.message}</span>
          <button type="button" className="dismiss" onClick={() => setFeedback(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}

      <section className="stats" aria-label="Counts by status">
        {STATUSES.map((s) => (
          <div key={s} className={`stat stat-${s}`}>
            <span className="stat-count">{counts ? counts[s] : '–'}</span>
            <span className="stat-label">{STATUS_LABELS[s]}</span>
          </div>
        ))}
      </section>

      <section className="card">
        <h2>Add a book</h2>
        <form className="add-form" onSubmit={(e) => void handleAdd(e)}>
          <label>
            Title
            <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Required" />
          </label>
          <label>
            Author
            <input value={author} onChange={(e) => setAuthor(e.target.value)} placeholder="Optional" />
          </label>
          <label>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value as BookStatus)}>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <button type="submit" disabled={submitting}>
            {submitting ? 'Adding…' : 'Add book'}
          </button>
        </form>
      </section>

      <section className="card">
        <div className="list-header">
          <h2>Books</h2>
          <label className="filter">
            Show
            <select value={filter} onChange={(e) => setFilter(e.target.value as Filter)}>
              <option value="all">All</option>
              {STATUSES.map((s) => (
                <option key={s} value={s}>
                  {STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
        </div>

        {books.length === 0 ? (
          <p className="empty">No books here yet.</p>
        ) : (
          <ul className="book-list">
            {books.map((book) => (
              <li key={book.id} className="book">
                <div className="book-info">
                  <span className="book-title">{book.title}</span>
                  {book.author && <span className="book-author">by {book.author}</span>}
                </div>
                <select
                  className={`status-select status-${book.status}`}
                  value={book.status}
                  onChange={(e) => void handleStatusChange(book, e.target.value as BookStatus)}
                  aria-label={`Status of ${book.title}`}
                >
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {STATUS_LABELS[s]}
                    </option>
                  ))}
                </select>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
