import { tickerFor } from '../../core/constants/tickers';
import { MarketUpdate } from '../../core/types/market-update.type';

// Resolved relative to the worker script URL, so it works under a non-root base href.
export const GENERATOR_WASM_URL = 'wasm/generator.wasm';

// Must match the record layout in assembly/generator.ts.
export const UPDATE_FIELDS = 7;

const ERROR_MESSAGES: Record<number, string> = {
  [-1]: 'invalid instrument count',
};

interface GeneratorExports {
  memory: WebAssembly.Memory;
  init(instrumentCount: number, seed: number): number;
  generateBatch(updatesCount: number): number;
}

export interface MarketGenerator {
  /** Sets up per-instrument state. Throws on invalid input. */
  init(instrumentCount: number, seed: number): void;
  /**
   * Generates `updatesCount` updates and returns a view over wasm memory
   * (`updatesCount * UPDATE_FIELDS` values). The view is only valid until the next call.
   */
  generateBatch(updatesCount: number): Int32Array;
}

export async function loadMarketGenerator(url = GENERATOR_WASM_URL): Promise<MarketGenerator> {
  const response = await fetch(url);
  if (!response.ok) {
    throw new Error(`Failed to load generator from "${url}" (HTTP ${response.status})`);
  }

  let exports: GeneratorExports;
  try {
    const { instance } = await WebAssembly.instantiateStreaming(response, {
      env: {
        abort: (msgPtr: number, filePtr: number, line: number, col: number) => {
          const memory = exports?.memory;
          const msg = memory ? readAsString(memory, msgPtr) : '';
          const file = memory ? readAsString(memory, filePtr) : '';
          throw new Error(`Generator aborted: ${msg} (${file}:${line}:${col})`);
        },
      },
    });
    exports = instance.exports as unknown as GeneratorExports;
  } catch (error) {
    throw new Error(`Failed to instantiate generator: ${(error as Error).message}`);
  }

  return {
    init(instrumentCount, seed) {
      const code = exports.init(instrumentCount, seed >>> 0);
      if (code !== 0) {
        const reason = ERROR_MESSAGES[code] ?? `error code ${code}`;
        throw new Error(`Generator init failed: ${reason} (${instrumentCount})`);
      }
    },
    generateBatch(updatesCount) {
      const ptr = exports.generateBatch(updatesCount);
      if (ptr === 0) {
        throw new Error(`Generator failed to produce a batch of ${updatesCount} updates`);
      }
      // Create the view after the call: memory growth detaches previous buffers.
      return new Int32Array(exports.memory.buffer, ptr, updatesCount * UPDATE_FIELDS);
    },
  };
}

export function decodeUpdate(batch: Int32Array, index: number): MarketUpdate {
  const o = index * UPDATE_FIELDS;
  return {
    instrument: tickerFor(batch[o]),
    priceCents: batch[o + 1],
    tradeQuantity: batch[o + 2],
    bidCents: batch[o + 3],
    askCents: batch[o + 4],
    bidQuantity: batch[o + 5],
    askQuantity: batch[o + 6],
  };
}

// AssemblyScript strings are UTF-16 with their byte length stored 4 bytes before the pointer.
function readAsString(memory: WebAssembly.Memory, ptr: number): string {
  if (!ptr) return '';
  const byteLength = new Uint32Array(memory.buffer, ptr - 4, 1)[0];
  return String.fromCharCode(...new Uint16Array(memory.buffer, ptr, byteLength >>> 1));
}
