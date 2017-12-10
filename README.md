[![npm](https://img.shields.io/npm/v/validate-interface.svg)](https://www.npmjs.com/package/validate-interface)
[![npm](https://img.shields.io/npm/dt/validate-interface.svg)](https://www.npmjs.com/package/validate-interface)
[![npm](https://img.shields.io/npm/l/validate-interface.svg)](https://www.npmjs.com/package/validate-interface)

# Validate Objects Against TypeScript Interfaces #

- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Assertions](#assertions)
- [Handling Validation Errors](#handling-validation-errors)
- [Documentation](#documentation)
    - [Validator](#validator)
    - [extendValidator](#extendvalidator)
    - [validate](#validate)
    - [assertThat](#assertthat)
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
    - [minLength](#minLength)
    - [maxLength](#maxLength)
    - [lengthIs](#lengthis)
    - [isArray](#isarray)
    - [eachItem](#eachitem)
    - [isObject](#isobject)
    - [conformsTo](#conformsto)
    - [equals](#equals)

## Installation ##

`$ npm install --save validate-interface`

## Basic Usage ##

```ts
// 1) Define an interface
interface Employee {
  name: string;
  roleCode: number;
  completedTraining: boolean | undefined;
  addressPostcode: string;
}

// 2) Define a schema
const employeeValidator: Validator<Employee> = {
  name: assertThat('name', isString(minLength(1))),
  roleCode: assertThat('roleCode', isNumber(min(1, max(10)))),
  completedTraining: assertThat('completedTraining', optional(isBoolean())),
  addressPostcode: assertThat('addressPostcode', isString(matches(/^[a-z]{2}\d{1,2}\s+\d{1,2}[a-z]{2}$/i)))
};

// 3) Validate
let bob: Employee = validate({
  name: 'Bob Smith',
  roleCode: 7,
  completedTraining: true,
  addressPostcode: 'AB1 2CD'
}, employeeValidator);

// Catch and log error messages
try {
  let wrong: Employee = validate({
    name: 'Name',
    roleCode: 4,
    completedTraining: false,
    addressPostcode: 'WRONG'
  }, employeeValidator);
} catch (err) {
  console.log(err.toString());
}

// Outputs:
// Validation failed for $root.addressPostcode: Failed regular expression /^[a-z]{2}\d{1,2}\s+\d{1,2}[a-z]{2}$/i

```

## Assertions ##
This library provides a number of strongly-typed assertions which can be combined to validate the type of each property.

An assertion may take another assertion as its last argument; if assertion check passes, it calls the next assertion. For example, `isString(minLength(1, maxLength(10)))` first checks if the value is a string, then checks if its length is at least 1, and then checks that its length is no more than 10. If `isString` fails, `minLength` isn't run. Chaining assertions in this way allows for complex values to be validated.

Some assertions require other assertions to come before it. For example, `minLength` can't be used by itself because it needs another assertion to check that the value has the `length` property - so something like `isString(minLength(1))` or `isArray(minLength(0))`.

## Handling Validation Errors ##

Errors will always be of the type `ValidationError`, which has a number of useful properties:

- `errorCode`: A string which is one of a set of error codes, e.g. `NOT_STRING`. Useful for producing custom error messages or triggering certain error logic.
- `message`: A human-readable error message, with more information as to why the validation failed
- `path`: An array of objects that describe the path to the value that caused the validation to fail. Each object is either an `ArrayIndexPathNode` (which has an `index` property) or `KeyPathNode` (which has a `key` property).

There's a `toString` method which prints this information in a human-readable format.

## Documentation ##

### Validator ###

`Validator` is a special type that enables TypeScript to validate that your validator correctly aligns to the type it is supposed to validate.

```ts
interface IFoo {
  bar: string;
  baz: number;
}

// A valid validator
const fooValidator: Validator<IFoo> = {
  bar: assertThat('bar', isString()),
  baz: assertThat('baz', isNumber())
};

// All of these are invalid, and will result in an error from the TypeScript compiler

const fooValidator: Validator<IFoo> = {
  bar: assertThat('bar', isString())
}; // Missing 'baz'

const fooValidator: Validator<IFoo> = {
  bar: assertThat('bar', isNumber()), // Wrong type
  baz: assertThat('baz', isNumber())
};

const fooValidator: Validator<IFoo> = {
  bar: assertThat('bar', isString()),
  baz: assertThat('baz', isNumber()),
  blah: assertThat('blah', isBoolean()) // Unexpected property
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
  abc: assertThat('abc', isNumber())
};

interface IBar extends IFoo {
  xyz: string;
}

const barValidator: Validator<IBar> = extendValidator(fooValidator, {
  xyz: assertThat('xyz', isString())
});
```

### validate ###
`function validate<T>(arg: any, validator: Validator<T>): Validated<T>`

Checks that `arg` conforms to the type `T` using the given `validator`. Returns an object that conforms to `T` or throws an error.

### assertThat ###
Used to start an assertion chain.

### optional ###
Used when the property may not present on the object, or its value is undefined. Example:

```ts
interface IFoo {
  bar: string | undefined;
}

const fooValidator: Validator<IFoo> = {
  bar: assertThat('bar', optional(isString())),
};

// Both of these are acceptable
validate({}, fooValidator);
validate({bar: undefined}, fooValidator);
```

**Note:** it is recommended you specify `undefined` in the type (e.g. `prop: T | undefined`) instead of optional properties (e.g. `prop?: T`), because the compiler will allow optional properties to be missing from the validator, which would result in the property always defaulting to `undefined`:

```ts
interface IFoo {
  bar?: string;
}

// TypeScript will think this is a valid validator
const fooValidator: Validator<IFoo> = { };
```

### nullable ###
Used when the property could be null (e.g. `prop: T | null`).

```ts
interface IFoo {
  bar: string | null;
}

const fooValidator: Validator<IFoo> = {
  bar: assertThat('bar', nullable(isString())),
};
```


### defaultsTo ###
If the property on the object being validated is undefined, then return the given default value instead.

```ts
interface IFoo {
  bar: string;
}

const fooValidator: Validator<IFoo> = {
  bar: assertThat('bar', defaultsTo('baz', isString())),
};

const foo = validate({}, fooValidator);

console.log(foo);
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
  bar: assertThat('bar', onErrorDefaultsTo('baz', isString())),
};

const foo = validate({bar: 123}, fooValidator);

console.log(foo);
// {bar: 'baz'}
```
### isBoolean ###
Throws an error if the value is not a boolean.

### isNumber ###
Throws an error if the value is not a number.

### min ###
Throws an error if the value is less than the given minimum.

```ts
interface IFoo {
  bar: number;
}

const fooValidator: Validator<IFoo> = {
  bar: assertThat('bar', isNuber(min(0)))
};

// This will throw an error
const foo = validate({bar: -1}, fooValidator);
```

### max ###
Throws an error if the value is greater than the given maximum - see [min](#min).

### isString ###
Throws an error if the value is not a string.

### matches ###
Throws an error if the string value does not match the given regex.

```ts
interface IFoo {
  bar: string;
}

const fooValidator: Validator<IFoo> = {
  bar: assertThat('bar', isStirng(matches(/^[a-z]+$/)))
};

// This will throw an error
const foo = validate({bar: '123abc'}, fooValidator);
```

### minLength ###
Throws an error if length of the value (e.g. a string or an array) is less than the given minimum.

```ts
interface IFoo {
  bar: string;
}

const fooValidator: Validator<IFoo> = {
  bar: assertThat('bar', isStirng(minLength(1)))
};

// This will throw an error
const foo = validate({bar: ''}, fooValidator);
```

### maxLength ###
Throws an error if length of the value (e.g. a string or an array) is less than the given maximum - see [minLength](#minlength).

### lengthIs ###
Throws an error if length of the value (e.g. a string or an array) is not equal to the given length - see [minLength](#minlength).

### isArray ###
Throws an error if the value is not an array. If no other assertions are given, then the type defaults to `any[]`.

```ts
interface IFoo {
  bar: any[];
}

const fooValidator: Validator<IFoo> = {
  bar: assertThat('bar', isArray())
};

// This is valid
validate({
  bar: ['abc', 123, true, null]
}, fooValidator);

// Throws an error
validate({
  bar: 'baz'
}, fooValidator);
```

### eachItem ###
Throws an error if any value of an array does not match the following assertion chain.

```ts
interface IFoo {
  bar: number[];
}

const fooValidator: Validator<IFoo> = {
  bar: assertThat('bar', isArray(eachItem(isNumber())))
};

// This is valid
validate({
  bar: [1, 2, 3]
}, fooValidator);

// Throws an error
validate({
  bar: ['abc', 123, true, null]
}, fooValidator);
```

### isObject ###
Throws an error if the value is not an object.

```ts
interface IFoo {
  bar: any;
}

const fooValidator: Validator<IFoo> = {
  bar: assertThat('bar', isObject())
};

// This is valid, but it wouldn't be safe to access properties on foo.bar
const foo = validate({
  bar: {baz: 123}
}, fooValidator);

// Throws an error
validate({
  bar: 'object'
}, fooValidator);
```

### conformsTo ###
Throws an error if the value does not conform to the given validator.

```ts
interface IBar {
  baz: number;
}

interface IFoo {
  bar: IBar;
}

const barValidator: Validator<IBar> = {
  baz: assertThat('baz', isNumber())
};

const fooValidator: Validator<IFoo> = {
  bar: assertThat('bar', conformsTo(barValidator))
};

// This is valid
const foo = validate({
  bar: {
    baz: 123
  }
}, fooValidator);

// Throws an error
validate({
  bar: {
    baz: 'blah'
  }
}, fooValidator);
```

### equals ###
Throws an error if the value does not equal one of the given values.

```ts
type Bar = 'A' | 'B' | 'C';

interface IFoo {
  bar: Bar;
}

const fooValidator: Validator<IFoo> = {
  bar: assertThat('bar', equals<Bar>('A', 'B', 'C'))
};

// Throws an error
validate({
  bar: 'D'
}, fooValidator);
```
