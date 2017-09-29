export type Validator<T> = {
  [key in keyof T]: (arg: any) => T[key]
};


export type Validated<T> = {
  [key in keyof T]: T[key];
}


export interface ILength {
  length: number;
}


export function validate<T>(arg: any, validator: Validator<T>): Validated<T> {
  if (typeof arg !== 'object') throw new Error('Not an object');

  let result: {[key in keyof T]?: T[key]} = {};

  for (let key in validator) {
    result[key] = validator[key](arg[key]);
  }

  return result as Validated<T>;
}


export function assertThat<T>(name: string, assertion: (arg: any) => T): (arg: any) => T {
  return (arg: any) => {
    try {
      return assertion(arg);
    } catch (err) {
      throw new Error(`Assertion failed for ${name}:\n  ${err.message.split('\n').join('\n  ')}`);
    }
  };
}


// ASSERTIONS //


export function optional<T>(next: (arg: any) => T): (arg: any) => T | undefined {
  return (arg: any) => {
    if (arg === undefined) return undefined;
    return next(arg);
  };
}


export function defaultsTo(def: any): (arg: any) => any;
export function defaultsTo<T>(def: T, next: (arg: any) => T): (arg: any) => T;
export function defaultsTo(def: any, next?: (arg: any) => any): (arg: any) => any {
  return (arg: any) => {
    if (arg === undefined) arg = def;
    return next ? next(arg) : arg;
  };
}


export function onErrorDefaultsTo<T,U>(def: U, next: (arg: T) => U): (arg: T) => U {
  return (arg: T) => {
    try {
      return next(arg);
    } catch (_) {
      // Ignore error - resort to default
      return def;
    }
  };
}


export function isBoolean(): (arg: any) => boolean;
export function isBoolean<T=boolean>(next: (arg: boolean) => T): (arg: any) => T;
export function isBoolean(next?: (arg: boolean) => any): (arg: any) => any {
  return (arg: any) => {
    if (typeof arg !== 'boolean') throw new Error('Not a boolean');
    return next ? next(arg) : arg;
  };
}


export function isNumber(): (arg: any) => number;
export function isNumber<T=number>(next: (arg: number) => T): (arg: any) => T;
export function isNumber(next?: (arg: number) => any): (arg: any) => any {
  return (arg: any) => {
    if (typeof arg !== 'number') throw new Error('Not a number');
    return next ? next(arg) : arg;
  };
}


export function min(min: number): (arg: number) => number;
export function min<T=number>(min: number, next: (arg: number) => T): (arg: number) => T;
export function min(min: number, next?: (arg: number) => any): (arg: number) => any {
  return (arg: number) => {
    if (arg < min) throw new Error(`${arg} is less than ${min}`);
    return next ? next(arg) : arg;
  };
}


export function max(max: number): (arg: number) => number;
export function max<T=number>(max: number, next: (arg: number) => T): (arg: number) => T;
export function max(max: number, next?: (arg: number) => any): (arg: number) => any {
  return (arg: number) => {
    if (arg > max) throw new Error(`${arg} is greater than ${max}`);
    return next ? next(arg) : arg;
  };
}


export function isString(): (arg: any) => string;
export function isString<T=string>(next: (arg: string) => T): (arg: any) => T;
export function isString(next?: (arg: any) => any): (arg: any) => any {
  return (arg: any) => {
    if (typeof arg !== 'string') throw new Error('Not a string');
    return next ? next(arg) : arg;
  };
}


export function matches(regex: RegExp): (arg: string) => string;
export function matches<T=string>(regex: RegExp, next: (arg: string) => T): (arg: string) => T;
export function matches(regex: RegExp, next?: (arg: string) => any): (arg: string) => any {
  return (arg: string) => {
    if (!regex.test(arg)) throw new Error(`Failed regular expression: ${regex.toString()}`);
    return next ? next(arg) : arg;
  };
}


export function minLength<T extends ILength>(min: number): (arg: T) => T;
export function minLength<T extends ILength,U=T>(min: number, next: (arg: T) => U): (arg: T) => U;
export function minLength<T extends ILength>(min: number, next?: (arg: T) => any): (arg: T) => any {
  return (arg: T) => {
    if (arg.length < min) throw new Error(`Length ${arg.length} is less than ${min}`);
    return next ? next(arg) : arg;
  };
}


export function maxLength<T extends ILength>(max: number): (arg: T) => T;
export function maxLength<T extends ILength,U=T>(max: number, next: (arg: T) => U): (arg: T) => U;
export function maxLength<T extends ILength>(max: number, next?: (arg: T) => any): (arg: T) => any {
  return (arg: T) => {
    if (arg.length > max) throw new Error(`Length ${arg.length} is greater than ${max}`);
    return next ? next(arg) : arg;
  };
}


export function lengthIs<T extends ILength>(length: number): (arg: T) => T;
export function lengthIs<T extends ILength,U=T>(length: number, next: (arg: T) => U): (arg: T) => U;
export function lengthIs<T extends ILength>(length: number, next?: (arg: T) => any): (arg: T) => any {
  return (arg: T) => {
    if (arg.length !== length) throw new Error(`Length ${arg.length} is not equal to ${length}`);
    return next ? next(arg) : arg;
  };
}


export function isArray(): (arg: any) => any[];
export function isArray<T>(next: (arg: any[]) => T): (arg: any) => T;
export function isArray(next?: (arg: any[]) => any): (arg: any) => any {
  return (arg: any) => {
    if (!(arg instanceof Array)) throw new Error('Not an array');
    return next ? next(arg) : arg;
  };
}


export function eachItem<T>(assertion: (arg: any) => T): (arg: any[]) => T[] {
  return (arg: any[]) => {
    return arg.map((item, index) => assertThat(`item at index ${index}`, assertion)(item));
  }
}


export function conformsTo<T>(validator: Validator<T>): (arg: any) => Validated<T>;
export function conformsTo<T,U>(validator: Validator<T>, next: (arg: Validated<T>) => U): (arg: any) => U;
export function conformsTo<T>(validator: Validator<T>, next?: (arg: Validated<T>) => any): (arg: any) => any {
  return (arg: any) => {
    let validated = validate(arg, validator);
    return next ? next(validated) : validated;
  };
}


export function equals<T>(value: T, ...values: T[]): (arg: any) => T {
  let vals = [value, ...values];
  return (arg: any) => {
    for (let val of vals) {
      if (val === arg) return arg;
    }

    throw new Error(vals.length === 1 ? `'${arg}' does not equal '${vals[0]}'` : `'${arg}' not one of: ${vals.join(', ')}`);
  };
}
