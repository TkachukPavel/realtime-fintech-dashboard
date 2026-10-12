import { TestBed } from '@angular/core/testing';

import { ProducerService } from './producer.service';
import { ProducerSettings } from '../../../core/types/producer-settings.type';

describe('ProducerService', () => {
  let service: ProducerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ProducerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should update settings when applySettings is called', () => {
    const settings: ProducerSettings = {
      instrumentCount: 1,
      batchInterval: 200,
      updatesPerBatch: 200,
    };

    service.applySettings(settings);

    expect(service.settings()).toEqual(settings);
  });
});
