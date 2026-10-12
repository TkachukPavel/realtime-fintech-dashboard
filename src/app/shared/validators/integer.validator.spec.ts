import { FormControl, ValidatorFn } from '@angular/forms';
import { integerValidator } from './integer.validator';

describe('integerValidator', () => {
  let validator: ValidatorFn;

  const validate = (value: unknown) => validator(new FormControl(value));

  beforeEach(() => {
    validator = integerValidator();
  });

  describe('integer values', () => {
    const integers: unknown[] = [0, 1, 42, -1, -42, 1000000, 1.0, -7.0];

    integers.forEach((value) => {
      it(`should return null for number ${value}`, () => {
        expect(validate(value)).toBeNull();
      });
    });

    const integerStrings = ['0', '1', '42', '-42', '+42', '1.0', '1.', '007', ' 42 '];

    integerStrings.forEach((value) => {
      it(`should return null for string "${value}"`, () => {
        expect(validate(value)).toBeNull();
      });
    });
  });

  describe('non-integer values', () => {
    const decimals: unknown[] = [0.5, 1.5, -1.5, 3.14159, 0.000001, -0.1];

    decimals.forEach((value) => {
      it(`should return { integer: true } for number ${value}`, () => {
        expect(validate(value)).toEqual({ integer: true });
      });
    });

    const invalidStrings = ['1.5', '-0.5', '.5', 'abc', '12abc', 'abc12', '1,000', '1_000', '1 2'];

    invalidStrings.forEach((value) => {
      it(`should return { integer: true } for string "${value}"`, () => {
        expect(validate(value)).toEqual({ integer: true });
      });
    });
  });

  describe('edge cases', () => {
    describe('empty values (treated as valid)', () => {
      it('should return null for null', () => {
        expect(validate(null)).toBeNull();
      });

      it('should return null for undefined', () => {
        expect(validate(undefined)).toBeNull();
      });

      it('should return null for empty string', () => {
        expect(validate('')).toBeNull();
      });
    });

    describe('zero', () => {
      it('should return null for -0', () => {
        expect(validate(-0)).toBeNull();
      });

      it('should return null for "-0"', () => {
        expect(validate('-0')).toBeNull();
      });
    });

    describe('safe integer boundaries', () => {
      it('should return null for Number.MAX_SAFE_INTEGER', () => {
        expect(validate(Number.MAX_SAFE_INTEGER)).toBeNull();
      });

      it('should return null for Number.MIN_SAFE_INTEGER', () => {
        expect(validate(Number.MIN_SAFE_INTEGER)).toBeNull();
      });

      it('should return null for Number.MAX_VALUE (it is integral)', () => {
        expect(validate(Number.MAX_VALUE)).toBeNull();
      });

      it('should return { integer: true } for Number.MIN_VALUE', () => {
        expect(validate(Number.MIN_VALUE)).toEqual({ integer: true });
      });

      it('should return { integer: true } for Number.EPSILON', () => {
        expect(validate(Number.EPSILON)).toEqual({ integer: true });
      });

      it('should return { integer: true } for 1 + Number.EPSILON', () => {
        expect(validate(1 + Number.EPSILON)).toEqual({ integer: true });
      });
    });

    describe('floating point precision', () => {
      it('should return { integer: true } for 0.1 + 0.2', () => {
        expect(validate(0.1 + 0.2)).toEqual({ integer: true });
      });

      it('should return null for 0.1 * 10 (rounds to exactly 1)', () => {
        expect(validate(0.1 * 10)).toBeNull();
      });

      it('should return null for a decimal beyond float precision ("9007199254740993.5")', () => {
        // Precision is lost when parsing, so the value collapses to an integer.
        expect(validate('9007199254740993.5')).toBeNull();
      });
    });

    describe('non-finite values', () => {
      it('should return { integer: true } for NaN', () => {
        expect(validate(NaN)).toEqual({ integer: true });
      });

      it('should return { integer: true } for Infinity', () => {
        expect(validate(Infinity)).toEqual({ integer: true });
      });

      it('should return { integer: true } for -Infinity', () => {
        expect(validate(-Infinity)).toEqual({ integer: true });
      });

      it('should return { integer: true } for "Infinity"', () => {
        expect(validate('Infinity')).toEqual({ integer: true });
      });

      it('should return { integer: true } for "NaN"', () => {
        expect(validate('NaN')).toEqual({ integer: true });
      });
    });

    describe('non-decimal numeric string literals', () => {
      it('should return null for hex string "0x1A"', () => {
        expect(validate('0x1A')).toBeNull();
      });

      it('should return null for binary string "0b101"', () => {
        expect(validate('0b101')).toBeNull();
      });

      it('should return null for octal string "0o17"', () => {
        expect(validate('0o17')).toBeNull();
      });
    });

    describe('non-string / non-number types', () => {
      it('should return { integer: true } for an object', () => {
        expect(validate({})).toEqual({ integer: true });
      });

      it('should return { integer: true } for an array with multiple items', () => {
        expect(validate([1, 2])).toEqual({ integer: true });
      });

      // The following document current behaviour caused by `Number()` coercion.
      it('should return null for whitespace-only string (coerced to 0)', () => {
        expect(validate('   ')).toBeNull();
      });

      it('should return null for booleans (coerced to 1 / 0)', () => {
        expect(validate(true)).toBeNull();
        expect(validate(false)).toBeNull();
      });

      it('should return null for an empty array (coerced to 0)', () => {
        expect(validate([])).toBeNull();
      });
    });
  });

  describe('scientific notation', () => {
    const integerScientific: [unknown, string][] = [
      [1e3, '1e3 -> 1000'],
      [1.5e3, '1.5e3 -> 1500'],
      [1.5e1, '1.5e1 -> 15'],
      [-2e2, '-2e2 -> -200'],
      [1e21, '1e21 (large exponent)'],
      [1e308, '1e308 (near max)'],
      [0e5, '0e5 -> 0'],
    ];

    integerScientific.forEach(([value, label]) => {
      it(`should return null for number ${label}`, () => {
        expect(validate(value)).toBeNull();
      });
    });

    const integerScientificStrings = ['1e3', '1E3', '1e+3', '1.5e3', '-2e2', '250e-1'];

    integerScientificStrings.forEach((value) => {
      it(`should return null for string "${value}"`, () => {
        expect(validate(value)).toBeNull();
      });
    });

    const nonIntegerScientific: [unknown, string][] = [
      [1e-3, '1e-3 -> 0.001'],
      [1.23e1, '1.23e1 -> 12.3'],
      [-5e-1, '-5e-1 -> -0.5'],
      [1e-7, '1e-7 (renders as "1e-7")'],
    ];

    nonIntegerScientific.forEach(([value, label]) => {
      it(`should return { integer: true } for number ${label}`, () => {
        expect(validate(value)).toEqual({ integer: true });
      });
    });

    const nonIntegerScientificStrings = ['1e-3', '1.23e1', '1E-1', '1e', 'e5', '1e3.5', '1e1e1'];

    nonIntegerScientificStrings.forEach((value) => {
      it(`should return { integer: true } for string "${value}"`, () => {
        expect(validate(value)).toEqual({ integer: true });
      });
    });

    it('should return { integer: true } for string "1e309" (overflows to Infinity)', () => {
      expect(validate('1e309')).toEqual({ integer: true });
    });
  });
});
