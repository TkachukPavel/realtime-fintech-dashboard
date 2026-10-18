import { DecimalPipe } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { NullableNumberPipe } from './nullable-number-pipe';

describe('NullableNumberPipe', () => {
  let pipe: NullableNumberPipe;

  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [DecimalPipe] });
    pipe = TestBed.runInInjectionContext(() => new NullableNumberPipe());
  });

  it('formats values to three decimal places', () => {
    expect(pipe.transform(0.1254)).toBe('0.125');
  });

  it('returns N/A for unavailable values', () => {
    expect(pipe.transform(null)).toBe('N/A');
    expect(pipe.transform(undefined)).toBe('N/A');
  });
});
