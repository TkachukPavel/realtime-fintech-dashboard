import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

/**
 * Validates that the control value is an integer.
 * Empty values (null, undefined, '') are considered valid — combine with
 * `Validators.required` if the field is mandatory.
 *
 * @returns `{ integer: true }` when the value is not an integer, otherwise `null`.
 */
export function integerValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value;

    if (value === null || value === undefined || value === '') {
      return null;
    }

    return Number.isInteger(Number(value)) ? null : { integer: true };
  };
}
