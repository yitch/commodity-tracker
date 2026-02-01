import { Router, Request, Response } from 'express';
import { PrismaClient } from '@prisma/client';
import { getAssetQuote, getMultipleAssetQuotes, searchAssets } from '../services/yahooFinance.js';
import { validateBody, validateParams } from '../middleware/validate.js';
import { addAssetSchema, tickerParamSchema, searchParamSchema } from '../validation/schemas.js';
import { asyncHandler, AppError } from '../middleware/errorHandler.js';

const router = Router();
const prisma = new PrismaClient();

// Limit max assets per user to prevent abuse
const MAX_ASSETS = 50;

// Get all tracked assets with current data
router.get('/', asyncHandler(async (_req: Request, res: Response) => {
  const assets = await prisma.asset.findMany({
    orderBy: { createdAt: 'asc' },
    take: MAX_ASSETS,
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
}));

// Search for assets (must be before /:ticker to avoid conflict)
router.get('/search/:query', validateParams(searchParamSchema), asyncHandler(async (req: Request, res: Response) => {
  const { query } = req.params;
  const results = await searchAssets(query);
  res.json(results);
}));

// Get single asset quote
router.get('/:ticker', validateParams(tickerParamSchema), asyncHandler(async (req: Request, res: Response) => {
  const tickerParam = req.params.ticker;
  const quote = await getAssetQuote(tickerParam);

  if (!quote) {
    throw new AppError(404, 'Asset not found');
  }

  res.json(quote);
}));

// Add new asset to watchlist
router.post('/', validateBody(addAssetSchema), asyncHandler(async (req: Request, res: Response) => {
  const { ticker: inputTicker, type } = req.body;

  // Check asset count limit
  const assetCount = await prisma.asset.count();
  if (assetCount >= MAX_ASSETS) {
    throw new AppError(400, `Maximum of ${MAX_ASSETS} assets allowed`);
  }

  // Check if asset already exists
  const existing = await prisma.asset.findUnique({
    where: { ticker: inputTicker },
  });

  if (existing) {
    throw new AppError(409, 'Asset already in watchlist');
  }

  // Verify ticker exists by fetching quote
  const quote = await getAssetQuote(inputTicker);
  if (!quote) {
    throw new AppError(404, 'Asset not found on market');
  }

  // Create in database
  const asset = await prisma.asset.create({
    data: {
      ticker: inputTicker,
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
}));

// Remove asset from watchlist
router.delete('/:ticker', validateParams(tickerParamSchema), asyncHandler(async (req: Request, res: Response) => {
  const tickerParam = req.params.ticker;

  const asset = await prisma.asset.findUnique({
    where: { ticker: tickerParam },
  });

  if (!asset) {
    throw new AppError(404, 'Asset not found in watchlist');
  }

  await prisma.asset.delete({
    where: { ticker: tickerParam },
  });

  res.json({ message: 'Asset removed from watchlist' });
}));

export default router;
