export type ValidationResult<T> = SuccessResult<T> | ErrorResult;


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

  public toString(root: string = '$'): string {
    return `${this.pathString(root)}: ${this.message}`;
  }

  public pathString(root: string = '$'): string {
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

  public toString(root: string = '$'): string {
    return `${this.errors.length} validation error${this.errors.length === 1 ? '' : 's'}:\n  ${this.errors.map(error => error.toString(root)).join('\n  ')}`;
  }

  public static isErrorResult(arg: any): arg is ErrorResult {
    return arg instanceof ErrorResult;
  }
}


export interface SuccessResult<T> {
  readonly success: true;
  readonly value: T;
}


export function error(errorCode: string, message: string): ErrorResult {
  return new ErrorResult(new ValidationError(errorCode, message));
}


export function errorFromException(err: any): ErrorResult {
  return new ErrorResult(new ValidationError('UNHANDLED_ERROR', `Unhandled error: ${typeof err === 'object' && err.message || 'Unknown error'}`));
}


export function success<T>(value: T): SuccessResult<T> {
  return {success: true, value};
}
