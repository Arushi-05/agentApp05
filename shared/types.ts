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
