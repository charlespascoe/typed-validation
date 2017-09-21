# Validate Objects Against TypeScript Interfaces

## Installation

`$ npm install validate-interface`

## Basic Usage

```ts
// 1) Define an interface
interface Person {
  name: string;
  age: number;
  single: boolean;
  phoneNumber?: string;
}

// 2) Define a schema
const personSchema: Schema<Person> = {
  name: assertThat('name', isString(minLength(1))),
  age: assertThat('age', isNumber(min(12, max(100)))),
  single: assertThat('single', isBoolean()),
  phoneNumber: assertThat('phoneNumber', optional(isString(matches(/^(\+44|0)[1-9][0-9]{9}$/))))
};

// 3) Validate
let bob: Person = validate({
  name: 'Bob Smith',
  age: 24,
  single: false
}, personSchema);

// Catch and log error messages
try {
  let wrong: Person = validate({
    name: 'Name',
    age: 30,
    single: true,
    phoneNumber: 'xyz'
  }, personSchema);
} catch (err) {
  console.log(err.message);
}

// Outputs:
// Assertion failed for phoneNumber:
//   Failed regular expression: /^(\+44|0)[1-9][0-9]{9}$/

```
