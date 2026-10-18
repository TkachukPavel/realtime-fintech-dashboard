export type InstrumentMetrics = {
  ticker: string;
  lastTradedPrice: number | null;
  bidAskSpread: number | null;
  tradingVolume: number;
  vwap: number | null;
  orderBookImbalance: number | null;
  tradexprice: number;
};
