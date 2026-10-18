import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import {
  FormBuilder,
  NonNullableFormBuilder,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { integerValidator } from '../../shared/validators';
import { ProducerService } from '../../shared/services/producer/producer.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-settings',
  imports: [CommonModule, ReactiveFormsModule, MatButtonModule, MatFormFieldModule, MatInputModule],
  templateUrl: './settingsPage.component.html',
  styleUrl: './settingsPage.component.scss',
})
export class SettingsComponent {
  private readonly fb = inject(NonNullableFormBuilder);
  private readonly router = inject(Router);
  private readonly producerService = inject(ProducerService);

  public readonly form = this.fb.group({
    instrumentCount: [
      this.producerService.settings().instrumentCount,
      [Validators.required, Validators.min(1), Validators.max(50), integerValidator()],
    ],
    updatesPerBatch: [
      this.producerService.settings().updatesPerBatch,
      [Validators.required, Validators.min(1), Validators.max(1000), integerValidator()],
    ],
    batchInterval: [
      this.producerService.settings().batchInterval,
      [Validators.required, Validators.min(50), Validators.max(2000), integerValidator()],
    ],
  });

  public onSubmit(): void {
    if (this.form.invalid) return;

    this.form.disable();

    this.producerService.applySettings(this.form.getRawValue());

    this.form.enable();
    this.router.navigate(['dashboard']);
  }
}
