import { InstrumentMetrics } from './instrument-metrics.type';
import { ProducerSettings } from './producer-settings.type';

export type WorkerCommand =
  | { type: 'START'; payload: ProducerSettings }
  | { type: 'PAUSE' }
  | { type: 'RESUME' }
  | { type: 'STOP' };

const start = (payload: ProducerSettings): WorkerCommand => ({
  type: 'START',
  payload,
});

const pause = (): WorkerCommand => ({ type: 'PAUSE' });
const resume = (): WorkerCommand => ({ type: 'RESUME' });
const stop = (): WorkerCommand => ({ type: 'STOP' });

export const WorkerCmd = {
  start,
  pause,
  resume,
  stop,
};

export type GenerationUpdate = InstrumentMetrics[];

export type WorkerResponse =
  | { type: 'GENERATION_START' }
  | { type: 'GENERATION_UPDATE'; payload: GenerationUpdate }
  | { type: 'GENERATION_PAUSE' }
  | { type: 'ERROR'; message: string };
