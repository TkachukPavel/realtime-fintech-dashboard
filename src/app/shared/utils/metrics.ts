import { tickerFor } from '../../core/constants/tickers';
import { InstrumentMetrics } from '../../core/types/instrument-metrics.type';
import { MarketUpdate } from '../../core/types/market-update.type';

export function calculateMetrics(
  instrument: InstrumentMetrics,
  updates: MarketUpdate[],
): InstrumentMetrics {
  if (updates.length === 0) {
    return { ...instrument };
  }

  const lastTrade = updates[updates.length - 1];
  const lastTradedPrice = lastTrade.priceCents;
  const lastBid = lastTrade.bidCents;
  const lastAsk = lastTrade.askCents;
  const lastAskQty = lastTrade.askQuantity;
  const lastBidQty = lastTrade.bidQuantity;

  let extraTradeVolume = 0;
  let extraNotional = 0;

  for (const update of updates) {
    extraTradeVolume += update.tradeQuantity;
    extraNotional += update.tradeQuantity * update.priceCents;
  }

  const bidAskSpread = lastAsk - lastBid;
  const totalBookQuantity = lastBidQty + lastAskQty;
  const orderBookImbalance =
    totalBookQuantity === 0 ? null : (lastBidQty - lastAskQty) / (lastBidQty + lastAskQty);

  const tradingVolume = (instrument.tradingVolume ?? 0) + extraTradeVolume;
  const notional = (instrument?.notionalCents ?? 0) + extraNotional;
  const vwap = tradingVolume === 0 ? null : notional / tradingVolume;

  return {
    ...instrument,
    lastTradedPrice,
    bidAskSpread,
    tradingVolume,
    vwap,
    orderBookImbalance,
    notionalCents: notional,
  };
}

export function createEmptyMetric(id: number): InstrumentMetrics {
  return {
    ticker: tickerFor(id),
    lastTradedPrice: null,
    bidAskSpread: null,
    tradingVolume: 0,
    notionalCents: 0,
    vwap: null,
    orderBookImbalance: null,
  };
}
