import * as colors from 'colors/safe';
import { ValidationError } from './validation-result';
import { keysOf } from './utils';


export function setColours(enabled: boolean) {
  (colors as any).enabled = enabled;
}


setColours(false);


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


export function formatPath(root: string, path: Array<string | number>): string {
  return colors.magenta(root) + path
    .map(component => {
      if (typeof component === 'number') {
        return colors.yellow('[') + colors.red(`${component}`) + colors.yellow(']');
      } else if (/^[$a-z_][$a-z_0-9]*$/i.test(component)) {
        return colors.yellow('.') + colors.cyan(component);
      } else {
        return colors.yellow('[') + colors.red(`'${component.replace('\\', '\\\\').replace('\'', '\\\'')}'`) + colors.yellow(']')
      }
    })
    .join('');
}


export function formatErrorResultMessage(prefix: string, root: string, errors: ValidationError[]): string {
    return colors.white(colors.bgRed(colors.bold(`${prefix}${errors.length} validation error${errors.length === 1 ? '' : 's'}:`))) + '\n' +
      errors.map(error => increaseIndent(error.toString(root), 4)).join('\n');
}


export function formatEitherValidationErrorMessages(errorsPerType: {[description: string]: ValidationError[]}): string {
  return keysOf(errorsPerType)
      .map(desc => {
        const errors = errorsPerType[desc];

        return increaseIndent(
          colors.bold(colors.red(`Not ${desc}, due to ${pluralise(errors.length, 'validation error', 'validation errors')}:`)) + '\n' +
            errors.map(error => increaseIndent(error.toString(), 4)).join('\n'),
          4
        );
      })
      .join('\n');
}


export function concatenateItems(items: string[], conjunction: string = 'and') {
  if (items.length === 0) return '';
  if (items.length === 1) return items[0];
  if (items.length === 2) return `${items[0]} ${conjunction} ${items[1]}`;

  return `${items.slice(0, items.length - 1).join(', ')}, ${conjunction} ${items[items.length - 1]}`
}
