import { Router } from 'express';
import { getCachedBroadcasts } from '../services/broadcastFetcher.js';

const router = Router();

router.get('/', (req, res) => {
  const { type } = req.query;

  if (type !== 'live' && type !== 'hs') {
    return res.status(400).json({ error: "type must be 'live' or 'hs'" });
  }

  res.json(getCachedBroadcasts(type));
});

export default router;
