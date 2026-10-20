/// <reference lib="webworker" />

import { InstrumentMetrics } from '../../core/types/instrument-metrics.type';
import { ProducerSettings } from '../../core/types/producer-settings.type';
import { WorkerCommand, WorkerResponse } from '../../core/types/worker-command.type';
import { calculateMetrics, createEmptyMetric } from '../utils/metrics';
import { decodeUpdate, loadMarketGenerator, MarketGenerator } from './market-generator';

let intervalId: ReturnType<typeof setInterval> | null = null;
let settings: ProducerSettings;
let generator: MarketGenerator | null = null;
let paused = false;
// Incremented on every START/STOP so a slow wasm load can't start a stale session.
let session = 0;

let metricsState: InstrumentMetrics[] = [];

addEventListener('message', (event: MessageEvent<WorkerCommand>) => {
  void handleCommand(event.data);
});

export function handleCommand(command: WorkerCommand): Promise<void> | void {
  switch (command.type) {
    case 'START':
      return start(command.payload);
    case 'PAUSE':
      return pause();
    case 'RESUME':
      return resume();
    case 'STOP':
      return stop();
    default:
      throw new Error(`Command is not suppported`);
  }
}

const post = (msg: WorkerResponse) => postMessage(msg);

function generateBatch() {
  if (!generator) return;
  try {
    const batch = generator.generateBatch(settings.updatesPerBatch);
    const batchSize = settings.updatesPerBatch;

    const updates = Array.from({ length: batchSize }, (_, i) => decodeUpdate(batch, i));

    metricsState = metricsState.map((metrics) => {
      const relatedUpdates = updates.filter((update) => update.instrument === metrics.ticker);
      return calculateMetrics(metrics, relatedUpdates);
    });

    // Metrics aggregation will consume `batch` here. For now only report a summary.
    post({
      type: 'GENERATION_UPDATE',
      payload: metricsState,
    });

  } catch (error) {
    clearTimer();
    post({ type: 'ERROR', message: (error as Error).message });
    post({ type: 'GENERATION_PAUSE' });
  }
}

async function start(config: ProducerSettings) {
  const currentSession = ++session;
  clearTimer();
  settings = config;
  generator = null;
  paused = false;

  try {
    const loaded = await loadMarketGenerator();
    if (currentSession !== session) return; // stopped/restarted while loading

    loaded.init(config.instrumentCount, Date.now());
    metricsState = Array.from({ length: config.instrumentCount }).map((_, i) =>
      createEmptyMetric(i),
    );
    generator = loaded;
  } catch (error) {
    if (currentSession !== session) return;
    post({ type: 'ERROR', message: (error as Error).message });
    return;
  }

  if (!paused) startTimer();
}

function startTimer() {
  intervalId = setInterval(generateBatch, settings.batchInterval);
  post({ type: 'GENERATION_START' });
  post({ type: 'GENERATION_UPDATE', payload: metricsState });
}

function clearTimer() {
  if (intervalId !== null) {
    clearInterval(intervalId);
    intervalId = null;
  }
}

function pause() {
  paused = true;
  if (intervalId === null) return;
  clearTimer();
  post({ type: 'GENERATION_PAUSE' });
}

function resume() {
  paused = false;
  if (intervalId !== null || generator === null) return;

  startTimer();
}

function stop() {
  session++;
  paused = true;
  clearTimer();
  generator = null;
  post({ type: 'GENERATION_PAUSE' });
}
