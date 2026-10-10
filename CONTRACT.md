# API Contract — Reading List

Base: same origin. Storage: in-memory list, module-level, no DB.

## Book object (exact field names)
{
  "id": "uuid-string",
  "title": "string, required, non-empty",
  "author": "string, optional, default ''",
  "status": "to-read" | "reading" | "done"
}

## Endpoints
POST /api/books
  body: {"title": str (required), "author": str (optional), "status": str (optional, default "to-read")}
  201 -> the created Book object
  400 -> {"error": "title is required"} | {"error": "status must be one of: to-read, reading, done"}

GET /api/books?status=<optional>
  200 -> {"books": [Book, ...]}
  400 -> {"error": "status must be one of: to-read, reading, done"}

PATCH /api/books/{id}
  body: {"status": str (required)}
  200 -> updated Book
  404 -> {"error": "book not found"}
  400 -> {"error": "status must be one of: to-read, reading, done"}

GET /api/books/stats
  200 -> {"counts": {"to-read": int, "reading": int, "done": int}}
  All three keys always present, zero when empty.

## Rules
- Status values are lowercase with a hyphen, exactly: to-read, reading, done
- Errors always: {"error": "<message>"} with the HTTP status above
- UI is served at GET / from the same app