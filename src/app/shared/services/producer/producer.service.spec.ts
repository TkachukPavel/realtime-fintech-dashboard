import { TestBed } from '@angular/core/testing';

import { ProducerService } from './producer.service';
import { ProducerSettings } from '../../../core/types/producer-settings.type';
import { WorkerCmd } from '../../../core/types/worker-command.type';

describe('ProducerService', () => {
  let service: ProducerService;
  let workerMock: jasmine.SpyObj<Worker>;

  beforeEach(() => {
    workerMock = jasmine.createSpyObj<Worker>('Worker', ['postMessage', 'terminate']);
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProducerService);
    spyOn(window, 'Worker').and.returnValue(workerMock);
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
