// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import type { Book, BookStatus, StatusCounts } from '../shared/types.js';
import App from '../client/src/App.js';

// In-memory fake of the API, written from CONTRACT.md, so UI tests don't depend on the real server.
const STATUSES: BookStatus[] = ['to-read', 'reading', 'done'];
const STATUS_ERROR = 'status must be one of: to-read, reading, done';

let books: Book[];
let nextId: number;
let fetchMock: ReturnType<typeof vi.fn>;

function json(status: number, body: unknown): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } });
}

function isStatus(value: unknown): value is BookStatus {
  return STATUSES.includes(value as BookStatus);
}

function seed(title: string, status: BookStatus = 'to-read', author = ''): Book {
  const book: Book = { id: `id-${nextId++}`, title, author, status, createdAt: new Date().toISOString() };
  books.push(book);
  return book;
}

async function fakeApi(input: RequestInfo | URL, init?: RequestInit): Promise<Response> {
  const url = new URL(String(input), 'http://localhost');
  const method = init?.method ?? 'GET';
  const body = init?.body ? JSON.parse(String(init.body)) : {};

  if (method === 'GET' && url.pathname === '/api/books/stats') {
    const counts: StatusCounts = { 'to-read': 0, reading: 0, done: 0 };
    for (const book of books) counts[book.status]++;
    return json(200, { counts });
  }
  if (method === 'GET' && url.pathname === '/api/books') {
    const status = url.searchParams.get('status');
    if (status === null) return json(200, { books });
    if (!isStatus(status)) return json(400, { error: STATUS_ERROR });
    return json(200, { books: books.filter((book) => book.status === status) });
  }
  if (method === 'POST' && url.pathname === '/api/books') {
    if (typeof body.title !== 'string' || body.title.trim() === '') return json(400, { error: 'title is required' });
    if (body.status !== undefined && !isStatus(body.status)) return json(400, { error: STATUS_ERROR });
    return json(201, seed(body.title, body.status ?? 'to-read', body.author ?? ''));
  }
  const match = url.pathname.match(/^\/api\/books\/([^/]+)$/);
  if (method === 'PATCH' && match) {
    if (!isStatus(body.status)) return json(400, { error: STATUS_ERROR });
    const book = books.find((b) => b.id === decodeURIComponent(match[1]));
    if (!book) return json(404, { error: 'book not found' });
    book.status = body.status;
    return json(200, book);
  }
  return json(404, { error: 'not found' });
}

function postCalls() {
  return fetchMock.mock.calls.filter(([, init]) => (init as RequestInit | undefined)?.method === 'POST');
}

function statCount(label: string): string {
  const stats = screen.getByRole('region', { name: 'Counts by status' });
  return within(stats).getByText(label).previousElementSibling?.textContent ?? '';
}

async function renderApp() {
  const user = userEvent.setup();
  render(<App />);
  await waitFor(() => expect(statCount('To read')).not.toBe('–'));
  return user;
}

beforeEach(() => {
  books = [];
  nextId = 1;
  fetchMock = vi.fn(fakeApi);
  vi.stubGlobal('fetch', fetchMock);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('add form validation', () => {
  it('shows the contract error when the title is empty and adds nothing', async () => {
    const user = await renderApp();

    await user.click(screen.getByRole('button', { name: 'Add book' }));

    expect(await screen.findByRole('alert')).toHaveProperty('textContent', expect.stringContaining('title is required'));
    expect(screen.getByText('No books here yet.')).toBeTruthy();
    expect(statCount('To read')).toBe('0');
  });

  it('shows the contract error when the title is whitespace-only and keeps the input', async () => {
    const user = await renderApp();

    await user.type(screen.getByLabelText('Title'), '    ');
    await user.type(screen.getByLabelText('Author'), 'Someone');
    await user.click(screen.getByRole('button', { name: 'Add book' }));

    expect((await screen.findByRole('alert')).textContent).toContain('title is required');
    expect(screen.getByText('No books here yet.')).toBeTruthy();
    expect((screen.getByLabelText('Author') as HTMLInputElement).value).toBe('Someone');
  });

  it('submits on Enter in the title field', async () => {
    const user = await renderApp();

    await user.type(screen.getByLabelText('Title'), 'Dune{Enter}');

    expect(await screen.findByText('Dune')).toBeTruthy();
  });

  it('adds a valid book, shows success, resets the form and updates stats', async () => {
    const user = await renderApp();

    await user.type(screen.getByLabelText('Title'), 'Dune');
    await user.type(screen.getByLabelText('Author'), 'Frank Herbert');
    await user.selectOptions(screen.getByLabelText('Status'), 'reading');
    await user.click(screen.getByRole('button', { name: 'Add book' }));

    expect((await screen.findByRole('status')).textContent).toContain('Added "Dune"');
    expect(screen.getByText('Dune')).toBeTruthy();
    expect(screen.getByText('by Frank Herbert')).toBeTruthy();
    expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Author') as HTMLInputElement).value).toBe('');
    expect((screen.getByLabelText('Status') as HTMLSelectElement).value).toBe('to-read');
    await waitFor(() => expect(statCount('Reading')).toBe('1'));
  });

  it('sends exactly the contract status strings in the POST body', async () => {
    const user = await renderApp();

    for (const status of STATUSES) {
      await user.type(screen.getByLabelText('Title'), `Book ${status}`);
      await user.selectOptions(screen.getByLabelText('Status'), status);
      await user.click(screen.getByRole('button', { name: 'Add book' }));
      await screen.findByText(`Book ${status}`);
    }

    const sent = postCalls().map(([, init]) => JSON.parse(String((init as RequestInit).body)).status);
    expect(sent).toEqual(['to-read', 'reading', 'done']);
  });

  it('only offers the three contract statuses in every status select', async () => {
    seed('Dune');
    await renderApp();
    await screen.findByText('Dune');

    const values = (select: HTMLElement) =>
      Array.from((select as HTMLSelectElement).options).map((option) => option.value);
    expect(values(screen.getByLabelText('Status'))).toEqual(STATUSES);
    expect(values(screen.getByLabelText('Status of Dune'))).toEqual(STATUSES);
    expect(values(screen.getByLabelText('Show'))).toEqual(['all', ...STATUSES]);
  });

  it('disables the submit button while a request is in flight and does not double-submit', async () => {
    const user = await renderApp();
    let release!: () => void;
    fetchMock.mockImplementationOnce(
      (input, init) => new Promise((resolve) => (release = () => resolve(fakeApi(input, init)))),
    );

    await user.type(screen.getByLabelText('Title'), 'Dune');
    await user.click(screen.getByRole('button', { name: 'Add book' }));

    const pending = screen.getByRole('button', { name: 'Adding…' }) as HTMLButtonElement;
    expect(pending.disabled).toBe(true);
    await user.click(pending);
    expect(postCalls()).toHaveLength(1);

    release();
    expect(await screen.findByRole('button', { name: 'Add book' })).toHaveProperty('disabled', false);
  });

  it('renders HTML in a title as plain text', async () => {
    const user = await renderApp();
    const title = '<img src=x onerror="alert(1)">';

    await user.type(screen.getByLabelText('Title'), title);
    await user.click(screen.getByRole('button', { name: 'Add book' }));

    expect(await screen.findByText(title)).toBeTruthy();
    expect(document.querySelector('.book-list img')).toBeNull();
  });

  it('handles a very long title and unicode characters', async () => {
    const user = await renderApp();
    const title = `${'Long '.repeat(100)}— 日本語 📚`;

    await user.click(screen.getByLabelText('Title'));
    await user.paste(title);
    await user.click(screen.getByRole('button', { name: 'Add book' }));

    expect(await screen.findByText(title.trim())).toBeTruthy();
  });

  it('does not render a "by" line when author is empty', async () => {
    const user = await renderApp();

    await user.type(screen.getByLabelText('Title'), 'Anonymous');
    await user.click(screen.getByRole('button', { name: 'Add book' }));

    await screen.findByText('Anonymous');
    expect(screen.queryByText(/^by /)).toBeNull();
  });
});

describe('error handling', () => {
  it('shows a generic message when the server returns a non-JSON error', async () => {
    const user = await renderApp();
    fetchMock.mockResolvedValueOnce(new Response('Internal Server Error', { status: 500 }));

    await user.type(screen.getByLabelText('Title'), 'Dune');
    await user.click(screen.getByRole('button', { name: 'Add book' }));

    expect((await screen.findByRole('alert')).textContent).toContain('Request failed (500)');
    expect((screen.getByLabelText('Title') as HTMLInputElement).value).toBe('Dune');
  });

  it('shows an error when the network request fails', async () => {
    const user = await renderApp();
    fetchMock.mockRejectedValueOnce(new TypeError('Failed to fetch'));

    await user.type(screen.getByLabelText('Title'), 'Dune');
    await user.click(screen.getByRole('button', { name: 'Add book' }));

    expect((await screen.findByRole('alert')).textContent).toContain('Failed to fetch');
    expect(screen.getByRole('button', { name: 'Add book' })).toHaveProperty('disabled', false);
  });

  it('shows an error when the initial load fails', async () => {
    fetchMock.mockImplementation(async () => json(500, { error: 'server down' }));
    render(<App />);

    expect((await screen.findByRole('alert')).textContent).toContain('server down');
    expect(statCount('To read')).toBe('–');
  });

  it('can dismiss feedback', async () => {
    const user = await renderApp();

    await user.click(screen.getByRole('button', { name: 'Add book' }));
    await screen.findByRole('alert');
    await user.click(screen.getByRole('button', { name: 'Dismiss' }));

    expect(screen.queryByRole('alert')).toBeNull();
  });

  it('replaces an error with success after a valid retry', async () => {
    const user = await renderApp();

    await user.click(screen.getByRole('button', { name: 'Add book' }));
    await screen.findByRole('alert');
    await user.type(screen.getByLabelText('Title'), 'Dune');
    await user.click(screen.getByRole('button', { name: 'Add book' }));

    expect((await screen.findByRole('status')).textContent).toContain('Added "Dune"');
    expect(screen.queryByRole('alert')).toBeNull();
  });
});

describe('status changes', () => {
  it('moves a book to a new status and updates stats', async () => {
    seed('Dune');
    const user = await renderApp();
    await screen.findByText('Dune');

    await user.selectOptions(screen.getByLabelText('Status of Dune'), 'done');

    expect((await screen.findByRole('status')).textContent).toContain('"Dune" moved to Done');
    await waitFor(() => expect(statCount('Done')).toBe('1'));
    expect(statCount('To read')).toBe('0');
  });

  it('shows "book not found" and keeps the old status when the book was deleted elsewhere', async () => {
    seed('Dune');
    const user = await renderApp();
    await screen.findByText('Dune');
    books = [];

    await user.selectOptions(screen.getByLabelText('Status of Dune'), 'done');

    expect((await screen.findByRole('alert')).textContent).toContain('book not found');
    expect((screen.getByLabelText('Status of Dune') as HTMLSelectElement).value).toBe('to-read');
  });
});

describe('filter and stats', () => {
  it('shows zeros for every status when empty', async () => {
    await renderApp();

    expect(statCount('To read')).toBe('0');
    expect(statCount('Reading')).toBe('0');
    expect(statCount('Done')).toBe('0');
    expect(screen.getByText('No books here yet.')).toBeTruthy();
  });

  it('filters the list with ?status= and returns to all', async () => {
    seed('A');
    seed('B', 'reading');
    seed('C', 'done');
    const user = await renderApp();
    await screen.findByText('A');

    await user.selectOptions(screen.getByLabelText('Show'), 'reading');
    await waitFor(() => expect(screen.queryByText('A')).toBeNull());
    expect(screen.getByText('B')).toBeTruthy();
    expect(screen.queryByText('C')).toBeNull();
    expect(fetchMock.mock.calls.some(([url]) => url === '/api/books?status=reading')).toBe(true);

    await user.selectOptions(screen.getByLabelText('Show'), 'all');
    expect(await screen.findByText('A')).toBeTruthy();
    expect(screen.getByText('C')).toBeTruthy();
  });

  it('shows the empty message when a filter matches nothing but keeps total stats', async () => {
    seed('A');
    const user = await renderApp();
    await screen.findByText('A');

    await user.selectOptions(screen.getByLabelText('Show'), 'done');

    expect(await screen.findByText('No books here yet.')).toBeTruthy();
    expect(statCount('To read')).toBe('1');
  });

  it('hides a book from a filtered view after its status changes away from the filter', async () => {
    seed('Dune', 'reading');
    const user = await renderApp();
    await user.selectOptions(screen.getByLabelText('Show'), 'reading');
    await screen.findByText('Dune');

    await user.selectOptions(screen.getByLabelText('Status of Dune'), 'done');

    await waitFor(() => expect(screen.queryByText('Dune')).toBeNull());
  });
});
