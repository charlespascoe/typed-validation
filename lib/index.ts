export type Schema<T> =  {
  [key in keyof T]: (arg: any) => T[key]
};


export type Result<T> = {
  [key in keyof T]: T[key];
}


export type Ident<T> = (arg: T) => T;


export interface ILength {
  length: number;
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


export function validate<T>(arg: any, schema: Schema<T>): Result<T> {
  if (typeof arg !== 'object') throw new Error('Not an object');

  let result: {[key in keyof T]?: T[key]} = {};

  for (let key in schema) {
    result[key] = schema[key](arg[key]);
  }

  return result as Result<T>;
}


// ASSERTIONS //


export function optional<T>(next: (arg: any) => T): (arg: any) => T | undefined {
  return (arg: any) => {
    if (arg === undefined) return undefined;
    return next(arg);
  };
}


export function isBoolean(next?: Ident<boolean>): (arg: any) => boolean {
  return (arg: any) => {
    if (typeof arg !== 'boolean') throw new Error('Not a boolean');
    return next ? next(arg) : arg;
  };
}


export function isNumber(next?: Ident<number>): (arg: any) => number {
  return (arg: any) => {
    if (typeof arg !== 'number') throw new Error('Not a number');
    return next ? next(arg) : arg;
  };
}


export function min(min: number, next?: Ident<number>): Ident<number> {
  return (arg: number) => {
    if (arg < min) throw new Error(`${arg} is less than ${min}`);
    return next ? next(arg) : arg;
  };
}


export function max(max: number, next?: Ident<number>): Ident<number> {
  return (arg: number) => {
    if (arg > max) throw new Error(`${arg} is greater than ${max}`);
    return next ? next(arg) : arg;
  };
}

export function isString(next?: Ident<string>): (arg: any) => string {
  return (arg: any) => {
    if (typeof arg !== 'string') throw new Error('Not a string');
    return next ? next(arg) : arg;
  };
}


export function matches(regex: RegExp, next?: Ident<string>): Ident<string> {
  return (arg: string) => {
    if (!regex.test(arg)) throw new Error(`Failed regular expression: ${regex.toString()}`);
    return next ? next(arg) : arg;
  };
}


export function minLength<T extends ILength>(min: number, next?: Ident<T>): Ident<T> {
  return (arg: T) => {
    if (arg.length < min) throw new Error(`Length ${arg.length} is less than ${min}`);
    return next ? next(arg) : arg;
  };
}


export function maxLength<T extends ILength>(max: number, next?: Ident<T>): Ident<T> {
  return (arg: T) => {
    if (arg.length > max) throw new Error(`Length ${arg.length} is greater than ${max}`);
    return next ? next(arg) : arg;
  };
}


export function lengthIs<T extends ILength>(length: number, next?: Ident<T>): Ident<T> {
  return (arg: T) => {
    if (arg.length !== length) throw new Error(`Length ${arg.length} is not equal to ${length}`);
    return next ? next(arg) : arg;
  };
}


export function isArray(): (arg: any) => any[];
export function isArray<T>(next: (arg: any[]) => T[]): (arg: any) => T[];
export function isArray(next?: (arg: any[]) => any[]): (arg: any) => any[] {
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


export function conformsTo<T>(schema: Schema<T>): (arg: any) => T {
  return (arg: any) => {
    return validate(arg, schema);
  };
}


export function equals<T>(value: T): (arg: any) => T {
  return (arg: any) => {
    if (arg !== value) throw new Error(`'${arg}' does not equal '${value}'`);
    return arg;
  };
}
