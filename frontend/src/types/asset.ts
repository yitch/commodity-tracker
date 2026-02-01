export interface Asset {
  id: number;
  ticker: string;
  name: string;
  type: string;
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

export type SortField =
  | 'ticker'
  | 'name'
  | 'price'
  | 'marketCap'
  | 'priceToSales'
  | 'priceToEarnings'
  | 'ytdChange'
  | 'oneYearChange'
  | 'deltaFrom52WeekHigh';

export type SortDirection = 'asc' | 'desc';
