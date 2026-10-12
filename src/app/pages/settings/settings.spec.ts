import { signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ProducerService } from '../../shared/services/producer/producer.service';
import { Settings } from './settings';

describe('Settings', () => {
  let fixture: ComponentFixture<Settings>;
  let component: Settings;
  let applySettings: jasmine.Spy;

  const initialSettings = {
    instrumentCount: 10,
    updatesPerBatch: 100,
    batchInterval: 500,
  };

  beforeEach(async () => {
    applySettings = jasmine.createSpy('applySettings');

    await TestBed.configureTestingModule({
      imports: [Settings],
      providers: [
        {
          provide: ProducerService,
          useValue: {
            settings: signal(initialSettings),
            applySettings,
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(Settings);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function getSubmitButton(): HTMLButtonElement {
    return fixture.nativeElement.querySelector('button[type="submit"]');
  }

  it('presets the form with values from producer settings', () => {
    expect(component.form.getRawValue()).toEqual(initialSettings);
  });

  it('validates required, minimum, maximum, and integer constraints', () => {
    const constraints = [
      { field: 'instrumentCount', minimum: 1, maximum: 50 },
      { field: 'updatesPerBatch', minimum: 1, maximum: 1000 },
      { field: 'batchInterval', minimum: 50, maximum: 2000 },
    ] as const;

    for (const { field, minimum, maximum } of constraints) {
      const control = component.form.controls[field];
      expect(control.valid).withContext(`${field} starts valid`).toBeTrue();

      control.setValue(null as never);
      expect(control.hasError('required')).withContext(`${field} is required`).toBeTrue();

      control.setValue(minimum - 1);
      expect(control.hasError('min')).withContext(`${field} enforces its minimum`).toBeTrue();

      control.setValue(maximum + 1);
      expect(control.hasError('max')).withContext(`${field} enforces its maximum`).toBeTrue();

      control.setValue(minimum + 0.5);
      expect(control.invalid).withContext(`${field} must be an integer`).toBeTrue();

      control.setValue(minimum);
      expect(control.valid).withContext(`${field} accepts its minimum`).toBeTrue();
    }
  });

  it('does not apply settings when the form is invalid', () => {
    component.form.controls.instrumentCount.setValue(0);

    component.onSubmit();

    expect(applySettings).not.toHaveBeenCalled();
  });

  it('disables the submit button when the form is invalid or disabled', () => {
    const button = getSubmitButton();

    component.form.controls.instrumentCount.setValue(0);
    fixture.detectChanges();
    expect(button.disabled).toBeTrue();

    component.form.controls.instrumentCount.setValue(initialSettings.instrumentCount);
    component.form.disable();
    fixture.detectChanges();
    expect(button.disabled).toBeTrue();
  });

  it('applies the form values when submitted with a valid form', () => {
    const updatedSettings = {
      instrumentCount: 25,
      updatesPerBatch: 250,
      batchInterval: 750,
    };
    component.form.setValue(updatedSettings);

    component.onSubmit();

    expect(applySettings).toHaveBeenCalledOnceWith(updatedSettings);
    expect(component.form.enabled).toBeTrue();
  });
});
