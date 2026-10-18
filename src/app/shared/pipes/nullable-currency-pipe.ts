import { CurrencyPipe } from '@angular/common';
import { inject, Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'nullableCurrency',
})
export class NullableCurrencyPipe implements PipeTransform {
  private readonly currencyPipe = inject(CurrencyPipe);
  transform(value: number | null | undefined): string | null {
    if (value === null || value === undefined || value === Infinity) {
      return 'N/A';
    }

    return this.currencyPipe.transform(value / 100, 'USD', 'symbol', '1.2-2');
  }
}
