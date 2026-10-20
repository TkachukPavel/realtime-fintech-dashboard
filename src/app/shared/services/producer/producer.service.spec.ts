import { TestBed } from '@angular/core/testing';

import { ProducerService } from './producer.service';
import { ProducerSettings } from '../../../core/types/producer-settings.type';
import { InstrumentMetrics } from '../../../core/types/instrument-metrics.type';
import { WorkerCmd } from '../../../core/types/worker-command.type';

describe('ProducerService', () => {
  let service: ProducerService;
  let workerMock: jasmine.SpyObj<Worker>;
  let workerConstructor: jasmine.Spy;

  beforeEach(() => {
    workerMock = jasmine.createSpyObj<Worker>('Worker', ['postMessage', 'terminate']);
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProducerService);
    workerConstructor = spyOn(window, 'Worker').and.returnValue(workerMock);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  describe('startProducer', () => {
    it('sends START command to worker with config', () => {
      service.startProducer();
      expect(window.Worker).toHaveBeenCalled();
      expect(workerMock.postMessage).toHaveBeenCalledWith(WorkerCmd.start(service.settings()));
    });

    it('assigns onmessage and onerror handlers', () => {
      service.startProducer();

      expect(workerMock.onmessage).toBeDefined();
      expect(workerMock.onerror).toBeDefined();
    });

    it('creates only one worker if called twice', () => {
      spyOn(service, 'resumeProducer').and.callThrough();
      service.startProducer();
      service.startProducer();

      expect(window.Worker).toHaveBeenCalledTimes(1);
    });
  });

  describe('handleWorkerMessage', () => {
    beforeEach(() => {
      service.startProducer();
    });
    it('on GENERATION_PAUSE it sets isGenerationRunning to false', () => {
      workerMock.onmessage!({ data: { type: 'GENERATION_PAUSE' } } as MessageEvent);

      expect(service.isGenerationRunning()).toBe(false);
    });

    it('on GENERATION_START it sets isGenerationRunning to true', () => {
      workerMock.onmessage!({ data: { type: 'GENERATION_START' } } as MessageEvent);

      expect(service.isGenerationRunning()).toBe(true);
    });

    it('on GENERATION_UPDATE it publishes the latest instrument metrics', () => {
      const updatedMetrics: InstrumentMetrics[] = [
        {
          ticker: 'ALFA',
          lastTradedPrice: 10200,
          bidAskSpread: 4,
          tradingVolume: 30,
          vwap: 10150,
          orderBookImbalance: 0.125,
          notionalCents: 304500,
        },
      ];

      workerMock.onmessage!({
        data: { type: 'GENERATION_UPDATE', payload: updatedMetrics },
      } as MessageEvent);

      expect(service.instrumentMetricsSig()).toEqual(updatedMetrics);
    });

    it('on ERROR it exposes the message, stops and terminates the worker', () => {
      spyOn(console, 'error');
      workerMock.onmessage!({ data: { type: 'GENERATION_START' } } as MessageEvent);

      workerMock.onmessage!({
        data: { type: 'ERROR', message: 'Generator init failed' },
      } as MessageEvent);

      expect(service.error()).toBe('Generator init failed');
      expect(service.isGenerationRunning()).toBe(false);
      expect(workerMock.terminate).toHaveBeenCalled();
    });

    it('on worker onerror it exposes the message and terminates the worker', () => {
      spyOn(console, 'error');

      workerMock.onerror!({ message: 'boom' } as ErrorEvent);

      expect(service.error()).toBe('Worker failed: boom');
      expect(workerMock.terminate).toHaveBeenCalled();
    });

    it('clears the error when a new producer is started', () => {
      spyOn(console, 'error');
      workerMock.onmessage!({ data: { type: 'ERROR', message: 'x' } } as MessageEvent);

      service.startProducer();

      expect(service.error()).toBeNull();
      expect(window.Worker).toHaveBeenCalledTimes(2);
    });
  });

  describe('pauseProducer', () => {
    it('sends a PAUSE command to the worker', () => {
      service.startProducer();
      workerMock.postMessage.calls.reset();
      service.pauseProducer();

      expect(workerMock.postMessage).toHaveBeenCalledWith(WorkerCmd.pause());
    });

    it('not throws if no worker', () => {
      expect(() => service.pauseProducer()).not.toThrow();
    });
  });

  describe('resumeProducer', () => {
    it('sends a RESUME command to the worker', () => {
      service.startProducer();

      service.resumeProducer();

      expect(workerMock.postMessage).toHaveBeenCalledWith(WorkerCmd.resume());
    });

    it('not throws if no worker', () => {
      expect(() => service.resumeProducer()).not.toThrow();
    });
  });

  describe('applySettings', () => {
    it('should update settings when applySettings is called', () => {
      const settings: ProducerSettings = {
        instrumentCount: 1,
        batchInterval: 200,
        updatesPerBatch: 200,
      };

      service.applySettings(settings);

      expect(workerMock.postMessage).toHaveBeenCalledWith(WorkerCmd.start(settings));

      expect(service.settings()).toEqual(settings);
    });

    it('resets metric values for the new instrument count when settings are applied', () => {
      service.startProducer();
      workerMock.onmessage!({
        data: {
          type: 'GENERATION_UPDATE',
          payload: [
            {
              ticker: 'ALFA',
              lastTradedPrice: 10_200,
              bidAskSpread: 4,
              tradingVolume: 40,
              vwap: 10_150,
              orderBookImbalance: 0.2,
              notionalCents: 406_000,
            },
          ],
        },
      } as MessageEvent);

      const settings: ProducerSettings = {
        instrumentCount: 2,
        batchInterval: 200,
        updatesPerBatch: 200,
      };

      service.applySettings(settings);

      expect(service.instrumentMetricsSig()).toEqual([
        {
          ticker: 'ALFA',
          lastTradedPrice: null,
          bidAskSpread: null,
          tradingVolume: 0,
          vwap: null,
          orderBookImbalance: null,
          notionalCents: 0,
        },
        {
          ticker: 'BRVO',
          lastTradedPrice: null,
          bidAskSpread: null,
          tradingVolume: 0,
          vwap: null,
          orderBookImbalance: null,
          notionalCents: 0,
        },
      ]);
      expect(service.settings()).toEqual(settings);
    });

    it('ignores late results from a worker replaced by a new run', () => {
      const previousWorker = workerMock;
      const currentWorker = jasmine.createSpyObj<Worker>('CurrentWorker', [
        'postMessage',
        'terminate',
      ]);
      workerConstructor.and.returnValues(previousWorker, currentWorker);

      service.startProducer();
      const previousOnMessage = previousWorker.onmessage!;

      service.applySettings({
        instrumentCount: 2,
        updatesPerBatch: 200,
        batchInterval: 250,
      });
      previousOnMessage.call(previousWorker, {
        data: {
          type: 'GENERATION_UPDATE',
          payload: [
            {
              ticker: 'ALFA',
              lastTradedPrice: 12_345,
              bidAskSpread: 5,
              tradingVolume: 100,
              vwap: 12_340,
              orderBookImbalance: 0.1,
              notionalCents: 1_234_000,
            },
          ],
        },
      } as MessageEvent);

      expect(service.instrumentMetricsSig()).toEqual([
        {
          ticker: 'ALFA',
          lastTradedPrice: null,
          bidAskSpread: null,
          tradingVolume: 0,
          vwap: null,
          orderBookImbalance: null,
          notionalCents: 0,
        },
        {
          ticker: 'BRVO',
          lastTradedPrice: null,
          bidAskSpread: null,
          tradingVolume: 0,
          vwap: null,
          orderBookImbalance: null,
          notionalCents: 0,
        },
      ]);
    });

    it('restarts worker if the worker is running', () => {
      const settings: ProducerSettings = {
        instrumentCount: 1,
        batchInterval: 200,
        updatesPerBatch: 200,
      };

      service.startProducer();

      spyOn(service, 'stopProducer').and.callThrough();
      spyOn(service, 'startProducer').and.callThrough();

      service.applySettings(settings);

      expect(workerMock.postMessage).toHaveBeenCalledWith(WorkerCmd.stop());

      expect(workerMock.postMessage).toHaveBeenCalledWith(WorkerCmd.start(settings));

      expect(service.stopProducer).toHaveBeenCalled();
      expect(service.startProducer).toHaveBeenCalled();

      expect(service.stopProducer).toHaveBeenCalledBefore(service.startProducer);
    });
  });

  describe('stopProducer', () => {
    it('sends stop message to worker and terminates it', () => {
      service.startProducer();

      service.stopProducer();

      expect(workerMock.postMessage).toHaveBeenCalledWith(WorkerCmd.stop());
      expect(workerMock.terminate).toHaveBeenCalled();
    });

    it("doesn't throw if worker is not started", () => {
      expect(() => service.stopProducer()).not.toThrow();
    });
  });

  describe('startGeneration', () => {
    it('starts the producer when no worker exists', () => {
      service.startGeneration();

      expect(window.Worker).toHaveBeenCalledTimes(1);
      expect(workerMock.postMessage).toHaveBeenCalledWith(WorkerCmd.start(service.settings()));
    });

    it('resumes the producer when a worker already exists', () => {
      service.startProducer();
      workerMock.postMessage.calls.reset();

      service.startGeneration();

      expect(window.Worker).toHaveBeenCalledTimes(1);
      expect(workerMock.postMessage).toHaveBeenCalledWith(WorkerCmd.resume());
    });
  });

  describe('onDestroy', () => {
    it('stops producer onDestroy', () => {
      service.startProducer();
      spyOn(service, 'stopProducer').and.callThrough();

      service.ngOnDestroy();

      expect(service.stopProducer).toHaveBeenCalled();
    });
  });
});
