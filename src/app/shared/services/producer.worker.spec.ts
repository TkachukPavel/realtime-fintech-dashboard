import { WorkerCmd } from '../../core/types/worker-command.type';
import { calculateMetrics, createEmptyMetric } from '../utils/metrics';
import { UPDATE_FIELDS } from './market-generator';

import { handleCommand } from './producer.worker';

describe('ProducerWorker', () => {
  let postMessageSpy: jasmine.Spy;
  let fakeExports: {
    memory: WebAssembly.Memory;
    init: jasmine.Spy;
    generateBatch: jasmine.Spy;
  };

  const settings = {
    instrumentCount: 5,
    updatesPerBatch: 3,
    batchInterval: 100,
  };

  const BATCH_PTR = 16;

  // Fake wasm generator: record k = [k % 5, 1000 + k, 10, 999 + k, 1000 + k, 100, 200]
  const createFakeExports = () => {
    const memory = new WebAssembly.Memory({ initial: 1 });
    return {
      memory,
      init: jasmine.createSpy('init').and.returnValue(0),
      generateBatch: jasmine.createSpy('generateBatch').and.callFake((n: number) => {
        const view = new Int32Array(memory.buffer, BATCH_PTR, n * UPDATE_FIELDS);
        for (let k = 0; k < n; k++) {
          view.set([k % 5, 1000 + k, 10, 999 + k, 1000 + k, 100, 200], k * UPDATE_FIELDS);
        }
        return BATCH_PTR;
      }),
    };
  };

  const expectCommandToThrow = (command: any, expectedMessage: string) => {
    const originalOnError = window.onerror;
    let capturedError: Error | undefined;

    // Intercept the uncaught error from the DOM event listener
    window.onerror = (_msg, _url, _line, _col, error) => {
      capturedError = error;
      return true; // Returning true prevents the browser/Karma from failing the test
    };

    try {
      window.dispatchEvent(new MessageEvent('message', { data: command }));
    } finally {
      // Always restore Karma's global error handler
      window.onerror = originalOnError;
    }

    expect(capturedError).toBeDefined();
    expect(capturedError?.message).toBe(expectedMessage);
  };

  const start = () => handleCommand(WorkerCmd.start(settings));

  beforeEach(() => {
    jasmine.clock().install();

    postMessageSpy = spyOn(window, 'postMessage').and.stub();
    fakeExports = createFakeExports();
    spyOn(window, 'fetch').and.callFake(() => Promise.resolve(new Response()));
    spyOn(WebAssembly, 'instantiateStreaming').and.callFake(() =>
      Promise.resolve({
        instance: { exports: fakeExports },
      } as unknown as WebAssembly.WebAssemblyInstantiatedSource),
    );
  });

  afterEach(() => {
    handleCommand(WorkerCmd.stop());
    jasmine.clock().uninstall();
  });

  describe('START', () => {
    it('loads the generator, initialises it and sends GENERATION_START', async () => {
      await start();

      expect(window.fetch).toHaveBeenCalledWith('wasm/generator.wasm');
      expect(fakeExports.init).toHaveBeenCalledWith(settings.instrumentCount, jasmine.any(Number));
      expect(postMessageSpy)
        .withContext('sends a start message')
        .toHaveBeenCalledWith({ type: 'GENERATION_START' });
      expect(postMessageSpy)
        .withContext('sends metrics updates with empty metrics')
        .toHaveBeenCalledWith({
          type: 'GENERATION_UPDATE',
          payload: Array.from({ length: settings.instrumentCount }).map((_, i) =>
            createEmptyMetric(i),
          ),
        });
    });

    it('sends ERROR and does not start if the wasm file cannot be fetched', async () => {
      (window.fetch as jasmine.Spy).and.resolveTo(new Response(null, { status: 404 }));

      await start();

      expect(postMessageSpy).toHaveBeenCalledOnceWith({
        type: 'ERROR',
        message: 'Failed to load generator from "wasm/generator.wasm" (HTTP 404)',
      });
    });

    it('sends ERROR if the wasm module cannot be instantiated', async () => {
      (WebAssembly.instantiateStreaming as jasmine.Spy).and.rejectWith(new Error('bad magic'));

      await start();

      expect(postMessageSpy).toHaveBeenCalledOnceWith({
        type: 'ERROR',
        message: 'Failed to instantiate generator: bad magic',
      });
    });

    it('sends ERROR if generator init rejects the settings', async () => {
      fakeExports.init.and.returnValue(-1);

      await start();

      expect(postMessageSpy).toHaveBeenCalledOnceWith({
        type: 'ERROR',
        message: 'Generator init failed: invalid instrument count (5)',
      });
      jasmine.clock().tick(settings.batchInterval);
      expect(fakeExports.generateBatch).not.toHaveBeenCalled();
    });

    it('does not start if STOP arrives while the generator is loading', async () => {
      const pending = start();
      handleCommand(WorkerCmd.stop());
      postMessageSpy.calls.reset();

      await pending;
      jasmine.clock().tick(settings.batchInterval);

      expect(postMessageSpy).not.toHaveBeenCalled();
    });
  });

  describe('generation', () => {
    it('generates a batch every interval and reports a summary', async () => {
      await start();
      postMessageSpy.calls.reset();

      jasmine.clock().tick(settings.batchInterval);
      expect(fakeExports.generateBatch).toHaveBeenCalledOnceWith(settings.updatesPerBatch);

      expect(postMessageSpy).toHaveBeenCalledOnceWith({
        type: 'GENERATION_UPDATE',
        payload: [
          {
            ticker: 'ALFA',
            lastTradedPrice: 1000,
            bidAskSpread: 1,
            tradingVolume: 10,
            tradexprice: 10000,
            vwap: 1000,
            orderBookImbalance: -0.3333333333333333,
          },
          {
            ticker: 'BRVO',
            lastTradedPrice: 1001,
            bidAskSpread: 1,
            tradingVolume: 10,
            tradexprice: 10010,
            vwap: 1001,
            orderBookImbalance: -0.3333333333333333,
          },
          {
            ticker: 'CHRL',
            lastTradedPrice: 1002,
            bidAskSpread: 1,
            tradingVolume: 10,
            tradexprice: 10020,
            vwap: 1002,
            orderBookImbalance: -0.3333333333333333,
          },

          {
            ticker: 'DLTA',
            lastTradedPrice: null,
            bidAskSpread: null,
            tradingVolume: 0,
            tradexprice: 0,
            vwap: null,
            orderBookImbalance: null,
          },
          {
            ticker: 'ECHO',
            lastTradedPrice: null,
            bidAskSpread: null,
            tradingVolume: 0,
            tradexprice: 0,
            vwap: null,
            orderBookImbalance: null,
          },
        ],
      });
    });

    it('sends ERROR and pauses if a batch cannot be generated', async () => {
      fakeExports.generateBatch.and.returnValue(0);
      await start();
      postMessageSpy.calls.reset();

      jasmine.clock().tick(settings.batchInterval);

      expect(postMessageSpy.calls.allArgs()).toEqual([
        [{ type: 'ERROR', message: 'Generator failed to produce a batch of 3 updates' }],
        [{ type: 'GENERATION_PAUSE' }],
      ]);

      postMessageSpy.calls.reset();
      jasmine.clock().tick(settings.batchInterval);
      expect(postMessageSpy).not.toHaveBeenCalled();
    });
  });

  describe('PAUSE / RESUME', () => {
    it('sends GENERATION_PAUSE on pausing running producer', async () => {
      await start();
      postMessageSpy.calls.reset();

      handleCommand(WorkerCmd.pause());

      expect(postMessageSpy).toHaveBeenCalledOnceWith({ type: 'GENERATION_PAUSE' });
    });

    it("doesn't generate while paused and keeps totals after resume", async () => {
      await start();
      jasmine.clock().tick(settings.batchInterval);

      const initUpdate = postMessageSpy.calls.mostRecent().args[0];

      expect(initUpdate.type).toEqual('GENERATION_UPDATE');

      handleCommand(WorkerCmd.pause());
      postMessageSpy.calls.reset();
      jasmine.clock().tick(settings.batchInterval);
      expect(postMessageSpy).not.toHaveBeenCalled();

      handleCommand(WorkerCmd.resume());
      expect(postMessageSpy).toHaveBeenCalledWith({ type: 'GENERATION_START' });
      expect(postMessageSpy)
        .withContext('sends metrics updates with empty metrics')
        .toHaveBeenCalledWith(initUpdate);

      postMessageSpy.calls.reset();
      jasmine.clock().tick(settings.batchInterval);
      const lastUpdate = postMessageSpy.calls.mostRecent().args[0];

      expect(lastUpdate.type).toEqual('GENERATION_UPDATE');
      expect(lastUpdate.payload).not.toEqual(initUpdate.payload);
    });

    it('ignores RESUME if the generator was never initialised', () => {
      handleCommand(WorkerCmd.resume());

      expect(postMessageSpy).not.toHaveBeenCalled();
    });
  });

  describe('STOP', () => {
    it('stops generation and sends GENERATION_PAUSE', async () => {
      await start();
      postMessageSpy.calls.reset();

      handleCommand(WorkerCmd.stop());
      expect(postMessageSpy).toHaveBeenCalledOnceWith({ type: 'GENERATION_PAUSE' });

      postMessageSpy.calls.reset();
      jasmine.clock().tick(settings.batchInterval);
      expect(postMessageSpy).not.toHaveBeenCalled();
    });
  });

  it('thows if command is not supported', () => {
    expectCommandToThrow('TEST', 'Command is not suppported');
  });
});
