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

export type WorkerResponse =
  | { type: 'GENERATION_START' }
  | { type: 'GENERATION_UPDATE'; payload: string }
  | { type: 'GENERATION_PAUSE' };
