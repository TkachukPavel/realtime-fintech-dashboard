import { Component, inject } from '@angular/core';
import { MatAnchor } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { ProducerService } from '../../shared/services/producer/producer.service';
import { CurrencyPipe, DecimalPipe } from '@angular/common';
import { NullableCurrencyPipe } from '../../shared/pipes/nullable-currency-pipe';
import { NullableNumberPipe } from '../../shared/pipes/nullable-number-pipe';

@Component({
  selector: 'app-dashboard',
  imports: [MatAnchor, MatTableModule, NullableCurrencyPipe, NullableNumberPipe],
  providers: [CurrencyPipe, DecimalPipe],
  templateUrl: './dashboardPage.component.html',
  styleUrl: './dashboardPage.component.scss',
})
export class DashboardComponent {
  private readonly producerService = inject(ProducerService);

  readonly isGenerationRunning = this.producerService.isGenerationRunning;
  readonly error = this.producerService.error;
  readonly generatorSettings = this.producerService.settings;

  readonly metrics = this.producerService.instrumentMetricsSig;

  readonly displayedColumns = [
    'instrument',
    'lastTradedPrice',
    'bidAskSpread',
    'tradingVolume',
    'vwap',
    'orderBookImbalance',
  ];

  public onStartProducer() {
    this.producerService.startGeneration();
  }

  public onPauseProducer() {
    this.producerService.pauseProducer();
  }
}
