/// <reference lib="webworker" />

import { ProducerSettings } from '../../core/types/producer-settings.type';
import { WorkerCommand, WorkerResponse } from '../../core/types/worker-command.type';

let intervalId: ReturnType<typeof setInterval> | null = null;
let count = 0;
let settings: ProducerSettings;

addEventListener('message', (event: MessageEvent<WorkerCommand>) => {
  const { data } = event;
  switch (data.type) {
    case 'START':
      start(data.payload);
      break;
    case 'PAUSE':
      pause();
      break;
    case 'RESUME':
      resume();
      break;
    case 'STOP':
      stop();
      break;
    default:
      throw new Error(`Command is not suppported`);
  }
});

const computation = () => {
  const msg: WorkerResponse = {
    type: 'GENERATION_UPDATE',
    payload: `tick ${count++}`,
  };
  postMessage(msg);
};

function start(config: ProducerSettings) {
  settings = config;
  intervalId = setInterval(computation, settings.batchInterval);
  const msg: WorkerResponse = {
    type: 'GENERATION_START',
  };

  postMessage(msg);
}

function pause() {
  if (!intervalId) {
    return;
  }

  clearInterval(intervalId);
  intervalId = null;
  const msg: WorkerResponse = {
    type: 'GENERATION_PAUSE',
  };
  postMessage(msg);
}

function resume() {
  if (!!intervalId) {
    return;
  }

  intervalId = setInterval(computation, settings.batchInterval);
  const msg: WorkerResponse = {
    type: 'GENERATION_START',
  };

  postMessage(msg);
}

function stop() {
  count = 0;
  if (!!intervalId) {
    clearInterval(intervalId);
    intervalId = null;
  }
  const msg: WorkerResponse = {
    type: 'GENERATION_PAUSE',
  };
  postMessage(msg);
}
