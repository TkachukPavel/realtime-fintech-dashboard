import { DecimalPipe } from '@angular/common';
import { inject, Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'nullableNumber',
})
export class NullableNumberPipe implements PipeTransform {
  private readonly numberPipe = inject(DecimalPipe);

  transform(value: number | null | undefined): string | null {
    if (value === null || value === undefined) {
      return 'N/A';
    }
    return this.numberPipe.transform(value, '1.3-3');
  }
}
