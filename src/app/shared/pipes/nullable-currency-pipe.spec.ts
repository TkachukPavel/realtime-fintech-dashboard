import { CurrencyPipe } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { NullableCurrencyPipe } from './nullable-currency-pipe';

describe('NullableCurrencyPipe', () => {
  let pipe: NullableCurrencyPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [CurrencyPipe] });
    pipe = TestBed.runInInjectionContext(() => new NullableCurrencyPipe());
  });

  it('formats cents as USD currency', () => {
    expect(pipe.transform(10200)).toBe('$102.00');
  });

  it('returns N/A for unavailable or infinite values', () => {
    expect(pipe.transform(null)).toBe('N/A');
    expect(pipe.transform(undefined)).toBe('N/A');
    expect(pipe.transform(Infinity)).toBe('N/A');
  });
});
