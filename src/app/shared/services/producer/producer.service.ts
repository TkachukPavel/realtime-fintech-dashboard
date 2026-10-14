import { Injectable, OnDestroy, signal } from '@angular/core';
import { ProducerSettings } from '../../../core/types/producer-settings.type';
import { WorkerCmd, WorkerResponse } from '../../../core/types/worker-command.type';

@Injectable({
  providedIn: 'root',
})
export class ProducerService implements OnDestroy {
  private worker: Worker | null = null;

  private readonly _isGenerationRunning = signal(false);
  public readonly isGenerationRunning = this._isGenerationRunning.asReadonly();

  private readonly _settings = signal<ProducerSettings>({
    instrumentCount: 5,
    updatesPerBatch: 100,
    batchInterval: 500,
  });

  public readonly settings = this._settings.asReadonly();

  public applySettings(settings: ProducerSettings): void {
    this.stopProducer();

    this._settings.set(settings);

    this.startProducer();
  }

  public startProducer(): void {
    if (this.worker !== null) {
      return;
    }

    if (typeof Worker !== 'undefined') {
      this.worker = new Worker(new URL('../producer.worker', import.meta.url));

      this.worker.onmessage = (msg) => this.handleWorkerMessage(msg);
      this.worker.onerror = (evt) => this.handleWorkerError(evt);

      this.worker.postMessage(WorkerCmd.start(this.settings()));
    } else {
      throw new Error('Worker API is not suppored');
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
    console.error(`Worker failed with error ${error.message}`);
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
        console.log(`Recieved response: ${data.payload}`);
      }
    }
  }
}
