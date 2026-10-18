import { InstrumentMetrics } from '../../core/types/instrument-metrics.type';
import { MarketUpdate } from '../../core/types/market-update.type';
import { calculateMetrics } from './metrics';

describe('Metrics', () => {
  const marketUpdates: MarketUpdate[] = [
    {
      instrument: 'ALFA',
      priceCents: 10200,
      tradeQuantity: 30,
      bidCents: 10196,
      askCents: 10200,
      bidQuantity: 600,
      askQuantity: 400,
    },
    {
      instrument: 'ALFA',
      priceCents: 10204,
      tradeQuantity: 20,
      bidCents: 10200,
      askCents: 10204,
      bidQuantity: 550,
      askQuantity: 420,
    },
    {
      instrument: 'ALFA',
      priceCents: 10198,
      tradeQuantity: 15,
      bidCents: 10198,
      askCents: 10202,
      bidQuantity: 580,
      askQuantity: 390,
    },
    {
      instrument: 'ALFA',
      priceCents: 10202,
      tradeQuantity: 40,
      bidCents: 10198,
      askCents: 10202,
      bidQuantity: 610,
      askQuantity: 410,
    },
    {
      instrument: 'ALFA',
      priceCents: 10206,
      tradeQuantity: 25,
      bidCents: 10202,
      askCents: 10206,
      bidQuantity: 590,
      askQuantity: 430,
    },
  ];

  const emptyInstrument: InstrumentMetrics = {
    ticker: 'ALFA',
    lastTradedPrice: null,
    bidAskSpread: null,
    tradingVolume: 0,
    vwap: null,
    orderBookImbalance: null,
    tradexprice: 0,
  };

  it('returns unavailable metrics and zero volume before any updates arrive', () => {
    expect(calculateMetrics(emptyInstrument, [])).toEqual(emptyInstrument);
  });

  it('calculates the latest price, spread, volume, VWAP, and book imbalance', () => {
    const metrics = calculateMetrics(emptyInstrument, marketUpdates);

    expect(metrics.lastTradedPrice).toBe(10206);
    expect(metrics.bidAskSpread).toBe(4);
    expect(metrics.tradingVolume).toBe(130);
    expect(metrics.vwap).toBeCloseTo(10202.153846, 6);
    expect(metrics.orderBookImbalance).toBeCloseTo(160 / 1020, 10);
  });

  it('accumulates volume and VWAP across update batches', () => {
    const firstBatch = calculateMetrics(emptyInstrument, marketUpdates.slice(0, 2));
    const secondBatch = calculateMetrics(firstBatch, marketUpdates.slice(2));

    expect(firstBatch.tradingVolume).toBe(50);
    expect(secondBatch.tradingVolume).toBe(130);
    expect(secondBatch.vwap).toBeCloseTo(10202.153846, 6);
    expect(secondBatch.lastTradedPrice).toBe(10206);
  });

  it('does not include bid and ask quantities in trading volume', () => {
    const update: MarketUpdate = {
      instrument: 'ALFA',
      priceCents: 10200,
      tradeQuantity: 3,
      bidCents: 10198,
      askCents: 10202,
      bidQuantity: 6000,
      askQuantity: 4000,
    };

    expect(calculateMetrics(emptyInstrument, [update]).tradingVolume).toBe(3);
  });

  it('returns unavailable VWAP when cumulative trade volume is zero', () => {
    const update: MarketUpdate = {
      ...marketUpdates[0],
      tradeQuantity: 0,
    };

    const metrics = calculateMetrics(emptyInstrument, [update]);

    expect(metrics.tradingVolume).toBe(0);
    expect(metrics.vwap).toBeNull();
  });

  it('returns unavailable imbalance when bid and ask quantities sum to zero', () => {
    const update: MarketUpdate = {
      ...marketUpdates[0],
      bidQuantity: 0,
      askQuantity: 0,
    };

    expect(calculateMetrics(emptyInstrument, [update]).orderBookImbalance).toBeNull();
  });

  it('keeps order-book imbalance between -1 and 1', () => {
    const bidOnlyUpdate: MarketUpdate = {
      ...marketUpdates[0],
      bidQuantity: 10,
      askQuantity: 0,
    };
    const askOnlyUpdate: MarketUpdate = {
      ...marketUpdates[0],
      bidQuantity: 0,
      askQuantity: 10,
    };

    expect(calculateMetrics(emptyInstrument, [bidOnlyUpdate]).orderBookImbalance).toBe(1);
    expect(calculateMetrics(emptyInstrument, [askOnlyUpdate]).orderBookImbalance).toBe(-1);
  });
});
