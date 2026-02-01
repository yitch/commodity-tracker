import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getAssetQuote, getMultipleAssetQuotes, searchAssets } from '../services/yahooFinance.js';

const router = Router();
const prisma = new PrismaClient();

// Get all tracked assets with current data
router.get('/', async (req: Request, res: Response) => {
  try {
    const assets = await prisma.asset.findMany({
      orderBy: { createdAt: 'asc' },
    });

    if (assets.length === 0) {
      res.json([]);
      return;
    }

    const tickers = assets.map((a) => a.ticker);
    const quotes = await getMultipleAssetQuotes(tickers);

    // Merge database info with live quotes
    const result = assets.map((asset) => {
      const quote = quotes.find((q) => q.ticker.toUpperCase() === asset.ticker.toUpperCase());
      return {
        id: asset.id,
        ticker: asset.ticker,
        type: asset.type,
        ...quote,
      };
    });

    res.json(result);
  } catch (error) {
    console.error('Error fetching assets:', error);
    res.status(500).json({ error: 'Failed to fetch assets' });
  }
});

// Add new asset to watchlist
router.post('/', async (req: Request, res: Response) => {
  try {
    const { ticker, type = 'stock' } = req.body;

    if (!ticker) {
      res.status(400).json({ error: 'Ticker is required' });
      return;
    }

    const upperTicker = ticker.toUpperCase();

    // Check if asset already exists
    const existing = await prisma.asset.findUnique({
      where: { ticker: upperTicker },
    });

    if (existing) {
      res.status(409).json({ error: 'Asset already in watchlist' });
      return;
    }

    // Verify ticker exists by fetching quote
    const quote = await getAssetQuote(upperTicker);
    if (!quote) {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }

    // Create in database
    const asset = await prisma.asset.create({
      data: {
        ticker: upperTicker,
        name: quote.name,
        type,
      },
    });

    res.status(201).json({
      id: asset.id,
      ticker: asset.ticker,
      type: asset.type,
      ...quote,
    });
  } catch (error) {
    console.error('Error adding asset:', error);
    res.status(500).json({ error: 'Failed to add asset' });
  }
});

// Remove asset from watchlist
router.delete('/:ticker', async (req: Request, res: Response) => {
  try {
    const { ticker } = req.params;

    const asset = await prisma.asset.findUnique({
      where: { ticker: ticker.toUpperCase() },
    });

    if (!asset) {
      res.status(404).json({ error: 'Asset not found in watchlist' });
      return;
    }

    await prisma.asset.delete({
      where: { ticker: ticker.toUpperCase() },
    });

    res.json({ message: 'Asset removed from watchlist' });
  } catch (error) {
    console.error('Error removing asset:', error);
    res.status(500).json({ error: 'Failed to remove asset' });
  }
});

// Get single asset quote
router.get('/:ticker', async (req: Request, res: Response) => {
  try {
    const { ticker } = req.params;
    const quote = await getAssetQuote(ticker);

    if (!quote) {
      res.status(404).json({ error: 'Asset not found' });
      return;
    }

    res.json(quote);
  } catch (error) {
    console.error('Error fetching asset:', error);
    res.status(500).json({ error: 'Failed to fetch asset' });
  }
});

// Search for assets
router.get('/search/:query', async (req: Request, res: Response) => {
  try {
    const { query } = req.params;
    const results = await searchAssets(query);
    res.json(results);
  } catch (error) {
    console.error('Error searching:', error);
    res.status(500).json({ error: 'Search failed' });
  }
});

export default router;
