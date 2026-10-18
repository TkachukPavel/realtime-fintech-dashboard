// Market update generator.
//
// Keeps per-instrument bid/ask state and produces batches of simulated trades.
// All randomness and price evolution happens here; the host only reads the output.
//
// Output record layout (UPDATE_FIELDS x i32 per update):
//   0 instrumentIndex
//   1 priceCents     (always equal to bidCents or askCents)
//   2 tradeQuantity  (> 0)
//   3 bidCents       (>= 1)
//   4 askCents       (> bidCents)
//   5 bidQuantity    (>= 0)
//   6 askQuantity    (>= 0)

const UPDATE_FIELDS: i32 = 7;

const MAX_INSTRUMENTS: i32 = 1000;
const MAX_BATCH_SIZE: i32 = 100_000;

const MIN_MID_CENTS: i32 = 100;
const INITIAL_MIN_CENTS: i32 = 1_000;
const INITIAL_MAX_CENTS: i32 = 50_000;
const MAX_PRICE_STEP_CENTS: i32 = 5;
const MAX_SPREAD_CENTS: i32 = 1000;
const MAX_TRADE_QUANTITY: i32 = 100;
const MAX_BOOK_QUANTITY: i32 = 1_000;

// Error codes returned by init().
const OK: i32 = 0;
const ERR_INVALID_INSTRUMENT_COUNT: i32 = -1;

let rngState: u32 = 1;
let instrumentCount: i32 = 0;

let bids = new StaticArray<i32>(0);
let asks = new StaticArray<i32>(0);
let output = new StaticArray<i32>(0);

// xorshift32
function nextRandom(): u32 {
  let x = rngState;
  x ^= x << 13;
  x ^= x >> 17;
  x ^= x << 5;
  rngState = x;
  return x;
}

// Uniform-ish integer in [min, max] (inclusive). Modulo bias is fine for a simulation.
function randInt(min: i32, max: i32): i32 {
  return min + <i32>(nextRandom() % <u32>(max - min + 1));
}

// Places a fresh bid/ask around `mid`, guaranteeing 1 <= bid < ask.
function setQuote(index: i32, mid: i32): void {
  const spread = randInt(1, MAX_SPREAD_CENTS);
  let bid = mid - spread / 2;
  if (bid < 1) bid = 1;
  unchecked((bids[index] = bid));
  unchecked((asks[index] = bid + spread));
}

export function init(count: i32, seed: u32): i32 {
  if (count < 1 || count > MAX_INSTRUMENTS) {
    return ERR_INVALID_INSTRUMENT_COUNT;
  }

  // xorshift must never be seeded with 0.
  rngState = seed == 0 ? 0x9e3779b9 : seed;
  instrumentCount = count;
  bids = new StaticArray<i32>(count);
  asks = new StaticArray<i32>(count);

  for (let i = 0; i < count; i++) {
    setQuote(i, randInt(INITIAL_MIN_CENTS, INITIAL_MAX_CENTS));
  }

  return OK;
}

// Returns a pointer to `updatesCount * UPDATE_FIELDS` i32 values, or 0 on invalid input.
// The buffer is reused between calls; the host must read it before the next call.
export function generateBatch(updatesCount: i32): usize {
  if (instrumentCount == 0 || updatesCount < 1 || updatesCount > MAX_BATCH_SIZE) {
    return 0;
  }

  const size = updatesCount * UPDATE_FIELDS;
  if (output.length < size) {
    output = new StaticArray<i32>(size);
  }

  for (let k = 0; k < updatesCount; k++) {
    const i = randInt(0, instrumentCount - 1);

    // Random walk from the previous mid price.
    let mid = (unchecked(bids[i]) + unchecked(asks[i])) / 2;
    mid += randInt(-MAX_PRICE_STEP_CENTS, MAX_PRICE_STEP_CENTS);
    if (mid < MIN_MID_CENTS) mid = MIN_MID_CENTS;

    setQuote(i, mid);

    const bid = unchecked(bids[i]);
    const ask = unchecked(asks[i]);
    // Buyer lifts the ask, seller hits the bid.
    const price = (nextRandom() & 1) == 1 ? ask : bid;

    const o = k * UPDATE_FIELDS;
    unchecked((output[o] = i));
    unchecked((output[o + 1] = price));
    unchecked((output[o + 2] = randInt(1, MAX_TRADE_QUANTITY)));
    unchecked((output[o + 3] = bid));
    unchecked((output[o + 4] = ask));
    unchecked((output[o + 5] = randInt(0, MAX_BOOK_QUANTITY)));
    unchecked((output[o + 6] = randInt(0, MAX_BOOK_QUANTITY)));
  }

  return changetype<usize>(output);
}
