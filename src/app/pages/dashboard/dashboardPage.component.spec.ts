import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProducerService } from '../../shared/services/producer/producer.service';
import { DashboardComponent } from './dashboardPage.component';

describe('DashboardComponent', () => {
  let producerService: jasmine.SpyObj<ProducerService>;
  let fixture: ComponentFixture<DashboardComponent>;
  let component: DashboardComponent;

  beforeEach(async () => {
    producerService = jasmine.createSpyObj<ProducerService>(
      'ProducerService',
      ['startProducer', 'pauseProducer', 'startGeneration'],
      { isGenerationRunning: signal(false) },
    );

    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [{ provide: ProducerService, useValue: producerService }],
    }).compileComponents();

    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should expose the generation running state from the producer service', () => {
    expect(component.isGenerationRunning).toBe(producerService.isGenerationRunning);
  });

  it('should start the producer', () => {
    component.onStartProducer();

    expect(producerService.startGeneration).toHaveBeenCalled();
  });

  it('should pause the producer', () => {
    component.onPauseProducer();

    expect(producerService.pauseProducer).toHaveBeenCalled();
  });
});
