import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import broadcastsRouter from './routes/broadcasts.js';
import { init as initBroadcastFetcher } from './services/broadcastFetcher.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({ origin: 'http://localhost:5173' }));
app.use(express.json());

app.use('/api/broadcasts', broadcastsRouter);

initBroadcastFetcher();

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
