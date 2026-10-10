import express from 'express';
import { readRouter } from './routes/read.js';

export const app = express();

app.use(express.json());

// Read routes first: /api/books/stats must be registered before any /api/books/:id route.
app.use(readRouter);

const port = Number(process.env.PORT) || 3000;
app.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
