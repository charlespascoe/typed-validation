export function tryCatch<T,U>(func: () => T, catchFunc: (err: any) => U): T | U {
  try {
    return func();
  } catch (err) {
    return catchFunc(err);
  }
}


export function keysOf<T>(arg: T): Array<keyof T> {
  if (typeof arg !== 'object') return [];

  const keys: Array<keyof T> = [];

  for (const key in arg) {
    keys.push(key);
  }

  return keys;
}


export function repeat(text: string, count: number): string {
  let result = '';

  for (let i = 0; i < count; i++) {
    result += text;
  }

  return result;
}


export function increaseIndent(text: string, indent: number): string {
  const indentPadding = repeat(' ', indent);
  return indentPadding + text.split('\n').join('\n' + indentPadding);
}


export function pluralise(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
