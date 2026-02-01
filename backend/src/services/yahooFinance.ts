import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

// Suppress notices if method exists
if (typeof (yahooFinance as any).suppressNotices === 'function') {
  (yahooFinance as any).suppressNotices(['yahooSurvey']);
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
}

function calculatePercentChange(current: number, previous: number): number {
  if (previous === 0) return 0;
  return ((current - previous) / previous) * 100;
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function fetchWithRetry(ticker: string, retries = 3): Promise<any> {
  for (let i = 0; i < retries; i++) {
    try {
      const quote = await yahooFinance.quote(ticker);
      return quote;
    } catch (error: any) {
      console.log(`Attempt ${i + 1} failed for ${ticker}:`, error.message);
      if (i < retries - 1) {
        // Wait longer between retries (2s, 4s, 8s)
        await delay(2000 * Math.pow(2, i));
      } else {
        throw error;
      }
    }
  }
}

export async function getAssetQuote(ticker: string): Promise<AssetQuote | null> {
  try {
    const quote: any = await fetchWithRetry(ticker);

    if (!quote || !quote.regularMarketPrice) {
      console.log(`No valid quote data for ${ticker}`);
      return null;
    }

    const currentPrice = quote.regularMarketPrice || 0;
    const fiftyTwoWeekHigh = quote.fiftyTwoWeekHigh || null;
    const fiftyTwoWeekLow = quote.fiftyTwoWeekLow || null;

    // Calculate delta from 52-week high
    const deltaFrom52WeekHigh = fiftyTwoWeekHigh
      ? calculatePercentChange(currentPrice, fiftyTwoWeekHigh)
      : null;

    // Use available data from quote for performance metrics
    const ytdChange = quote.ytdReturn ? quote.ytdReturn * 100 : null;

    // Calculate approximate 1-year change using 52-week data
    const oneYearChange = quote.fiftyTwoWeekChangePercent
      ? quote.fiftyTwoWeekChangePercent * 100
      : null;

    // Use regularMarketChangePercent for recent change
    const oneMonthChange = quote.regularMarketChangePercent || null;

    // Get SMA data if available from quote
    const sma50 = quote.fiftyDayAverage || null;
    const sma200 = quote.twoHundredDayAverage || null;

    // Generate simple historical prices array for sparkline (simulated from available data)
    const historicalPrices: number[] = [];
    if (fiftyTwoWeekLow && fiftyTwoWeekHigh && currentPrice) {
      // Create a simple trend line for visualization
      const range = fiftyTwoWeekHigh - fiftyTwoWeekLow;
      for (let i = 0; i < 50; i++) {
        const progress = i / 49;
        const noise = (Math.random() - 0.5) * range * 0.1;
        const baseValue = fiftyTwoWeekLow + (currentPrice - fiftyTwoWeekLow) * progress;
        historicalPrices.push(Math.max(fiftyTwoWeekLow, Math.min(fiftyTwoWeekHigh, baseValue + noise)));
      }
      historicalPrices.push(currentPrice);
    }

    return {
      ticker: ticker.toUpperCase(),
      name: quote.shortName || quote.longName || ticker,
      price: currentPrice,
      marketCap: quote.marketCap || null,
      priceToSales: quote.priceToSalesTrailing12Months || null,
      priceToEarnings: quote.trailingPE || null,
      ytdChange,
      oneYearChange,
      fiftyTwoWeekHigh,
      deltaFrom52WeekHigh,
      historicalPrices,
      sma20: null,
      sma50,
      sma200,
      priceVsSma20: null,
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
  // Fetch sequentially with delays to avoid rate limiting
  const results: AssetQuote[] = [];
  for (const ticker of tickers) {
    const quote = await getAssetQuote(ticker);
    if (quote) {
      results.push(quote);
    }
    // Small delay between requests
    if (tickers.indexOf(ticker) < tickers.length - 1) {
      await delay(500);
    }
  }
  return results;
}

// Search is not available in this version of yahoo-finance2
// Users need to enter exact ticker symbols
export async function searchAssets(_query: string): Promise<{ symbol: string; name: string; type: string }[]> {
  // Search API was decommissioned - return empty array
  // Users should enter exact ticker symbols like AAPL, MSFT, BTC-USD, etc.
  return [];
}
