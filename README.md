[![npm](https://img.shields.io/npm/v/typed-validation.svg)](https://www.npmjs.com/package/typed-validation)
[![npm](https://img.shields.io/npm/dt/typed-validation.svg)](https://www.npmjs.com/package/typed-validation)
[![npm](https://img.shields.io/npm/l/typed-validation.svg)](https://www.npmjs.com/package/typed-validation)

# Strongly-Typed Validators for TypeScript

In TypeScript, `JSON.parse` returns type `any`, which isn't useful if you want type safety - if you're using TypeScript, you probably do.

`typed-validation` lets you build build validators that TypeScript can understand, meaning that TypeScript can check that your validator aligns with the type it's supposed to be validating - no need to force types using [type assertion](https://basarat.gitbooks.io/typescript/docs/types/type-assertion.html)!

## Installation ##

`$ npm install --save typed-validation`

*Note:* When using this module in a TypeScript project, 0.8.1 and later versions of this module require TypeScript 2.8 or above.

## Basic Usage ##

**Example:** check that a value of type `any` (perhaps from an untrusted source, such as a file) is an object that conforms to an interface called `Employee`:

```ts
// 1) Define the interface
interface Employee {
  name: string;
  roleCode: number;
  completedTraining?: boolean;
  addressPostcode: string;
}

// 2) Define the validator
const employeeValidator: Validator<Employee> = {
  name: isString(minLength(1)),
  roleCode: isNumber(min(1, max(10))),
  completedTraining: optional(isBoolean()),
  addressPostcode: isString(matches(/^[a-z]{2}\d{1,2}\s+\d{1,2}[a-z]{2}$/i))
};

// 3) Validate

const unsafeObject: any = {
  name: 'Bob Smith',
  roleCode: 7,
  completedTraining: true,
  addressPostcode: 'AB1 2CD'
};

const result = validate(unsafeObject, conformsTo(employeeValidator));

if (result.success) {
  const bob = result.value;
  const name = bob.name;
}

// Handle errors

const unsafeObject2: any = {
  name: 'Name',
  roleCode: 4,
  completedTraining: 'false',
  addressPostcode: 'WRONG'
};

const result2 = validate(unsafeObject2, conformsTo(employeeValidator));

if (!result2.success) {
  console.log(result2.toString());
}
// Outputs:
// 2 validation errors:
//   $.completedTraining: Expected boolean, got string
//   $.addressPostcode: Failed regular expression /^[a-z]{2}\d{1,2}\s+\d{1,2}[a-z]{2}$/i

```

## Overview ##
Validators are built by combining simple assertions using function composition and higher-order functions. For example, the `isString()` assertion returns a function which accepts a single argument of type `any` and returns either a `SuccessResult<string>` or an `ErrorResult`. It will return `SuccessResult<string>` if and only if the argument is a string, or an `ErrorResult` otherwise. This module provides a number of assertions, described below.

An assertion may take another assertion as its last argument; if assertion check passes, it calls the next assertion. For example, `isString(minLength(1, maxLength(10)))` first checks if the value is a string, then checks if its length is at least 1, and then checks that its length is no more than 10. If `isString` fails, `minLength` isn't run. Chaining assertions in this way allows for complex validation of types and values.

Some assertions require other assertions to come before it. For example, `minLength` can't be used by itself because it needs another assertion to check that the value has the `length` property - so something like `isString(minLength(1))` or `isArray(minLength(1))`.

Jump to section:
- [validate](#validate)
- [Handling Validation Errors](#handling-validation-errors)
- [Validator](#validator)
- [extendValidator](#extendvalidator)

Assertions:
- [conformsTo](#conformsto)
- [optional](#optional)
- [nullable](#nullable)
- [defaultsTo](#defaultsto)
- [onErrorDefaultsTo](#onerrordefaultsto)
- [isBoolean](#isboolean)
- [isNumber](#isnumber)
- [min](#min)
- [max](#max)
- [isString](#isstring)
- [matches](#matches)
- [minLength](#minlength)
- [maxLength](#maxlength)
- [lengthIs](#lengthis)
- [isArray](#isarray)
- [eachItem](#eachitem)
- [isObject](#isobject)
- [equals](#equals)
- [isMap](#ismap)
- [eachValue](#eachvalue)
- [either](#either)

### validate ###

The `validate` function takes two arguments; the first is the argument to validate, the second is an assertion. It returns a result object; if `result.success` is `true`, then `result.value` contains the validated value. If `result.success` is false, then `result.errors` contains the list of errors, which can be formatted by calling `result.toString()`.

```ts
const result = vaildate(argumentToValidate, isString(minLength(1)));

if (result.success) {
  const validated: string = result.value;
  console.log(`The validated result is: ${validated}`);
} else {
  console.log(`Validation failed: ${result.toString()}`);
}
```

### Handling Validation Errors ###

When validatin fails, `validate` will always return an `ErrorResult` object, which has a property `errors: ValidationError[]`.

The `ValidationError` type has a number of useful properties:

- `errorCode`: A string which is one of a set of error codes, e.g. `NOT_STRING`. Useful for producing custom error messages or triggering certain error logic.
- `message`: A human-readable error message, with more information as to why the validation failed.
- `path`: An array of objects that describe the path to the value that caused the validation to fail. Each object is either an `ArrayIndexPathNode` (which has an `index` property) or `KeyPathNode` (which has a `key` property).

The `ErrorResult.toString()` method prints this information in a human-readable format. The name of the root object defaults to `$`, but this can be changed by passing a string, e.g. `err.toString('this')`.

### Validator ###

`Validator` is a type that enables TypeScript to validate that the validator correctly aligns to the interface it is supposed to validate.

The keys of the validator align with the keys of the interface. The values of the validator are a chain of assertions.

```ts
interface IFoo {
  bar: string;
  baz: number;
}

// A valid validator
const fooValidator: Validator<IFoo> = {
  bar: isString(),
  baz: isNumber()
};

// All of these are invalid, and will result in an error from the TypeScript compiler

const fooValidator: Validator<IFoo> = {
  bar: isString()
}; // Missing 'baz'

const fooValidator: Validator<IFoo> = {
  bar: isNumber(), // Wrong type
  baz: isNumber()
};

const fooValidator: Validator<IFoo> = {
  bar: isString(),
  baz: isNumber(),
  blah: isBoolean() // Unexpected property
};

```

### extendValidator ###
Takes two validators and returns a new validator that validates the intersection type of `T` and `U` - useful for extending existing validators to prevent repetition.

Example:

```ts
interface IFoo {
  abc: number;
}

const fooValidator: Validator<IFoo> = {
  abc: isNumber()
};

interface IBar extends IFoo {
  xyz: string;
}

const barValidator: Validator<IBar> = extendValidator(fooValidator, {
  xyz: isString()
});
```


### conformsTo ###
Returns an error if the value does not conform to the given validator.

```ts
interface IFoo {
  bar: number;
}

const fooValidator: Validator<IFoo> = {
  bar: isNumber()
};

// Returns a success result
validate({bar: 123}, conformsTo(fooValidator));

// Returns an error result
validate({bar: 'example'}, conformsTo(fooValidator));
```

The third argument is an optional object of options:

- `allowAdditionalProperties: boolean` - If false, returns an error if there are any properties in addition to the ones defined in the validator. Defaults to `true`, which removes additional properties from the result.

```ts
const result1 = validate({foo: 'abc', bar: 123}, conformsTo(fooValidator));

if (result1.success) {
  console.log(result1.value); // {bar: 123}
}

const result2 = validate({foo: 'abc', bar: 123}, conformsTo(fooValidator, {allowAdditionalProperties: false}));

if (!result2.success) {
  console.log(result2.toString())
  // 1 validation error:
  //   $: Unexpected additional properties: foo
}
```


### optional ###
Used when the properties may not present on the object, or its value is undefined. Example:

```ts
interface IFoo {
  bar?: string;
  // You can also use 'undefined' in a union type
  baz: number | undefined;
}

const fooValidator: Validator<IFoo> = {
  bar: optional(isString()),
  baz: optional(isNumber())
};

// Both of these are acceptable
validate({}, conformsTo(fooValidator));
validate({bar: undefined}, conformsTo(fooValidator));
```

### nullable ###
Used when the value could be null (e.g. `prop: T | null`).

```ts
interface IFoo {
  bar: string | null;
}

const fooValidator: Validator<IFoo> = {
  bar: nullable(isString()),
};
```


### defaultsTo ###
If the property on the object being validated is undefined, then return the given default value instead.

```ts
interface IFoo {
  bar: string;
}

const fooValidator: Validator<IFoo> = {
  bar: defaultsTo('baz', isString()),
};

const result = validate({}, conformsTo(fooValidator));

if (result.success) {
  console.log(result.value);
}

// Output:
// {bar: 'baz'}
```

**Note:** the default value will get passed through the assertion chain.

### onErrorDefaultsTo ###
If the following assertion chain fails, then return the given value instead.

```ts
interface IFoo {
  bar: string;
}

const fooValidator: Validator<IFoo> = {
  bar: onErrorDefaultsTo('baz', isString()),
};

const result = validate({bar: 123}, conformsTo(fooValidator));

if (result.success) {
  console.log(result.value);
}

// Output:
// {bar: 'baz'}
```

### isBoolean ###
Returns an error if the value is not a boolean.

### isNumber ###
Returns an error if the value is not a number.

### min ###
Returns an error if the value is less than the given minimum.

```ts
interface IFoo {
  bar: number;
}

const fooValidator: Validator<IFoo> = {
  bar: isNuber(min(0))
};

// Returns an error result
const result = validate({bar: -1}, conformsTo(fooValidator));
```

### max ###
Returns an error if the value is greater than the given maximum - see [min](#min).

### isString ###
Returns an error if the value is not a string.

### matches ###
Returns an error if the string value does not match the given regex.

```ts
interface IFoo {
  bar: string;
}

const fooValidator: Validator<IFoo> = {
  bar: isStirng(matches(/^[a-z]+$/))
};

// Returns an error result
const result = validate({bar: '123abc'}, conformsTo(fooValidator));
```

### minLength ###
Returns an error if length of the value (e.g. a string or an array) is less than the given minimum.

```ts
interface IFoo {
  bar: string;
}

const fooValidator: Validator<IFoo> = {
  bar: isStirng(minLength(1))
};

// Returns an error result
const result = validate({bar: ''}, conformsTo(fooValidator));
```

### maxLength ###
Returns an error if length of the value (e.g. a string or an array) is less than the given maximum - see [minLength](#minlength).

### lengthIs ###
Returns an error if length of the value (e.g. a string or an array) is not equal to the given length - see [minLength](#minlength).

### isArray ###
Returns an error if the value is not an array. If no other assertions are given, then the type defaults to `any[]`.

```ts
interface IFoo {
  bar: any[];
}

const fooValidator: Validator<IFoo> = {
  bar: isArray()
};

// This is valid
validate({
  bar: ['abc', 123, true, null]
}, conformsTo(fooValidator));

// Returns an error
validate({
  bar: 'baz'
}, conformsTo(fooValidator));
```

### eachItem ###
Returns an error if any value of an array does not match the following assertion chain.

```ts
interface IFoo {
  bar: number[];
}

const fooValidator: Validator<IFoo> = {
  bar: isArray(eachItem(isNumber()))
};

// This is valid
validate({
  bar: [1, 2, 3]
}, conformsTo(fooValidator));

// Returns an error
validate({
  bar: ['abc', 123, true, null]
}, conformsTo(fooValidator));
```

### isObject ###
Returns an error if the value is not an object.

```ts
interface IFoo {
  bar: any;
}

const fooValidator: Validator<IFoo> = {
  bar: isObject()
};

// This is valid, but it wouldn't be safe to access properties on foo.bar
const foo = validate({
  bar: {baz: 123}
}, conformsTo(fooValidator));

// Returns an error
validate({
  bar: 'object'
}, conformsTo(fooValidator));
```

### equals ###
Returns an error if the value does not equal one of the given values.

```ts
type Bar = 'A' | 'B' | 'C';

interface IFoo {
  bar: Bar;
}

const fooValidator: Validator<IFoo> = {
  bar: equals<Bar>('A', 'B', 'C')
};

// Returns an error
validate({
  bar: 'D'
}, conformsTo(fooValidator));
```

### isMap ###
Validates that the result is a map of `string` onto `any`.

```ts
interface IFoo {
  map: {[key: string]: any};
}

const fooValidator: Validator<IFoo> = {
  map: isMap()
};

// This is valid
validate({
  map: {
    bar: 'ABC',
    baz: {x: 123, y: 456},
    blah: null
  }
}, conformsTo(fooValidator));

// This is also valid
validate({
  map: { }
}, conformsTo(fooValidator));

// Returns an error - not an object
validate({
  map: 'abc'
}, conformsTo(fooValidator));

// Returns an error - one of the keys is not a string
validate({
  map: {
    bar: 'ABC',
    baz: {x: 123, y: 456},
    0: true
  }
}, conformsTo(fooValidator));
```

### eachValue ###
Returns an error if any value of a map does not match the following assertion chain.

```ts
interface IFoo {
  map: {[key: string]: string};
}

const fooValidator: Validator<IFoo> = {
  map: isMap(eachValue(isString(minLength(1))))
};

// This is valid
validate({
  map: {
    bar: 'ABC',
    'a very long key with spaces': 'DEF'
  }
}, conformsTo(fooValidator));

// Returns an error result
validate({
  map: {
    bar: true, // Not a string
    baz: ''    // Too short
  }
}, conformsTo(fooValidator));
```

### either ###
Checks against multiple assertions until either one is valid, or they all fail. Useful for complex union types. Assertions are checked in the order given.

When no match is found, all the validation errors for each type are printed.

```ts
interface IFoo {
  bar: string | string[];
}

const fooValidator: Validator<IFoo> = {
  bar: either(
    is('a letter', isString(lengthIs(1))),
    is('an array of letters', isArray(eachItem(isString(lengthIs(1)))))
  )
};

// These are valid
validate({bar: 'A'}, conformsTo(fooValidator));
validate({bar: ['A', 'B', 'C']}, conformsTo(fooValidator));

// An invalid example

const result = validate({bar: ['A', 'BC', 'D']}, conformsTo(fooValidator));

if (!result.success) {
    console.log(result.toString());
    // 1 validation error:
    //     $.bar: No match found - the following assertions failed:
    //         Not a letter, due to 1 validation error:
    //             $: Expected string, got array
    //         Not an array of letters, due to 1 validation error:
    //             $[1]: Length 2 is not equal to 1
}
```

**Note:** Due to limitations with generics, currently up to 20 assertions are supported by TypeScript.
