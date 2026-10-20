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
  let error: ReturnType<typeof signal<string | null>>;
  let metrics: ReturnType<typeof signal<InstrumentMetrics[]>>;
  let settings: ReturnType<typeof signal<ProducerSettings>>;

  beforeEach(async () => {
    generationRunning = signal(false);
    error = signal<string | null>(null);
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
        error,
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

    expect(fixture.nativeElement.textContent).toContain('Resume');
    expect(fixture.nativeElement.textContent).toContain('Market updates generation is stopped');

    generationRunning.set(true);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Pause');
    expect(fixture.nativeElement.textContent).toContain('Market updates generation is running');
  });

  it('displays producer initialization errors accessibly', () => {
    error.set('Generator initialization failed');

    fixture.detectChanges();

    const alert = fixture.nativeElement.querySelector('[role="alert"]');
    expect(alert).toBeTruthy();
    expect(alert.textContent).toContain('Generator initialization failed');
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
        notionalCents: 304500,
      },
      {
        ticker: 'BRVO',
        lastTradedPrice: null,
        bidAskSpread: null,
        tradingVolume: 0,
        vwap: null,
        orderBookImbalance: null,
        notionalCents: 0,
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

  it('wraps the data table in a horizontally scrollable region', () => {
    fixture.detectChanges();

    const scrollRegion = fixture.nativeElement.querySelector(
      '.table-scroll-container[role="region"][tabindex="0"]',
    );
    expect(scrollRegion).toBeTruthy();
    expect(scrollRegion.getAttribute('aria-label')).toBe('Data table');
    expect(scrollRegion.querySelector('table')).toBeTruthy();
    expect(getComputedStyle(scrollRegion).overflowX).toBe('auto');
  });

  it('starts the producer when the user selects Resume', () => {
    fixture.detectChanges();
    const resumeButton: HTMLButtonElement = fixture.nativeElement.querySelector('button');

    resumeButton.click();

    expect(producerService.startGeneration).toHaveBeenCalledOnceWith();
  });

  it('should pause the producer', () => {
    generationRunning.set(true);
    fixture.detectChanges();
    const pauseButton: HTMLButtonElement = fixture.nativeElement.querySelector('button');

    pauseButton.click();

    expect(producerService.pauseProducer).toHaveBeenCalled();
  });

  it('updates the Pause and Resume controls after producer state changes', () => {
    producerService.pauseProducer.and.callFake(() => generationRunning.set(false));
    producerService.startGeneration.and.callFake(() => generationRunning.set(true));
    fixture.detectChanges();

    generationRunning.set(true);
    fixture.detectChanges();
    let control: HTMLButtonElement = fixture.nativeElement.querySelector('button');
    expect(control.textContent).toContain('Pause');

    control.click();
    fixture.detectChanges();
    control = fixture.nativeElement.querySelector('button');
    expect(control.textContent).toContain('Resume');

    control.click();
    fixture.detectChanges();
    control = fixture.nativeElement.querySelector('button');
    expect(control.textContent).toContain('Pause');
  });
});
