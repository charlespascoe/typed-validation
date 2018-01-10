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


