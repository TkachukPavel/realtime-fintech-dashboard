import { Injectable, OnDestroy, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { ProducerSettings } from '../../../core/types/producer-settings.type';
import { WorkerCmd, WorkerResponse } from '../../../core/types/worker-command.type';
import { BehaviorSubject } from 'rxjs';
import { InstrumentMetrics } from '../../../core/types/instrument-metrics.type';
import { createEmptyMetric } from '../../utils/metrics';

@Injectable({
  providedIn: 'root',
})
export class ProducerService implements OnDestroy {
  private worker: Worker | null = null;

  private readonly _isGenerationRunning = signal(false);
  public readonly isGenerationRunning = this._isGenerationRunning.asReadonly();

  private readonly _error = signal<string | null>(null);
  public readonly error = this._error.asReadonly();

  private readonly _settings = signal<ProducerSettings>({
    instrumentCount: 5,
    updatesPerBatch: 100,
    batchInterval: 500,
  });


  public readonly settings = this._settings.asReadonly();

  private readonly instrumentMetrics = new BehaviorSubject<InstrumentMetrics[]>(
    Array.from({ length: this.settings().instrumentCount }).map((_, i) => createEmptyMetric(i)),
  );

  public readonly instrumentMetrics$ = this.instrumentMetrics.asObservable();
  public readonly instrumentMetricsSig = toSignal(this.instrumentMetrics$, {
    initialValue: this.instrumentMetrics.value,
  });

  public applySettings(settings: ProducerSettings): void {
    this.stopProducer();

    this._settings.set(settings);

    this.instrumentMetrics.next(
      Array.from({ length: settings.instrumentCount }).map((_, i) => createEmptyMetric(i)),
    );

    this.startProducer();
  }

  public startProducer(): void {
    if (this.worker !== null) {
      return;
    }

    if (typeof Worker === 'undefined') {
      this.failWith('Web Workers are not supported in this browser');
      return;
    }

    this._error.set(null);

    try {
      const worker = new Worker(new URL('../producer.worker', import.meta.url));
      this.worker = worker;

      worker.onmessage = (msg) => {
        if (this.worker === worker) this.handleWorkerMessage(msg);
      };
      worker.onerror = (evt) => {
        if (this.worker === worker) this.handleWorkerError(evt);
      };

      worker.postMessage(WorkerCmd.start(this.settings()));
    } catch (error) {
      this.failWith(`Failed to start producer: ${(error as Error).message}`);
    }
  }

  public pauseProducer(): void {
    if (this.worker === null) return;

    this.worker.postMessage(WorkerCmd.pause());
  }

  public resumeProducer(): void {
    if (this.worker === null) return;

    this.worker.postMessage(WorkerCmd.resume());
  }

  public stopProducer() {
    this.worker?.postMessage(WorkerCmd.stop());
    this.worker?.terminate();
    this._isGenerationRunning.set(false);
    this.worker = null;
  }

  ngOnDestroy(): void {
    this.stopProducer();
  }

  public startGeneration() {
    if (this.worker === null) {
      this.startProducer();
    } else {
      this.resumeProducer();
    }
  }

  private handleWorkerError(error: ErrorEvent) {
    this.failWith(`Worker failed: ${error.message}`);
  }

  private failWith(message: string) {
    console.error(message);
    this.stopProducer();
    this._error.set(message);
  }

  private handleWorkerMessage(event: MessageEvent<WorkerResponse>) {
    const { data } = event;

    switch (data.type) {
      case 'GENERATION_PAUSE':
        this._isGenerationRunning.set(false);
        break;
      case 'GENERATION_START':
        this._isGenerationRunning.set(true);
        break;
      case 'GENERATION_UPDATE': {
        this.instrumentMetrics.next(data.payload);
        break;
      }
      case 'ERROR':
        this.failWith(data.message);
        break;
    }
  }
}
