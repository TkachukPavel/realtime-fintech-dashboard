import { Injectable, signal } from '@angular/core';
import { ProducerSettings } from '../../../core/types/producer-settings.type';

@Injectable({
  providedIn: 'root',
})
export class ProducerService {
  private readonly _settings = signal<ProducerSettings>({
    instrumentCount: 5,
    updatesPerBatch: 100,
    batchInterval: 500,
  });

  public readonly settings = this._settings.asReadonly();

  public applySettings(settings: ProducerSettings): void {
    this._settings.set(settings);
  }
}
