export type Validator<T> = {
  [key in keyof T]: (arg: any) => ValidationResult<T[key]>
};


export type Validated<T> = {
  [key in keyof T]: T[key];
}


export interface ILength {
  length: number;
}


export function tryCatch<T,U>(func: () => T, catchFunc: (err: any) => U): T | U {
  try {
    return func();
  } catch (err) {
    return catchFunc(err);
  }
}


function keysOf<T>(arg: T): Array<keyof T> {
  if (typeof arg !== 'object') return [];

  const keys: Array<keyof T> = [];

  for (const key in arg) {
    keys.push(key);
  }

  return keys;
}


export type ValidationResult<T> = ISuccessResult<T> | ErrorResult;


export abstract class PathNode {  }


export class KeyPathNode extends PathNode {
  constructor(public readonly key: string) {
    super();
  }

  public toString(): string {
    if (/^[$a-z_][$a-z0-9_]*$/i.test(this.key)) {
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
    public readonly message: string,
  ) { }

  public addPathNode(node: PathNode): ValidationError {
    this.path.unshift(node);
    return this;
  }

  public toString(root: string = '$root'): string {
    return `${this.pathString(root)}: ${this.message}`;
  }

  public pathString(root: string = '$root'): string {
    return root + this.path.map(node => node.toString()).join('');
  }
}


export class ErrorResult {
  public readonly success: false = false;

  public readonly errors: ValidationError[];

  constructor(errors: ValidationError | ValidationError[]) {
    if (errors instanceof ValidationError) {
      this.errors = [errors];
    } else {
      this.errors = errors;
    }
  }

  public addPathNode(node: PathNode): ErrorResult {
    for (const error of this.errors) {
      error.addPathNode(node);
    }

    return this;
  }

  public toString(root: string = '$root'): string {
    return `${this.errors.length} validation error${this.errors.length === 1 ? '' : 's'}:\n  ${this.errors.map(error => error.toString(root)).join('\n  ')}`;
  }

  public static isErrorResult(arg: any): arg is ErrorResult {
    return arg instanceof ErrorResult;
  }
}


export interface ISuccessResult<T> {
  readonly success: true;
  readonly result: T;
}


export function error(errorCode: string, message: string): ErrorResult {
  return new ErrorResult(new ValidationError(errorCode, message));
}


export function errorFromException(err: any): ErrorResult {
  return new ErrorResult(new ValidationError('UNHANDLED_ERROR', `Unhandled error: ${typeof err === 'object' && err.message || 'Unknown error'}`));
}


export function success<T>(result: T): ISuccessResult<T> {
  return {success: true, result};
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

      partiallyValidated[key] = result.result;
      return errors;
    }, [] as ValidationError[]);

    if (!allowAdditionalProperties && keysOf(arg).some(key => !validator.hasOwnProperty(key))) {
      errors.push(
        new ValidationError('UNEXPECTED_ADDITIONAL_PROPERTIES', `Unexpected additional propertie(s): ${keysOf(arg).filter(key => !validator.hasOwnProperty(key)).join(', ')}`)
      );
    }

    if (errors.length > 0) return new ErrorResult(errors);

    const validated = partiallyValidated as Validated<T>;

    return next ? next(validated) : success(validated);
  });
}


export function optional<T>(next: (arg: any) => ValidationResult<T>): (arg: any) => ValidationResult<T | undefined> {
  return (arg: any) => {
    if (arg === undefined) return success(undefined);
    return next(arg);
  };
}


export function nullable<T>(next: (arg: any) => ValidationResult<T>): (arg: any) => ValidationResult<T | null> {
  return (arg: any) => {
    if (arg === null) return success(null);
    return next(arg);
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
    try {
      return next(arg);
    } catch (_) {
      // Ignore error - resort to default
      return success(def);
    }
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
      (err) => error('UNHANDLED_ERROR', `Unhandled error: ${typeof err === 'object' && err.message || 'Unknown error'}`)
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

    const mapped = (results as ISuccessResult<T>[]).map(result => result.result);

    return next ? next(mapped) : success(mapped);
  };
}


export function isObject(): (arg: any) => ValidationResult<any>;
export function isObject<T>(next: (arg: any) => ValidationResult<T>): (arg: any) => ValidationResult<T>;
export function isObject(next?: (arg: any) => ValidationResult<any>): (arg: any) => ValidationResult<any> {
  return (arg: any) => {
    if (typeof arg !== 'object') return error('NOT_OBJECT', `Expected object, got ${typeof arg}`);
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
