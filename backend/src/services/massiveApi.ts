// Massive.com API (formerly Polygon.io) service for market data

const MASSIVE_BASE_URL = 'https://api.massive.com';

// Simple in-memory cache with TTL and size limit
const cache = new Map<string, { data: any; expiry: number }>();
const CACHE_TTL = 60000; // 1 minute cache
const MAX_CACHE_SIZE = 100; // Prevent memory bloat

// Request timeout for external API calls
const API_TIMEOUT = 10000; // 10 seconds

export type SignalType = 'strong_buy' | 'buy' | 'hold' | 'sell' | 'strong_sell';

export interface TradingSignal {
  signal: SignalType;
  score: number; // -100 to +100
  reasons: string[];
}

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
  // Trading signals
  shortTermSignal: TradingSignal | null;
  longTermSignal: TradingSignal | null;
  rsi: number | null;
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
  // Enforce cache size limit - evict oldest entries if needed
  if (cache.size >= MAX_CACHE_SIZE) {
    const keysToDelete: string[] = [];
    for (const [k, v] of cache.entries()) {
      if (v.expiry < Date.now() || keysToDelete.length < cache.size - MAX_CACHE_SIZE + 1) {
        keysToDelete.push(k);
      }
    }
    keysToDelete.forEach(k => cache.delete(k));
  }
  cache.set(key, { data, expiry: Date.now() + CACHE_TTL });
}

// Sanitize ticker to prevent injection attacks
function sanitizeTicker(ticker: string): string {
  // Only allow alphanumeric, dots, hyphens, colons (for crypto X:BTCUSD), and ^
  return ticker.replace(/[^A-Za-z0-9.\-:^]/g, '').substring(0, 20).toUpperCase();
}

async function fetchWithRetry<T>(url: string, cacheKey?: string): Promise<T | null> {
  if (cacheKey) {
    const cached = getCached<T>(cacheKey);
    if (cached) return cached;
  }

  try {
    // Add timeout to prevent hanging requests
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), API_TIMEOUT);

    const response = await fetch(url, { signal: controller.signal });
    clearTimeout(timeoutId);

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
    if (error.name === 'AbortError') {
      console.log('Request timed out');
    } else {
      console.log(`Fetch failed:`, error.message);
    }
    return null;
  }
}

function getDateString(daysAgo: number): string {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString().split('T')[0];
}

async function getTickerSnapshot(ticker: string): Promise<any> {
  const apiKey = getApiKey();
  const url = `${MASSIVE_BASE_URL}/v2/snapshot/locale/us/markets/stocks/tickers/${ticker}?apiKey=${apiKey}`;
  const data = await fetchWithRetry<any>(url, `snapshot:${ticker}`);
  return data?.ticker || null;
}

async function getTickerDetails(ticker: string): Promise<any> {
  const apiKey = getApiKey();
  const url = `${MASSIVE_BASE_URL}/v3/reference/tickers/${ticker}?apiKey=${apiKey}`;
  const data = await fetchWithRetry<any>(url, `details:${ticker}`);
  return data?.results || null;
}

async function getHistoricalBars(ticker: string, from: string, to: string): Promise<any[]> {
  const apiKey = getApiKey();
  const url = `${MASSIVE_BASE_URL}/v2/aggs/ticker/${ticker}/range/1/day/${from}/${to}?adjusted=true&sort=asc&limit=260&apiKey=${apiKey}`;
  const data = await fetchWithRetry<any>(url, `bars:${ticker}:${from}:${to}`);
  return data?.results || [];
}

function calculateSMA(bars: any[], period: number): number | null {
  if (bars.length < period) return null;
  const recentBars = bars.slice(-period);
  const sum = recentBars.reduce((acc: number, bar: any) => acc + bar.c, 0);
  return sum / period;
}

// Calculate RSI (Relative Strength Index)
function calculateRSI(bars: any[], period: number = 14): number | null {
  if (bars.length < period + 1) return null;

  const recentBars = bars.slice(-(period + 1));
  let gains = 0;
  let losses = 0;

  for (let i = 1; i < recentBars.length; i++) {
    const change = recentBars[i].c - recentBars[i - 1].c;
    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }

  const avgGain = gains / period;
  const avgLoss = losses / period;

  if (avgLoss === 0) return 100;

  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

// Calculate short-term (1 week) trading signal using multiple strategies
function calculateShortTermSignal(
  price: number,
  sma20: number | null,
  sma50: number | null,
  rsi: number | null,
  oneMonthChange: number | null,
  deltaFrom52WeekHigh: number | null,
  bars: any[]
): TradingSignal {
  let score = 0;
  const reasons: string[] = [];

  // Strategy 1: RSI (weight: 25%)
  if (rsi !== null) {
    if (rsi < 30) {
      score += 25;
      reasons.push('RSI oversold (<30)');
    } else if (rsi < 40) {
      score += 15;
      reasons.push('RSI approaching oversold');
    } else if (rsi > 70) {
      score -= 25;
      reasons.push('RSI overbought (>70)');
    } else if (rsi > 60) {
      score -= 10;
      reasons.push('RSI approaching overbought');
    }
  }

  // Strategy 2: Price vs SMA20 (weight: 20%)
  if (sma20 !== null) {
    const pctFromSma20 = ((price - sma20) / sma20) * 100;
    if (pctFromSma20 > 5) {
      score -= 15;
      reasons.push('Price >5% above SMA20');
    } else if (pctFromSma20 < -5) {
      score += 20;
      reasons.push('Price >5% below SMA20 (potential bounce)');
    } else if (pctFromSma20 > 0) {
      score += 5;
      reasons.push('Price above SMA20');
    }
  }

  // Strategy 3: Short-term momentum (weight: 20%)
  if (bars.length >= 5) {
    const fiveDayChange = calculatePercentChange(price, bars[bars.length - 5].c);
    if (fiveDayChange < -5) {
      score += 15;
      reasons.push('5-day dip (potential rebound)');
    } else if (fiveDayChange > 5) {
      score -= 10;
      reasons.push('5-day rally (potential pullback)');
    }
  }

  // Strategy 4: Volume trend (weight: 15%)
  if (bars.length >= 10) {
    const recentVolume = bars.slice(-5).reduce((sum: number, b: any) => sum + b.v, 0) / 5;
    const priorVolume = bars.slice(-10, -5).reduce((sum: number, b: any) => sum + b.v, 0) / 5;
    if (recentVolume > priorVolume * 1.5 && bars[bars.length - 1].c > bars[bars.length - 2].c) {
      score += 15;
      reasons.push('High volume buying');
    }
  }

  // Strategy 5: Support level proximity (weight: 20%)
  if (deltaFrom52WeekHigh !== null) {
    if (deltaFrom52WeekHigh < -30) {
      score += 15;
      reasons.push('Near 52-week support');
    } else if (deltaFrom52WeekHigh > -5) {
      score -= 10;
      reasons.push('Near 52-week high (resistance)');
    }
  }

  // Determine signal based on score
  let signal: SignalType;
  if (score >= 40) signal = 'strong_buy';
  else if (score >= 15) signal = 'buy';
  else if (score <= -40) signal = 'strong_sell';
  else if (score <= -15) signal = 'sell';
  else signal = 'hold';

  return { signal, score, reasons };
}

// Calculate long-term (2+ years) trading signal
function calculateLongTermSignal(
  price: number,
  sma50: number | null,
  sma200: number | null,
  oneYearChange: number | null,
  deltaFrom52WeekHigh: number | null,
  marketCap: number | null
): TradingSignal {
  let score = 0;
  const reasons: string[] = [];

  // Strategy 1: Golden/Death Cross (SMA50 vs SMA200) - weight: 30%
  if (sma50 !== null && sma200 !== null) {
    if (sma50 > sma200) {
      score += 25;
      reasons.push('Golden cross (SMA50 > SMA200)');
    } else {
      score -= 20;
      reasons.push('Death cross (SMA50 < SMA200)');
    }
  }

  // Strategy 2: Price vs SMA200 (long-term trend) - weight: 25%
  if (sma200 !== null) {
    const pctFromSma200 = ((price - sma200) / sma200) * 100;
    if (pctFromSma200 > 0 && pctFromSma200 < 20) {
      score += 20;
      reasons.push('Price in uptrend above SMA200');
    } else if (pctFromSma200 < -10) {
      score += 15;
      reasons.push('Price well below SMA200 (value opportunity)');
    } else if (pctFromSma200 > 40) {
      score -= 15;
      reasons.push('Price extended above SMA200');
    }
  }

  // Strategy 3: 52-week position (weight: 20%)
  if (deltaFrom52WeekHigh !== null) {
    if (deltaFrom52WeekHigh > -10) {
      score += 10;
      reasons.push('Near 52-week highs (momentum)');
    } else if (deltaFrom52WeekHigh < -40) {
      score += 15;
      reasons.push('Significant discount from highs');
    } else if (deltaFrom52WeekHigh < -20 && deltaFrom52WeekHigh > -40) {
      score += 10;
      reasons.push('Moderate pullback (entry opportunity)');
    }
  }

  // Strategy 4: Long-term performance (weight: 15%)
  if (oneYearChange !== null) {
    if (oneYearChange > 20 && oneYearChange < 100) {
      score += 15;
      reasons.push('Strong 1-year performance');
    } else if (oneYearChange < -20) {
      score -= 10;
      reasons.push('Weak 1-year performance');
    } else if (oneYearChange > 100) {
      score -= 5;
      reasons.push('Extended gains (caution)');
    }
  }

  // Strategy 5: Market cap consideration (weight: 10%)
  if (marketCap !== null) {
    if (marketCap > 200e9) {
      score += 10;
      reasons.push('Large cap (stability)');
    } else if (marketCap > 10e9) {
      score += 5;
      reasons.push('Mid cap');
    }
  }

  // Determine signal
  let signal: SignalType;
  if (score >= 40) signal = 'strong_buy';
  else if (score >= 15) signal = 'buy';
  else if (score <= -30) signal = 'strong_sell';
  else if (score <= -10) signal = 'sell';
  else signal = 'hold';

  return { signal, score, reasons };
}

export async function getAssetQuote(ticker: string): Promise<AssetQuote | null> {
  try {
    // Sanitize input to prevent injection attacks
    const normalizedTicker = sanitizeTicker(ticker);
    if (!normalizedTicker) {
      console.log('Invalid ticker after sanitization');
      return null;
    }

    let massiveTicker = normalizedTicker;
    if (normalizedTicker.endsWith('-USD')) {
      massiveTicker = `X:${normalizedTicker.replace('-USD', 'USD')}`;
    }

    const today = getDateString(0);
    const oneYearAgo = getDateString(365);
    const ytdStart = `${new Date().getFullYear()}-01-01`;
    const oneMonthAgo = getDateString(30);

    const [snapshot, details, historicalBars] = await Promise.all([
      getTickerSnapshot(massiveTicker),
      getTickerDetails(massiveTicker),
      getHistoricalBars(massiveTicker, oneYearAgo, today),
    ]);

    if (!snapshot && !details && historicalBars.length === 0) {
      console.log(`No data found for ${ticker}`);
      return null;
    }

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

    let fiftyTwoWeekHigh: number | null = null;
    if (historicalBars.length > 0) {
      fiftyTwoWeekHigh = Math.max(...historicalBars.map((b: any) => b.h));
    }

    const deltaFrom52WeekHigh = fiftyTwoWeekHigh
      ? calculatePercentChange(currentPrice, fiftyTwoWeekHigh)
      : null;

    let ytdChange: number | null = null;
    const ytdBar = historicalBars.find((b: any) => {
      const barDate = new Date(b.t).toISOString().split('T')[0];
      return barDate >= ytdStart;
    });
    if (ytdBar) {
      ytdChange = calculatePercentChange(currentPrice, ytdBar.o);
    }

    let oneYearChange: number | null = null;
    if (historicalBars.length > 0) {
      oneYearChange = calculatePercentChange(currentPrice, historicalBars[0].c);
    }

    let oneMonthChange: number | null = null;
    const oneMonthBar = historicalBars.find((b: any) => {
      const barDate = new Date(b.t).toISOString().split('T')[0];
      return barDate >= oneMonthAgo;
    });
    if (oneMonthBar) {
      oneMonthChange = calculatePercentChange(currentPrice, oneMonthBar.o);
    }

    const historicalPrices = historicalBars.slice(-50).map((b: any) => b.c);

    const sma20 = calculateSMA(historicalBars, 20);
    const sma50 = calculateSMA(historicalBars, 50);
    const sma200 = calculateSMA(historicalBars, 200);
    const rsi = calculateRSI(historicalBars);

    const marketCap = details?.market_cap || null;

    // Calculate trading signals
    const shortTermSignal = calculateShortTermSignal(
      currentPrice, sma20, sma50, rsi, oneMonthChange, deltaFrom52WeekHigh, historicalBars
    );

    const longTermSignal = calculateLongTermSignal(
      currentPrice, sma50, sma200, oneYearChange, deltaFrom52WeekHigh, marketCap
    );

    return {
      ticker: normalizedTicker,
      name: details?.name || normalizedTicker,
      price: currentPrice,
      marketCap,
      priceToSales: null,
      priceToEarnings: null,
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
      shortTermSignal,
      longTermSignal,
      rsi,
    };
  } catch (error) {
    console.error(`Error fetching data for ${ticker}:`, error);
    return null;
  }
}

export async function getMultipleAssetQuotes(tickers: string[]): Promise<AssetQuote[]> {
  const promises = tickers.map(ticker => getAssetQuote(ticker));
  const results = await Promise.all(promises);
  return results.filter((quote): quote is AssetQuote => quote !== null);
}

export async function searchAssets(query: string): Promise<SearchResult[]> {
  try {
    // Sanitize search query - allow alphanumeric, spaces, dots, hyphens
    const sanitizedQuery = query.replace(/[^A-Za-z0-9\s.\-]/g, '').substring(0, 50).trim();
    if (!sanitizedQuery) {
      return [];
    }

    const apiKey = getApiKey();
    const url = `${MASSIVE_BASE_URL}/v3/reference/tickers?search=${encodeURIComponent(sanitizedQuery)}&active=true&limit=10&apiKey=${apiKey}`;

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
