import { Component, inject } from '@angular/core';
import { MatAnchor } from '@angular/material/button';
import { ProducerService } from '../../shared/services/producer/producer.service';

@Component({
  selector: 'app-dashboard',
  imports: [MatAnchor],
  templateUrl: './dashboardPage.component.html',
  styleUrl: './dashboardPage.component.scss',
})
export class DashboardComponent {
  private readonly producerService = inject(ProducerService);

  readonly isGenerationRunning = this.producerService.isGenerationRunning;

  public onStartProducer() {
    this.producerService.startGeneration();
  }

  public onPauseProducer() {
    this.producerService.pauseProducer();
  }
}
