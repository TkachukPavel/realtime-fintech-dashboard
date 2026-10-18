import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { InstrumentMetrics } from '../../core/types/instrument-metrics.type';
import { ProducerSettings } from '../../core/types/producer-settings.type';
import { ProducerService } from '../../shared/services/producer/producer.service';
import { DashboardComponent } from './dashboardPage.component';

describe('DashboardComponent', () => {
  let producerService: jasmine.SpyObj<ProducerService>;
  let fixture: ComponentFixture<DashboardComponent>;
  let component: DashboardComponent;
  let generationRunning: ReturnType<typeof signal<boolean>>;
  let metrics: ReturnType<typeof signal<InstrumentMetrics[]>>;
  let settings: ReturnType<typeof signal<ProducerSettings>>;

  beforeEach(async () => {
    generationRunning = signal(false);
    metrics = signal<InstrumentMetrics[]>([]);
    settings = signal<ProducerSettings>({
      instrumentCount: 2,
      updatesPerBatch: 100,
      batchInterval: 500,
    });
    producerService = jasmine.createSpyObj<ProducerService>(
      'ProducerService',
      ['startProducer', 'pauseProducer', 'startGeneration'],
      {
        isGenerationRunning: generationRunning,
        instrumentMetricsSig: metrics,
        settings,
      },
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

  it('exposes producer settings and instrument metrics', () => {
    expect(component.generatorSettings).toBe(settings);
    expect(component.metrics).toBe(metrics);
  });

  it('shows controls and status for the current generation state', () => {
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Start producer');
    expect(fixture.nativeElement.textContent).toContain('Market updates generation is stopped');

    generationRunning.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Pause producer');
    expect(fixture.nativeElement.textContent).toContain('Market updates generation is running');
  });

  it('renders each instrument metric row with formatted values', () => {
    metrics.set([
      {
        ticker: 'ALFA',
        lastTradedPrice: 10200,
        bidAskSpread: 4,
        tradingVolume: 30,
        vwap: 10150,
        orderBookImbalance: 0.125,
        tradexprice: 304500,
      },
      {
        ticker: 'BRVO',
        lastTradedPrice: null,
        bidAskSpread: null,
        tradingVolume: 0,
        vwap: null,
        orderBookImbalance: null,
        tradexprice: 0,
      },
    ]);

    fixture.detectChanges();

    const rows = fixture.nativeElement.querySelectorAll('tr[mat-row]');
    expect(rows.length).toBe(2);
    expect(rows[0].textContent).toContain('ALFA');
    expect(rows[0].textContent).toContain('$102.00');
    expect(rows[0].textContent).toContain('$0.04');
    expect(rows[0].textContent).toContain('30');
    expect(rows[0].textContent).toContain('$101.50');
    expect(rows[0].textContent).toContain('0.125');
    expect(rows[1].textContent).toContain('N/A');
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
