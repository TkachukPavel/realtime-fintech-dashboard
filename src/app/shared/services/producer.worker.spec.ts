import { WorkerCmd } from '../../core/types/worker-command.type';

import './producer.worker';

describe('ProducerWorker', () => {
  let postMessageSpy: jasmine.Spy;

  const settings = {
    instrumentCount: 5,
    updatesPerBatch: 100,
    batchInterval: 100,
  };

  const sendCommand = (command: any) =>
    window.dispatchEvent(new MessageEvent('message', { data: command }));

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

  beforeEach(() => {
    jasmine.clock().install();

    postMessageSpy = spyOn(window, 'postMessage').and.stub();
  });

  afterEach(() => {
    jasmine.clock().uninstall();
    sendCommand(WorkerCmd.stop());
  });

  it('sends GENERATION_START event on start', () => {
    sendCommand(WorkerCmd.start(settings));

    expect(postMessageSpy).toHaveBeenCalledWith({ type: 'GENERATION_START' });
  });

  it('sends GENERATION_PAUSE event on pausing running producer', () => {
    sendCommand(WorkerCmd.start(settings));

    postMessageSpy.calls.reset();

    sendCommand(WorkerCmd.pause());

    expect(postMessageSpy).toHaveBeenCalledOnceWith({ type: 'GENERATION_PAUSE' });
  });

  it('sends GENERATION_START on resuming paused producer', () => {
    sendCommand(WorkerCmd.start(settings));
    sendCommand(WorkerCmd.pause());
    postMessageSpy.calls.reset();

    sendCommand(WorkerCmd.resume());

    expect(postMessageSpy).toHaveBeenCalledOnceWith({ type: 'GENERATION_START' });
  });

  it('generates data once started in specified interval', () => {
    sendCommand(WorkerCmd.start(settings));
    postMessageSpy.calls.reset();

    jasmine.clock().tick(settings.batchInterval);

    expect(postMessageSpy).toHaveBeenCalledOnceWith({
      type: 'GENERATION_UPDATE',
      payload: 'tick 0',
    });

    postMessageSpy.calls.reset();

    jasmine.clock().tick(settings.batchInterval);

    expect(postMessageSpy).toHaveBeenCalledOnceWith({
      type: 'GENERATION_UPDATE',
      payload: 'tick 1',
    });
  });

  it("doesn't generate values if paused", () => {
    sendCommand(WorkerCmd.start(settings));
    postMessageSpy.calls.reset();

    jasmine.clock().tick(settings.batchInterval);
    expect(postMessageSpy).toHaveBeenCalledOnceWith({
      type: 'GENERATION_UPDATE',
      payload: 'tick 0',
    });

    sendCommand(WorkerCmd.pause());
    postMessageSpy.calls.reset();

    jasmine.clock().tick(settings.batchInterval);

    expect(postMessageSpy).not.toHaveBeenCalled();
  });

  it("doesn't erase the state after pause", () => {
    sendCommand(WorkerCmd.start(settings));
    postMessageSpy.calls.reset();

    jasmine.clock().tick(settings.batchInterval);
    expect(postMessageSpy).toHaveBeenCalledOnceWith({
      type: 'GENERATION_UPDATE',
      payload: 'tick 0',
    });

    sendCommand(WorkerCmd.pause());
    postMessageSpy.calls.reset();

    jasmine.clock().tick(settings.batchInterval);

    expect(postMessageSpy).not.toHaveBeenCalled();

    sendCommand(WorkerCmd.resume());
    postMessageSpy.calls.reset();

    jasmine.clock().tick(settings.batchInterval);

    expect(postMessageSpy).toHaveBeenCalledOnceWith({
      type: 'GENERATION_UPDATE',
      payload: 'tick 1',
    });
  });

  it('thows if command is not supported', () => {
    expectCommandToThrow('TEST', 'Command is not suppported');
  });
});
