/* eslint-disable @typescript-eslint/no-explicit-any */
import yahooFinance from 'yahoo-finance2';

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

function calculateSMA(prices: number[], period: number): number | null {
  if (prices.length < period) return null;
  const relevantPrices = prices.slice(-period);
  return relevantPrices.reduce((a, b) => a + b, 0) / period;
}

function calculatePercentChange(current: number, previous: number): number {
  return ((current - previous) / previous) * 100;
}

export async function getAssetQuote(ticker: string): Promise<AssetQuote | null> {
  try {
    // Get current quote
    const quote: any = await yahooFinance.quote(ticker);

    // Get historical data for charts and calculations (1 year)
    const endDate = new Date();
    const startDate = new Date();
    startDate.setFullYear(startDate.getFullYear() - 1);

    let historicalPrices: number[] = [];

    try {
      const historical: any[] = await (yahooFinance as any).historical(ticker, {
        period1: startDate,
        period2: endDate,
        interval: '1d',
      });

      historicalPrices = historical
        .filter((q: any) => q.close !== null && q.close !== undefined)
        .map((q: any) => q.close as number);
    } catch {
      // If historical fails, continue with empty array
      console.log(`Could not fetch historical data for ${ticker}`);
    }

    const currentPrice = quote.regularMarketPrice || 0;

    // Calculate SMAs
    const sma20 = calculateSMA(historicalPrices, 20);
    const sma50 = calculateSMA(historicalPrices, 50);
    const sma200 = calculateSMA(historicalPrices, 200);

    // Calculate YTD change
    let ytdChange: number | null = null;
    try {
      const yearStart = new Date(new Date().getFullYear(), 0, 1);
      const ytdHistorical: any[] = await (yahooFinance as any).historical(ticker, {
        period1: yearStart,
        period2: endDate,
        interval: '1d',
      });

      const ytdPrices = ytdHistorical.filter((q: any) => q.close !== null);
      const ytdStartPrice = ytdPrices.length > 0 ? ytdPrices[0].close : null;
      ytdChange = ytdStartPrice ? calculatePercentChange(currentPrice, ytdStartPrice) : null;
    } catch {
      // Continue without YTD
    }

    // Calculate 1-year change
    const oneYearStartPrice = historicalPrices.length > 0 ? historicalPrices[0] : null;
    const oneYearChange = oneYearStartPrice ? calculatePercentChange(currentPrice, oneYearStartPrice) : null;

    // Calculate 1-month change
    const oneMonthPrices = historicalPrices.slice(-22);
    const oneMonthStartPrice = oneMonthPrices.length > 0 ? oneMonthPrices[0] : null;
    const oneMonthChange = oneMonthStartPrice ? calculatePercentChange(currentPrice, oneMonthStartPrice) : null;

    // Calculate delta from 52-week high
    const fiftyTwoWeekHigh = quote.fiftyTwoWeekHigh || null;
    const deltaFrom52WeekHigh = fiftyTwoWeekHigh
      ? calculatePercentChange(currentPrice, fiftyTwoWeekHigh)
      : null;

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
  const results = await Promise.all(tickers.map(getAssetQuote));
  return results.filter((result): result is AssetQuote => result !== null);
}

export async function searchAssets(query: string): Promise<{ symbol: string; name: string; type: string }[]> {
  try {
    const results: any = await yahooFinance.search(query);
    return results.quotes
      .filter((q: any) => q.symbol && q.shortname)
      .slice(0, 10)
      .map((q: any) => ({
        symbol: q.symbol,
        name: q.shortname || q.symbol,
        type: q.quoteType || 'unknown',
      }));
  } catch (error) {
    console.error('Error searching assets:', error);
    return [];
  }
}
