// Massive.com API (formerly Polygon.io) service for market data

const MASSIVE_BASE_URL = 'https://api.massive.com';

// Simple in-memory cache with TTL
const cache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL = 60000; // 1 minute cache

export interface AssetQuote {
  ticker: string;
  name: string;
  price: number;
  marketCap: number | null;
  priceToSales: number | null;
  priceToEarnings: number | null;
  ytdChange: number | null;
  oneYearChange: number | null;
  fiftyTwoWeekHigh: number | null;
  deltaFrom52WeekHigh: number | null;
  historicalPrices: number[];
  sma20: number | null;
  sma50: number | null;
  sma200: number | null;
  priceVsSma20: 'above' | 'below' | null;
  priceVsSma50: 'above' | 'below' | null;
  priceVsSma200: 'above' | 'below' | null;
  oneMonthChange: number | null;
}

export interface SearchResult {
  symbol: string;
  name: string;
  type: string;
}

function getApiKey(): string {
  const apiKey = process.env.MASSIVE_API_KEY;
  if (!apiKey) {
    throw new Error('MASSIVE_API_KEY environment variable is not set');
  }
  return apiKey;
}

function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

function getCached<T>(key: string): T | null {
  const cached = cache.get(key);
  if (cached && cached.expiry > Date.now()) {
    return cached.data as T;
  }
  cache.delete(key);
  return null;
}

function setCache(key: string, data: any): void {
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

async function fetchWithRetry<T>(url: string, cacheKey?: string): Promise<T | null> {
  // Check cache first
  if (cacheKey) {
    const cached = getCached<T>(cacheKey);
    if (cached) return cached;
  }

  try {
    const response = await fetch(url);

    if (response.status === 429) {
      console.log('Rate limited');
      return null;
    }

    if (!response.ok) {
      console.log(`API error: ${response.status} ${response.statusText}`);
      return null;
    }

    const data = await response.json() as T;
    if (cacheKey) {
      setCache(cacheKey, data);
    }
    return data;
  } catch (error: any) {
    console.log(`Fetch failed:`, error.message);
    return null;
  }
}

function getDateString(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

// Get ticker snapshot (includes current price) - uses v2 snapshot endpoint
async function getTickerSnapshot(ticker: string): Promise<any> {
  const apiKey = getApiKey();
  const url = `${MASSIVE_BASE_URL}/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}?apiKey=${apiKey}`;
  const data = await fetchWithRetry<any>(url, `snapshot:${ticker}`);
  return data?.ticker || null;
}

// Get ticker details (name, market cap)
async function getTickerDetails(ticker: string): Promise<any> {
  const apiKey = getApiKey();
  const url = `${MASSIVE_BASE_URL}/v3/reference/tickers/${ticker}?apiKey=${apiKey}`;
  const data = await fetchWithRetry<any>(url, `details:${ticker}`);
  return data?.results || null;
}

// Get historical bars - optimized to get less data for faster response
async function getHistoricalBars(ticker: string, from: string, to: string): Promise<any[]> {
  const apiKey = getApiKey();
  const url = `${MASSIVE_BASE_URL}/v2/aggs/ticker/${ticker}/range/1/day/${from}/${to}?adjusted=true&sort=asc&limit=260&apiKey=${apiKey}`;
  const data = await fetchWithRetry<any>(url, `bars:${ticker}:${from}:${to}`);
  return data?.results || [];
}

// Calculate SMA from historical data instead of making separate API calls
function calculateSMA(bars: any[], period: number): number | null {
  if (bars.length < period) return null;
  const recentBars = bars.slice(-period);
  const sum = recentBars.reduce((acc: number, bar: any) => acc + bar.c, 0);
  return sum / period;
}

export async function getAssetQuote(ticker: string): Promise<AssetQuote | null> {
  try {
    const normalizedTicker = ticker.toUpperCase();

    // Handle crypto tickers
    let massiveTicker = normalizedTicker;
    if (normalizedTicker.endsWith('-USD')) {
      massiveTicker = `X:${normalizedTicker.replace('-USD', 'USD')}`;
    }

    // Get dates
    const today = getDateString(0);
    const oneYearAgo = getDateString(365);
    const ytdStart = `${new Date().getFullYear()}-01-01`;
    const oneMonthAgo = getDateString(30);

    // Fetch all data in parallel for speed
    const [snapshot, details, historicalBars] = await Promise.all([
      getTickerSnapshot(massiveTicker),
      getTickerDetails(massiveTicker),
      getHistoricalBars(massiveTicker, oneYearAgo, today),
    ]);

    if (!snapshot && !details && historicalBars.length === 0) {
      console.log(`No data found for ${ticker}`);
      return null;
    }

    // Calculate current price
    let currentPrice = 0;
    if (snapshot?.day?.c) {
      currentPrice = snapshot.day.c;
    } else if (snapshot?.prevDay?.c) {
      currentPrice = snapshot.prevDay.c;
    } else if (historicalBars.length > 0) {
      currentPrice = historicalBars[historicalBars.length - 1].c;
    }

    if (currentPrice === 0) {
      console.log(`No price data for ${ticker}`);
      return null;
    }

    // Calculate 52-week high
    let fiftyTwoWeekHigh: number | null = null;
    if (historicalBars.length > 0) {
      fiftyTwoWeekHigh = Math.max(...historicalBars.map((b: any) => b.h));
    }

    const deltaFrom52WeekHigh = fiftyTwoWeekHigh
      ? calculatePercentChange(currentPrice, fiftyTwoWeekHigh)
      : null;

    // Calculate YTD change
    let ytdChange: number | null = null;
    const ytdBar = historicalBars.find((b: any) => {
      const barDate = new Date(b.t).toISOString().split('T')[0];
      return barDate >= ytdStart;
    });
    if (ytdBar) {
      ytdChange = calculatePercentChange(currentPrice, ytdBar.o);
    }

    // Calculate 1-year change
    let oneYearChange: number | null = null;
    if (historicalBars.length > 0) {
      oneYearChange = calculatePercentChange(currentPrice, historicalBars[0].c);
    }

    // Calculate 1-month change
    let oneMonthChange: number | null = null;
    const oneMonthBar = historicalBars.find((b: any) => {
      const barDate = new Date(b.t).toISOString().split('T')[0];
      return barDate >= oneMonthAgo;
    });
    if (oneMonthBar) {
      oneMonthChange = calculatePercentChange(currentPrice, oneMonthBar.o);
    }

    // Get last 50 prices for sparkline
    const historicalPrices = historicalBars.slice(-50).map((b: any) => b.c);

    // Calculate SMAs from historical data (no extra API calls!)
    const sma20 = calculateSMA(historicalBars, 20);
    const sma50 = calculateSMA(historicalBars, 50);
    const sma200 = calculateSMA(historicalBars, 200);

    return {
      ticker: normalizedTicker,
      name: details?.name || normalizedTicker,
      price: currentPrice,
      marketCap: details?.market_cap || null,
      priceToSales: null, // Would need Financial Modeling Prep API
      priceToEarnings: null, // Would need Financial Modeling Prep API
      ytdChange,
      oneYearChange,
      fiftyTwoWeekHigh,
      deltaFrom52WeekHigh,
      historicalPrices,
      sma20,
      sma50,
      sma200,
      priceVsSma20: sma20 ? (currentPrice > sma20 ? 'above' : 'below') : null,
      priceVsSma50: sma50 ? (currentPrice > sma50 ? 'above' : 'below') : null,
      priceVsSma200: sma200 ? (currentPrice > sma200 ? 'above' : 'below') : null,
      oneMonthChange,
    };
  } catch (error) {
    console.error(`Error fetching data for ${ticker}:`, error);
    return null;
  }
}

export async function getMultipleAssetQuotes(tickers: string[]): Promise<AssetQuote[]> {
  // Fetch all quotes in parallel for maximum speed
  const promises = tickers.map(ticker => getAssetQuote(ticker));
  const results = await Promise.all(promises);
  return results.filter((quote): quote is AssetQuote => quote !== null);
}

// Search for tickers - supports autocomplete
export async function searchAssets(query: string): Promise<SearchResult[]> {
  try {
    const apiKey = getApiKey();
    const url = `${MASSIVE_BASE_URL}/v3/reference/tickers?search=${encodeURIComponent(query)}&active=true&limit=10&apiKey=${apiKey}`;

    const data = await fetchWithRetry<any>(url, `search:${query}`);

    if (!data?.results) {
      return [];
    }

    return data.results.map((item: any) => ({
      symbol: item.ticker,
      name: item.name || item.ticker,
      type: item.type || item.market || 'stock',
    }));
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}
