// Invariant checks for the real generator.wasm (run: npm run test:wasm).
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const WASM_PATH = new URL('../public/wasm/generator.wasm', import.meta.url);
const UPDATE_FIELDS = 7;
const MAX_PRICE_STEP_CENTS = 5;
const MAX_SPREAD_CENTS = 1000;

async function instantiate() {
  const bytes = await readFile(WASM_PATH);
  const { instance } = await WebAssembly.instantiate(bytes, {
    env: {
      abort: (_msg, _file, line, col) => {
        throw new Error(`wasm abort at ${line}:${col}`);
      },
    },
  });
  return instance.exports;
}

function readBatch(wasm, count) {
  const ptr = wasm.generateBatch(count);
  assert.notEqual(ptr, 0, 'generateBatch returned null pointer');
  // Copy: the wasm buffer is reused on the next call.
  return new Int32Array(wasm.memory.buffer, ptr, count * UPDATE_FIELDS).slice();
}

const tests = {
  async 'rejects invalid instrument counts'() {
    const wasm = await instantiate();
    assert.equal(wasm.init(0, 1), -1);
    assert.equal(wasm.init(1001, 1), -1);
    assert.equal(wasm.init(-5, 1), -1);
  },

  async 'returns null pointer before init and for invalid batch sizes'() {
    const wasm = await instantiate();
    assert.equal(wasm.generateBatch(10), 0);
    assert.equal(wasm.init(3, 1), 0);
    assert.equal(wasm.generateBatch(0), 0);
    assert.equal(wasm.generateBatch(-1), 0);
  },

  async 'keeps prices, quantities and quotes valid and evolves prices gradually'() {
    const wasm = await instantiate();
    const instruments = 10;
    assert.equal(wasm.init(instruments, 12345), 0);

    const lastMid = new Map();
    let total = 0;

    for (const batchSize of [1, 100, 1000, 5000, 1000, 7]) {
      const data = readBatch(wasm, batchSize);
      assert.equal(data.length, batchSize * UPDATE_FIELDS);

      for (let o = 0; o < data.length; o += UPDATE_FIELDS) {
        const [i, price, qty, bid, ask, bidQty, askQty] = data.subarray(o, o + UPDATE_FIELDS);

        assert.ok(i >= 0 && i < instruments, `instrument index ${i}`);
        assert.ok(bid >= 1, `bid ${bid}`);
        assert.ok(ask > bid, `ask ${ask} > bid ${bid}`);
        assert.ok(ask - bid <= MAX_SPREAD_CENTS, `spread ${ask - bid}`);
        assert.ok(price === bid || price === ask, `price ${price} in {${bid}, ${ask}}`);
        assert.ok(qty > 0, `trade qty ${qty}`);
        assert.ok(bidQty >= 0 && askQty >= 0, `book qty ${bidQty}/${askQty}`);

        const mid = (bid + ask) / 2;
        if (lastMid.has(i)) {
          // Step + spread re-centering can move mid by at most step + half-spread.
          const maxMove = MAX_PRICE_STEP_CENTS + MAX_SPREAD_CENTS;
          assert.ok(Math.abs(mid - lastMid.get(i)) <= maxMove, `mid jump for ${i}`);
        }
        lastMid.set(i, mid);
        total++;
      }
    }

    assert.equal(lastMid.size, instruments, 'every instrument got updates');
    assert.equal(total, 1 + 100 + 1000 + 5000 + 1000 + 7);
  },

  async 'is deterministic for the same seed'() {
    const a = await instantiate();
    const b = await instantiate();
    a.init(5, 42);
    b.init(5, 42);
    assert.deepEqual(readBatch(a, 500), readBatch(b, 500));
  },

  async 'differs for different seeds'() {
    const a = await instantiate();
    const b = await instantiate();
    a.init(5, 1);
    b.init(5, 2);
    assert.notDeepEqual(readBatch(a, 100), readBatch(b, 100));
  },
};

let failed = 0;
for (const [name, fn] of Object.entries(tests)) {
  try {
    await fn();
    console.log(`  ✔ ${name}`);
  } catch (error) {
    failed++;
    console.error(`  ✘ ${name}\n    ${error.message}`);
  }
}

console.log(failed ? `\n${failed} failed` : '\nAll generator checks passed');
process.exit(failed ? 1 : 0);
