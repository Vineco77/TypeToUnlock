import express from 'express';
import type { Express } from 'express';
import { analyzeText } from './analyze';
import { lookupTerm, UpstreamTimeoutError } from './dictionary';
import { TtlCache } from './cache';
import type { DictResult } from './dictionary';

const DICTIONARY_CACHE = new TtlCache<DictResult | null>(24 * 60 * 60 * 1000);

export function createApp(): Express {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
  });

  app.post('/api/analyze', (req, res) => {
    const text = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
    if (!text) {
      res.status(400).json({ error: 'Field "text" (non-empty string) is required.' });
      return;
    }
    res.json(analyzeText(text));
  });

  app.get('/api/dictionary', async (req, res) => {
    const term = typeof req.query['term'] === 'string' ? req.query['term'].trim() : '';
    if (!term) {
      res.status(400).json({ error: 'Query parameter "term" is required.' });
      return;
    }

    const cacheKey = term.toLowerCase();
    const cached = DICTIONARY_CACHE.get(cacheKey);
    if (cached !== undefined) {
      if (cached === null) {
        res.status(404).json({ error: `No entry found for "${term}".` });
        return;
      }
      res.json(cached);
      return;
    }

    try {
      const result = await lookupTerm(term);
      DICTIONARY_CACHE.set(cacheKey, result);
      if (result === null) {
        res.status(404).json({ error: `No entry found for "${term}".` });
        return;
      }
      res.json(result);
    } catch (error) {
      if (error instanceof UpstreamTimeoutError) {
        res.status(504).json({ error: 'Dictionary upstream timed out.' });
        return;
      }
      res.status(502).json({ error: 'Dictionary upstream failed.' });
    }
  });

  return app;
}
