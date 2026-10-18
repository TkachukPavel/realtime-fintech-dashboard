import { TestBed } from '@angular/core/testing';
import { App } from './app';
import { provideRouter } from '@angular/router';
import { routes } from './app.routes';
import { ProducerService } from './shared/services/producer/producer.service';

describe('App', () => {
  let producerService: jasmine.SpyObj<ProducerService>;

  beforeEach(async () => {
    producerService = jasmine.createSpyObj<ProducerService>('ProducerService', ['startGeneration']);

    await TestBed.configureTestingModule({
      imports: [App],
      providers: [
        provideRouter(routes),
        { provide: ProducerService, useValue: producerService },
      ]
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(App);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

  it('starts market generation when the application initializes', () => {
    const fixture = TestBed.createComponent(App);

    fixture.detectChanges();

    expect(producerService.startGeneration).toHaveBeenCalledOnceWith();
  });
});
