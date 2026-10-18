import {
  decodeUpdate,
  loadMarketGenerator,
  UPDATE_FIELDS,
} from './market-generator';

describe('MarketGenerator adapter', () => {
  let memory: WebAssembly.Memory;
  let exports: {
    memory: WebAssembly.Memory;
    init: jasmine.Spy;
    generateBatch: jasmine.Spy;
  };

  beforeEach(() => {
    memory = new WebAssembly.Memory({ initial: 1 });
    exports = {
      memory,
      init: jasmine.createSpy('init').and.returnValue(0),
      generateBatch: jasmine.createSpy('generateBatch').and.returnValue(16),
    };
    spyOn(window, 'fetch').and.resolveTo(new Response(new Uint8Array()));
    spyOn(WebAssembly, 'instantiateStreaming').and.callFake(async () => ({
      instance: { exports },
      module: {} as WebAssembly.Module,
    }));
  });

  it('loads the wasm file and initializes with an unsigned seed', async () => {
    const generator = await loadMarketGenerator('/assets/generator.wasm');

    expect(window.fetch).toHaveBeenCalledOnceWith('/assets/generator.wasm');
    generator.init(5, -1);

    expect(exports.init).toHaveBeenCalledOnceWith(5, 0xffffffff);
  });

  it('reports fetch failures', async () => {
    (window.fetch as jasmine.Spy).and.resolveTo(new Response(null, { status: 404 }));

    await expectAsync(loadMarketGenerator('missing.wasm')).toBeRejectedWithError(
      'Failed to load generator from "missing.wasm" (HTTP 404)',
    );
  });

  it('wraps wasm instantiation failures', async () => {
    (WebAssembly.instantiateStreaming as jasmine.Spy).and.rejectWith(new Error('bad magic'));

    await expectAsync(loadMarketGenerator()).toBeRejectedWithError(
      'Failed to instantiate generator: bad magic',
    );
  });

  it('reports generator initialization and batch-generation failures', async () => {
    const generator = await loadMarketGenerator();
    exports.init.and.returnValue(-1);

    expect(() => generator.init(0, 1)).toThrowError(
      'Generator init failed: invalid instrument count (0)',
    );

    exports.init.and.returnValue(0);
    generator.init(1, 1);
    exports.generateBatch.and.returnValue(0);

    expect(() => generator.generateBatch(2)).toThrowError(
      'Generator failed to produce a batch of 2 updates',
    );
  });

  it('returns a view of the generated records and decodes update fields', async () => {
    const generator = await loadMarketGenerator();
    const batch = new Int32Array(memory.buffer, 16, UPDATE_FIELDS);
    batch.set([1, 10204, 20, 10200, 10204, 550, 420]);

    const generated = generator.generateBatch(1);

    expect(generated).toBeInstanceOf(Int32Array);
    expect(generated.length).toBe(UPDATE_FIELDS);
    expect(decodeUpdate(generated, 0)).toEqual({
      instrument: 'BRVO',
      priceCents: 10204,
      tradeQuantity: 20,
      bidCents: 10200,
      askCents: 10204,
      bidQuantity: 550,
      askQuantity: 420,
    });
  });
});
