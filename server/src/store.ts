import { v4 as uuidv4 } from 'uuid';
import type { Book, BookStatus, StatusCounts } from '../../shared/types.js';

let books: Book[] = [];

export function addBook(input: { title: string; author?: string; status?: BookStatus }): Book {
  const book: Book = {
    id: uuidv4(),
    title: input.title,
    author: input.author ?? '',
    status: input.status ?? 'to-read',
    createdAt: new Date().toISOString(),
  };
  books.push(book);
  return book;
}

export function getBooks(status?: BookStatus): Book[] {
  return status ? books.filter((book) => book.status === status) : [...books];
}

export function updateStatus(id: string, status: BookStatus): Book | null {
  const book = books.find((b) => b.id === id);
  if (!book) return null;
  book.status = status;
  return book;
}

export function getStats(): StatusCounts {
  const counts: StatusCounts = { 'to-read': 0, reading: 0, done: 0 };
  for (const book of books) counts[book.status]++;
  return counts;
}

// Tests only.
export function resetStore(): void {
  books = [];
}
