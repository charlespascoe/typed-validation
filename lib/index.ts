export type Validator<T> = {
  [key in keyof T]: (arg: any) => T[key]
};


export type Validated<T> = {
  [key in keyof T]: T[key];
}


export interface ILength {
  length: number;
}


export type ErrorCode = 'UNHANDLED_ERROR'
  | 'NOT_OBJECT'
  | 'NOT_BOOLEAN'
  | 'NOT_NUMBER'
  | 'LESS_THAN_MIN'
  | 'GREATER_THAN_MAX'
  | 'NOT_STRING'
  | 'FAILED_REGEXP'
  | 'LESS_THAN_MIN_LENGTH'
  | 'GREATER_THAN_MAX_LENGTH'
  | 'LENGTH_NOT_EQUAL'
  | 'NOT_ARRAY'
  | 'NOT_EQUAL';


export abstract class PathNode {  }


export class KeyPathNode extends PathNode {
  constructor(public readonly key: string) {
    super();
  }

  public toString(): string {
    if (/^[$a-z_]+$/i.test(this.key)) {
      return `.${this.key}`;
    } else {
      return `['${this.key.replace('\\', '\\\\').replace("'", "\\'")}']`;
    }
  }
}


export class ArrayIndexPathNode extends PathNode {
  constructor(public readonly index: number) {
    super();
  }

  public toString(): string {
    return `[${this.index}]`;
  }
}


export class ValidationError {
  constructor(
    public readonly errorCode: ErrorCode,
    public readonly message: string,
    public readonly path: PathNode[] = []
  ) { }

  public toString(): string {
    return `Validation failed for $root${this.path.map(node => node.toString()).join('')}: ${this.message}`;
  }
}


export function validate<T>(arg: any, validator: Validator<T>): Validated<T> {
  if (typeof arg !== 'object') throw new ValidationError('NOT_OBJECT', `Expected object, got ${typeof arg}`);

  let result: {[key in keyof T]?: T[key]} = {};

  for (let key in validator) {
    result[key] = validator[key](arg[key]);
  }

  return result as Validated<T>;
}


export function extendValidator<T,U>(validator1: Validator<T>, validator2: Validator<U>): Validator<T & U> {
  let result: any = {};

  for (let key in validator1) {
    result[key] = validator1[key];
  }

  for (let key in validator2) {
    result[key] = validator2[key];
  }

  return result as Validator<T & U>;
}


export function assertThat<T>(name: string, assertion: (arg: any) => T): (arg: any) => T {
  return (arg: any) => {
    try {
      return assertion(arg);
    } catch (err) {
      if (err instanceof ValidationError) {
        err.path.unshift(new KeyPathNode(name));
        throw err;
      } else {
        throw new ValidationError('UNHANDLED_ERROR', `${err.message || 'Unknown error'}`, [new KeyPathNode(name)]);
      }
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


export function nullable<T>(next: (arg: any) => T): (arg: any) => T | null {
  return (arg: any) => {
    if (arg === null) return null;
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
    if (typeof arg !== 'boolean') throw new ValidationError('NOT_BOOLEAN', `Expected boolean, got ${typeof arg}`);
    return next ? next(arg) : arg;
  };
}


export function isNumber(): (arg: any) => number;
export function isNumber<T=number>(next: (arg: number) => T): (arg: any) => T;
export function isNumber(next?: (arg: number) => any): (arg: any) => any {
  return (arg: any) => {
    if (typeof arg !== 'number') throw new ValidationError('NOT_NUMBER', `Expected number, got ${typeof arg}`);
    return next ? next(arg) : arg;
  };
}


export function min(min: number): (arg: number) => number;
export function min<T=number>(min: number, next: (arg: number) => T): (arg: number) => T;
export function min(min: number, next?: (arg: number) => any): (arg: number) => any {
  return (arg: number) => {
    if (arg < min) throw new ValidationError('LESS_THAN_MIN', `${arg} is less than ${min}`);
    return next ? next(arg) : arg;
  };
}


export function max(max: number): (arg: number) => number;
export function max<T=number>(max: number, next: (arg: number) => T): (arg: number) => T;
export function max(max: number, next?: (arg: number) => any): (arg: number) => any {
  return (arg: number) => {
    if (arg > max) throw new ValidationError('GREATER_THAN_MAX', `${arg} is greater than ${max}`);
    return next ? next(arg) : arg;
  };
}


export function isString(): (arg: any) => string;
export function isString<T=string>(next: (arg: string) => T): (arg: any) => T;
export function isString(next?: (arg: any) => any): (arg: any) => any {
  return (arg: any) => {
    if (typeof arg !== 'string') throw new ValidationError('NOT_STRING', `Expected string, got ${typeof arg}`);
    return next ? next(arg) : arg;
  };
}


export function matches(regex: RegExp): (arg: string) => string;
export function matches<T=string>(regex: RegExp, next: (arg: string) => T): (arg: string) => T;
export function matches(regex: RegExp, next?: (arg: string) => any): (arg: string) => any {
  return (arg: string) => {
    if (!regex.test(arg)) throw new ValidationError('FAILED_REGEXP', `Failed regular expression: ${regex.toString()}`);
    return next ? next(arg) : arg;
  };
}


export function minLength<T extends ILength>(min: number): (arg: T) => T;
export function minLength<T extends ILength,U=T>(min: number, next: (arg: T) => U): (arg: T) => U;
export function minLength<T extends ILength>(min: number, next?: (arg: T) => any): (arg: T) => any {
  return (arg: T) => {
    if (arg.length < min) throw new ValidationError('LESS_THAN_MIN_LENGTH', `Length ${arg.length} is less than ${min}`);
    return next ? next(arg) : arg;
  };
}


export function maxLength<T extends ILength>(max: number): (arg: T) => T;
export function maxLength<T extends ILength,U=T>(max: number, next: (arg: T) => U): (arg: T) => U;
export function maxLength<T extends ILength>(max: number, next?: (arg: T) => any): (arg: T) => any {
  return (arg: T) => {
    if (arg.length > max) throw new ValidationError('GREATER_THAN_MAX_LENGTH', `Length ${arg.length} is greater than ${max}`);
    return next ? next(arg) : arg;
  };
}


export function lengthIs<T extends ILength>(length: number): (arg: T) => T;
export function lengthIs<T extends ILength,U=T>(length: number, next: (arg: T) => U): (arg: T) => U;
export function lengthIs<T extends ILength>(length: number, next?: (arg: T) => any): (arg: T) => any {
  return (arg: T) => {
    if (arg.length !== length) throw new ValidationError('LENGTH_NOT_EQUAL', `Length ${arg.length} is not equal to ${length}`);
    return next ? next(arg) : arg;
  };
}


export function isArray(): (arg: any) => any[];
export function isArray<T>(next: (arg: any[]) => T): (arg: any) => T;
export function isArray(next?: (arg: any[]) => any): (arg: any) => any {
  return (arg: any) => {
    if (!(arg instanceof Array)) throw new ValidationError('NOT_ARRAY', `Expected array, got ${typeof arg}`);
    return next ? next(arg) : arg;
  };
}


export function eachItem<T>(assertion: (arg: any) => T): (arg: any[]) => T[] {
  return (arg: any[]) => {
    return arg.map((item, index) => {
      try {
        return assertion(item);
      } catch (err) {
        if (err instanceof ValidationError) {
          err.path.unshift(new ArrayIndexPathNode(index));
          throw err;
        } else {
          throw new ValidationError('UNHANDLED_ERROR', `${err.message || 'Unknown error'}`, [new ArrayIndexPathNode(name)]);
        }
      }
    });
  }
}


export function isObject(): (arg: any) => any;
export function isObject<T>(next: (arg: any) => T): (arg: any) => T;
export function isObject(next?: (arg: any) => any): (arg: any) => any {
  return (arg: any) => {
    if (typeof arg !== 'object') throw new ValidationError('NOT_OBJECT', `Expected object, got ${typeof arg}`);
    return next ? next(arg) : arg;
  };
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

    throw new ValidationError('NOT_EQUAL', vals.length === 1 ? `'${arg}' does not equal '${vals[0]}'` : `'${arg}' not one of: ${vals.join(', ')}`);
  };
}
