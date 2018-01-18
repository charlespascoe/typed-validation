import { keysOf, tryCatch } from './utils';
import {
  ArrayIndexPathNode,
  error,
  errorFromException,
  ErrorResult,
  SuccessResult,
  KeyPathNode,
  success,
  ValidationError,
  ValidationResult,
} from './validation-result';
export * from './validation-result';


export type Validator<T> = {
  [key in keyof T]: (arg: any) => ValidationResult<T[key]>
};


export type Validated<T> = {
  [key in keyof T]: T[key];
}


export interface ILength {
  length: number;
}


export interface IValidationOptions {
  allowAdditionalProperties?: boolean;
}


export function validate<T>(arg: any, assertion: (arg: any) => ValidationResult<T>): ValidationResult<T> {
  return tryCatch(
    () => assertion(arg),
    (err) => errorFromException(err)
  );
}


export function extendValidator<T,U>(validator1: Validator<T>, validator2: Validator<U>): Validator<T & U> {
  const result: any = {};

  for (const key in validator1) {
    result[key] = validator1[key];
  }

  for (const key in validator2) {
    result[key] = validator2[key];
  }

  return result as Validator<T & U>;
}


// ASSERTIONS //


export function conformsTo<T>(validator: Validator<T>): (arg: any) => ValidationResult<Validated<T>>;
export function conformsTo<T>(validator: Validator<T>, options: IValidationOptions): (arg: any) => ValidationResult<Validated<T>>;
export function conformsTo<T,U>(validator: Validator<T>, next: (arg: Validated<T>) => ValidationResult<U>): (arg: any) => ValidationResult<U>;
export function conformsTo<T,U>(validator: Validator<T>, options: IValidationOptions, next: (arg: Validated<T>) => ValidationResult<U>): (arg: any) => ValidationResult<U>;
export function conformsTo<T>(validator: Validator<T>, optionsOrNext?: IValidationOptions | ((arg: Validated<T>) => ValidationResult<any>), next?: (arg: Validated<T>) => ValidationResult<any>): (arg: any) => ValidationResult<any> {
  return isObject((arg: any) => {
    const options: IValidationOptions = typeof optionsOrNext === 'object' ? optionsOrNext : {};
    const nextAssertion: ((arg: Validated<T>) => any) | undefined = typeof optionsOrNext === 'function' ? optionsOrNext : next;
    const {
      allowAdditionalProperties = true
    } = options;

    const partiallyValidated: {[key in keyof T]?: T[key]} = {};

    const errors: ValidationError[] = keysOf(validator).reduce((errors, key) => {
      const result = tryCatch(
        () => validator[key](arg[key]),
        (err) => errorFromException(err)
      );

      if (!result.success) {
        return errors.concat(result.addPathNode(new KeyPathNode(key)).errors);
      }

      partiallyValidated[key] = result.value;
      return errors;
    }, [] as ValidationError[]);

    if (!allowAdditionalProperties) {
      const additionalProperties = keysOf(arg).filter(key => !validator.hasOwnProperty(key));

      if (additionalProperties.length > 0) {
        errors.push(
          new ValidationError(
            'UNEXPECTED_ADDITIONAL_PROPERTIES',
            `Unexpected additional propert${additionalProperties.length === 1 ? 'y' : 'ies'}: ${additionalProperties.join(', ')}`
          )
        );
      }
    }

    if (errors.length > 0) return new ErrorResult(errors);

    const validated = partiallyValidated as Validated<T>;

    return next ? next(validated) : success(validated);
  });
}


export function optional(): (arg: any) => ValidationResult<any | undefined>;
export function optional<T>(next: (arg: any) => ValidationResult<T>): (arg: any) => ValidationResult<T | undefined>;
export function optional(next?: (arg: any) => ValidationResult<any>): (arg: any) => ValidationResult<any | undefined> {
  return (arg: any) => {
    if (arg === undefined) return success(undefined);
    return next ? next(arg) : success(arg);
  };
}


export function nullable(): (arg: any) => ValidationResult<any | null>;
export function nullable<T>(next: (arg: any) => ValidationResult<T>): (arg: any) => ValidationResult<T | null>;
export function nullable(next?: (arg: any) => ValidationResult<any>): (arg: any) => ValidationResult<any | null> {
  return (arg: any) => {
    if (arg === null) return success(null);
    return next ? next(arg) : success(arg);
  };
}


export function defaultsTo(def: any): (arg: any) => ValidationResult<any>;
export function defaultsTo<T>(def: T, next: (arg: any) => ValidationResult<T>): (arg: any) => ValidationResult<T>;
export function defaultsTo(def: any, next?: (arg: any) => ValidationResult<any>): (arg: any) => ValidationResult<any> {
  return (arg: any) => {
    if (arg === undefined) arg = def;
    return next ? next(arg) : success(arg);
  };
}


export function onErrorDefaultsTo<T,U>(def: U, next: (arg: T) => ValidationResult<U>): (arg: T) => ValidationResult<U> {
  return (arg: T) => {
    const result = tryCatch(
      () => next(arg),
      (err) => errorFromException(err)
    );

    if (result.success) return result;

    // Ignore error - resort to default
    return success(def);
  };
}


export function isBoolean(): (arg: any) => ValidationResult<boolean>;
export function isBoolean<T=boolean>(next: (arg: boolean) => ValidationResult<T>): (arg: any) => ValidationResult<T>;
export function isBoolean(next?: (arg: boolean) => ValidationResult<any>): (arg: any) => ValidationResult<any> {
  return (arg: any) => {
    if (typeof arg !== 'boolean') return error('NOT_BOOLEAN', `Expected boolean, got ${typeof arg}`);
    return next ? next(arg) : success(arg);
  };
}


export function isNumber(): (arg: any) => ValidationResult<number>;
export function isNumber<T=number>(next: (arg: number) => ValidationResult<T>): (arg: any) => ValidationResult<T>;
export function isNumber(next?: (arg: number) => any): (arg: any) => ValidationResult<any> {
  return (arg: any) => {
    if (typeof arg !== 'number') return error('NOT_NUMBER', `Expected number, got ${typeof arg}`);
    return next ? next(arg) : success(arg);
  };
}


export function min(min: number): (arg: number) => ValidationResult<number>;
export function min<T=number>(min: number, next: (arg: number) => ValidationResult<T>): (arg: number) => ValidationResult<T>;
export function min(min: number, next?: (arg: number) => ValidationResult<any>): (arg: number) => ValidationResult<any> {
  return (arg: number) => {
    if (arg < min) return error('LESS_THAN_MIN', `${arg} is less than ${min}`);
    return next ? next(arg) : success(arg);
  };
}


export function max(max: number): (arg: number) => ValidationResult<number>;
export function max<T=number>(max: number, next: (arg: number) => ValidationResult<T>): (arg: number) => ValidationResult<T>;
export function max(max: number, next?: (arg: number) => ValidationResult<any>): (arg: number) => ValidationResult<any> {
  return (arg: number) => {
    if (arg > max) return error('GREATER_THAN_MAX', `${arg} is greater than ${max}`);
    return next ? next(arg) : success(arg);
  };
}


export function isString(): (arg: any) => ValidationResult<string>;
export function isString<T=string>(next: (arg: string) => ValidationResult<T>): (arg: any) => ValidationResult<T>;
export function isString(next?: (arg: any) => ValidationResult<any>): (arg: any) => ValidationResult<any> {
  return (arg: any) => {
    if (typeof arg !== 'string') return error('NOT_STRING', `Expected string, got ${typeof arg}`);
    return next ? next(arg) : success(arg);
  };
}


export function matches(regex: RegExp): (arg: string) => ValidationResult<string>;
export function matches<T=string>(regex: RegExp, next: (arg: string) => ValidationResult<T>): (arg: string) => ValidationResult<T>;
export function matches(regex: RegExp, next?: (arg: string) => ValidationResult<any>): (arg: string) => ValidationResult<any> {
  return (arg: string) => {
    if (!regex.test(arg)) return error('FAILED_REGEXP', `Failed regular expression ${regex.toString()}`);
    return next ? next(arg) : success(arg);
  };
}


export function minLength<T extends ILength>(min: number): (arg: T) => ValidationResult<T>;
export function minLength<T extends ILength,U=T>(min: number, next: (arg: T) => ValidationResult<U>): (arg: T) => ValidationResult<U>;
export function minLength<T extends ILength>(min: number, next?: (arg: T) => ValidationResult<any>): (arg: T) => ValidationResult<any> {
  return (arg: T) => {
    if (arg.length < min) return error('LESS_THAN_MIN_LENGTH', `Length ${arg.length} is less than ${min}`);
    return next ? next(arg) : success(arg);
  };
}


export function maxLength<T extends ILength>(max: number): (arg: T) => ValidationResult<T>;
export function maxLength<T extends ILength,U=T>(max: number, next: (arg: T) => ValidationResult<U>): (arg: T) => ValidationResult<U>;
export function maxLength<T extends ILength>(max: number, next?: (arg: T) => ValidationResult<any>): (arg: T) => ValidationResult<any> {
  return (arg: T) => {
    if (arg.length > max) return error('GREATER_THAN_MAX_LENGTH', `Length ${arg.length} is greater than ${max}`);
    return next ? next(arg) : success(arg);
  };
}


export function lengthIs<T extends ILength>(length: number): (arg: T) => ValidationResult<T>;
export function lengthIs<T extends ILength,U=T>(length: number, next: (arg: T) => ValidationResult<U>): (arg: T) => ValidationResult<U>;
export function lengthIs<T extends ILength>(length: number, next?: (arg: T) => ValidationResult<any>): (arg: T) => ValidationResult<any> {
  return (arg: T) => {
    if (arg.length !== length) return error('LENGTH_NOT_EQUAL', `Length ${arg.length} is not equal to ${length}`);
    return next ? next(arg) : success(arg);
  };
}


export function isArray(): (arg: any) => ValidationResult<any[]>;
export function isArray<T>(next: (arg: any[]) => ValidationResult<T>): (arg: any) => ValidationResult<T>;
export function isArray(next?: (arg: any[]) => ValidationResult<any>): (arg: any) => ValidationResult<any> {
  return (arg: any) => {
    if (!(arg instanceof Array)) return error('NOT_ARRAY', `Expected array, got ${typeof arg}`);
    return next ? next(arg) : success(arg);
  };
}


export function eachItem<T>(assertion: (arg: any) => ValidationResult<T>): (arg: any[]) => ValidationResult<T[]>;
export function eachItem<T,U>(assertion: (arg: any) => ValidationResult<T>, next: (arg: T[]) => ValidationResult<U>): (arg: any[]) => ValidationResult<U>;
export function eachItem<T>(assertion: (arg: any) => ValidationResult<T>, next?: (arg: any[]) => ValidationResult<any>): (arg: any[]) => ValidationResult<any> {
  return (arg: any[]) => {
    const results = arg.map((item, index) => tryCatch(
      () => assertion(item),
      (err) => errorFromException(err)
    ));

    if (results.some(ErrorResult.isErrorResult)) {
      return new ErrorResult(
        results
          .map((item, index) => {
            if (!item.success) item.addPathNode(new ArrayIndexPathNode(index));
            return item;
          })
          .filter<ErrorResult>(ErrorResult.isErrorResult)
          .reduce((errors, result) => errors.concat(result.errors), [] as ValidationError[])
      );
    }

    const mapped = (results as SuccessResult<T>[]).map(result => result.value);

    return next ? next(mapped) : success(mapped);
  };
}


export function isObject(): (arg: any) => ValidationResult<any>;
export function isObject<T>(next: (arg: any) => ValidationResult<T>): (arg: any) => ValidationResult<T>;
export function isObject(next?: (arg: any) => ValidationResult<any>): (arg: any) => ValidationResult<any> {
  return (arg: any) => {
    if (typeof arg !== 'object' || arg instanceof Array) return error('NOT_OBJECT', `Expected object, got ${arg instanceof Array ? 'array' : typeof arg}`);
    return next ? next(arg) : success(arg);
  };
}


export function equals<T>(value: T, ...values: T[]): (arg: any) => ValidationResult<T> {
  const vals = [value, ...values];

  return (arg: any) => {
    for (const val of vals) {
      if (val === arg) return success(arg);
    }

    return error('NOT_EQUAL', vals.length === 1 ? `'${arg}' does not equal '${vals[0]}'` : `'${arg}' not one of: ${vals.join(', ')}`);
  };
}


export function isMap(): (arg: any) => ValidationResult<{[key: string]: any}>;
export function isMap<T>(next: (arg: {[key: string]: any}) => ValidationResult<T>): (arg: any) => ValidationResult<T>;
export function isMap(next?: (arg: any) => ValidationResult<any>): (arg: any) => ValidationResult<any> {
  return isObject((arg: any) => {
    const nonStringKeys = keysOf(arg).filter(key => typeof key !== 'string');

    if (nonStringKeys.length > 0) {
      return error('NOT_STRING_KEY', `Expected string keys, got: ${nonStringKeys.map(key => `${key} (${typeof key})`)}`);
    }

    return next ? next(arg) : success(arg);
  });
}


export function eachValue<T>(assertion: (arg: any) => ValidationResult<T>): (arg: {[key: string]: any}) => ValidationResult<{[key: string]: T}>;
export function eachValue<T,U>(assertion: (arg: any) => ValidationResult<T>, next: (arg: {[key: string]: T}) => ValidationResult<U>): (arg: {[key: string]: any}) => ValidationResult<U>;
export function eachValue<T>(assertion: (arg: any) => ValidationResult<T>, next?: (arg: {[key: string]: T}) => ValidationResult<any>): (arg: {[key: string]: any}) => ValidationResult<any> {
  return (arg: {[key: string]: any}) => {
    return conformsTo(
      Object.keys(arg).reduce(
        (validator, key) => {
          validator[key] = assertion;
          return validator;
        },
        {} as Validator<{[key: string]: T}>
      )
    )(arg);
  };
}


export function either<A,B>(assertion1: (arg: any) => ValidationResult<A>, assertion2: (arg: any) => ValidationResult<B>): (arg: any) => ValidationResult<A | B>;
export function either<A,B,C>(assertion1: (arg: any) => ValidationResult<A>, assertion2: (arg: any) => ValidationResult<B>, assertion3: (arg: any) => ValidationResult<C>): (arg: any) => ValidationResult<A | B | C>;
export function either<A,B,C,D>(assertion1: (arg: any) => ValidationResult<A>, assertion2: (arg: any) => ValidationResult<B>, assertion3: (arg: any) => ValidationResult<C>, assertion4: (arg: any) => ValidationResult<D>): (arg: any) => ValidationResult<A | B | C | D>;
export function either<A,B,C,D,E>(assertion1: (arg: any) => ValidationResult<A>, assertion2: (arg: any) => ValidationResult<B>, assertion3: (arg: any) => ValidationResult<C>, assertion4: (arg: any) => ValidationResult<D>, assertion5: (arg: any) => ValidationResult<E>): (arg: any) => ValidationResult<A | B | C | D | E>;
export function either<A,B,C,D,E,F>(assertion1: (arg: any) => ValidationResult<A>, assertion2: (arg: any) => ValidationResult<B>, assertion3: (arg: any) => ValidationResult<C>, assertion4: (arg: any) => ValidationResult<D>, assertion5: (arg: any) => ValidationResult<E>, assertion6: (arg: any) => ValidationResult<F>): (arg: any) => ValidationResult<A | B | C | D | E | F>;
export function either<A,B,C,D,E,F,G>(assertion1: (arg: any) => ValidationResult<A>, assertion2: (arg: any) => ValidationResult<B>, assertion3: (arg: any) => ValidationResult<C>, assertion4: (arg: any) => ValidationResult<D>, assertion5: (arg: any) => ValidationResult<E>, assertion6: (arg: any) => ValidationResult<F>, assertion7: (arg: any) => ValidationResult<G>): (arg: any) => ValidationResult<A | B | C | D | E | F | G>;
export function either<A,B,C,D,E,F,G,H>(assertion1: (arg: any) => ValidationResult<A>, assertion2: (arg: any) => ValidationResult<B>, assertion3: (arg: any) => ValidationResult<C>, assertion4: (arg: any) => ValidationResult<D>, assertion5: (arg: any) => ValidationResult<E>, assertion6: (arg: any) => ValidationResult<F>, assertion7: (arg: any) => ValidationResult<G>, assertion8: (arg: any) => ValidationResult<H>): (arg: any) => ValidationResult<A | B | C | D | E | F | G | H>;
export function either<A,B,C,D,E,F,G,H,I>(assertion1: (arg: any) => ValidationResult<A>, assertion2: (arg: any) => ValidationResult<B>, assertion3: (arg: any) => ValidationResult<C>, assertion4: (arg: any) => ValidationResult<D>, assertion5: (arg: any) => ValidationResult<E>, assertion6: (arg: any) => ValidationResult<F>, assertion7: (arg: any) => ValidationResult<G>, assertion8: (arg: any) => ValidationResult<H>, assertion9: (arg: any) => ValidationResult<I>): (arg: any) => ValidationResult<A | B | C | D | E | F | G | H | I>;
export function either<A,B,C,D,E,F,G,H,I,J>(assertion1: (arg: any) => ValidationResult<A>, assertion2: (arg: any) => ValidationResult<B>, assertion3: (arg: any) => ValidationResult<C>, assertion4: (arg: any) => ValidationResult<D>, assertion5: (arg: any) => ValidationResult<E>, assertion6: (arg: any) => ValidationResult<F>, assertion7: (arg: any) => ValidationResult<G>, assertion8: (arg: any) => ValidationResult<H>, assertion9: (arg: any) => ValidationResult<I>, assertion10: (arg: any) => ValidationResult<J>): (arg: any) => ValidationResult<A | B | C | D | E | F | G | H | I | J>;
export function either(...assertions: Array<(arg: any) => any>): (arg: any) => any {
  return (arg: any) => {
    let errors: ValidationError[] = [];

    for (const assertion of assertions) {
      const result = assertion(arg);

      if (result.success) {
        return result;
      }

      errors = errors.concat(result.errors);
    }

    return error('NO_MATCH', 'No match found - the following assertions failed:\n    ' + errors.map(error => error.toString()).join('\n    '));
  };
}
