import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import broadcastsRouter from './routes/broadcasts.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

app.use('/api/broadcasts', broadcastsRouter);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

export default app;
