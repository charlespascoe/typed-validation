export type Validator<T> = {
  [key in keyof T]: (arg: any) => T[key]
};


export type Validated<T> = {
  [key in keyof T]: T[key];
}


export interface ILength {
  length: number;
}


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
  public readonly path: PathNode[] = [];

  constructor(
    public readonly errorCode: string,
    public readonly message: string
  ) { }

  public toString(root: string = '$root'): string {
    return `${this.pathString(root)}: ${this.message}`;
  }

  public pathString(root: string = '$root'): string {
    return root + this.path.map(node => node.toString()).join('');
  }
}


export class ValidationErrorCollection {
  public readonly errors: ValidationError[] = [];

  constructor(error?: ValidationError) {
    if (error) {
      this.errors.push(error);
    }
  }

  public insertError(node: PathNode, error: ValidationError) {
    error.path.unshift(node);
    this.errors.push(error);
  }

  public handleError(node: PathNode, err: any) {
    if (err instanceof ValidationErrorCollection) {
      for (const error of err.errors) {
        this.insertError(node, error);
      }
    } else if (err instanceof ValidationError) {
      this.insertError(node, err);
    } else {
      this.insertError(
        node,
        new ValidationError('UNHANDLED_ERROR', `${typeof err === 'object' && err.message || 'Unknown error'}`)
      );
    }
  }

  public toString(root: string = '$root'): string {
    return `${this.errors.length} validation error${this.errors.length === 1 ? '' : 's'}:\n  ${this.errors.map(error => error.toString(root)).join('\n  ')}`;
  }
}


export function validate<T>(arg: any, validator: Validator<T>): Validated<T> {
  if (typeof arg !== 'object') throw new ValidationErrorCollection(new ValidationError('NOT_OBJECT', `Expected object, got ${typeof arg}`));

  const result: {[key in keyof T]?: T[key]} = {};

  let validationErrorCollection: ValidationErrorCollection | null = null;

  for (const key in validator) {
    try {
      result[key] = validator[key](arg[key]);
    } catch (err) {
      if (validationErrorCollection === null) {
        validationErrorCollection = new ValidationErrorCollection();
      }

      validationErrorCollection.handleError(new KeyPathNode(key), err);
    }
  }

  if (validationErrorCollection !== null) throw validationErrorCollection;

  return result as Validated<T>;
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
    if (!regex.test(arg)) throw new ValidationError('FAILED_REGEXP', `Failed regular expression ${regex.toString()}`);
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


export function eachItem<T>(assertion: (arg: any) => T): (arg: any[]) => T[];
export function eachItem<T,U>(assertion: (arg: any) => T, next: (arg: T[]) => U): (arg: any[]) => U;
export function eachItem<T>(assertion: (arg: any) => T, next?: (arg: any[]) => any): (arg: any[]) => any {
  return (arg: any[]) => {
    let validationErrorCollection: ValidationErrorCollection | null = null;

    const mapped = arg.map((item, index) => {
      try {
        return assertion(item);
      } catch (err) {
        if (validationErrorCollection === null) {
          validationErrorCollection = new ValidationErrorCollection();
        }

        validationErrorCollection.handleError(new ArrayIndexPathNode(index), err);
      }
    });

    if (validationErrorCollection !== null) throw validationErrorCollection;

    return next ? next(mapped) : mapped;
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
