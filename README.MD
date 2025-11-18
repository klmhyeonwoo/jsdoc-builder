# JSDoc Builder

JSDoc Builder is a CLI tool for automatically generating JSDoc comments for JavaScript, TypeScript, JSX, TSX, and Vue files. It parses functions and variables to infer parameter types, return types, and descriptions, and then inserts JSDoc comments directly into the source code.

## Features

- Automatically generates JSDoc comments for:
  - Function declarations
  - Arrow functions
  - TypeScript types and interfaces
- Supports multiple file formats:
  - JavaScript (`.js`)
  - TypeScript (`.ts`)
  - JSX (`.jsx`)
  - TSX (`.tsx`)
  - Vue Single File Components (`.vue`)
- Infers parameter and return types from TypeScript annotations.
- Outputs clean and structured JSDoc comments.
- Preserves Vue SFC structure (template, script, and style sections).

## Installation

Install the library globally or locally via npm:

```bash
npm install jsdoc-builder -g
```

or

```bash
npm install jsdoc-builder --save-dev
```

## Usage

### CLI Command

Run the following command to generate JSDoc comments for a file:

```bash
jsdoc-builder <file-path>
```

Replace `<file-path>` with the path to the JavaScript, TypeScript, JSX, TSX, or Vue file you want to process.

### Example

#### Input File (`example.ts`):

```typescript
function add(a: number, b: number) {
  return a + b;
}

const multiply = (a: number, b: number): number => {
  return a * b;
};
```

#### Command:

```bash
jsdoc-builder example.ts
```

#### Output File (`example.ts`):

```typescript
/**
 * @description Press Your { Function add } Description
 * @param {number} a
 * @param {number} b
 * @returns {void}
 */
function add(a: number, b: number) {
  return a + b;
}

/**
 * @description Press Your { Function multiply } Description
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
const multiply = (a: number, b: number): number => {
  return a * b;
};
```

### JSX Example

#### Input File (`example.jsx`):

```jsx
function Component(props) {
  return <div>{props.title}</div>;
}

const ArrowComponent = (props) => {
  return <div>{props.content}</div>;
};
```

#### Command:

```bash
jsdoc-builder example.jsx
```

#### Output File (`example.jsx`):

```jsx
/**
 * @description Press Your { Function Component } Description
 * @param {any} props
 * @returns {void}
 */
function Component(props) {
  return <div>{props.title}</div>;
}

/**
 * @description Press Your { Function ArrowComponent } Description
 * @param {any} props
 * @returns {void}
 */
const ArrowComponent = (props) => {
  return <div>{props.content}</div>;
};
```

### Vue Example

#### Input File (`example.vue`):

```vue
<template>
  <div>{{ message }}</div>
</template>

<script>
function greet(name) {
  return `Hello, ${name}`;
}

export default {
  name: 'ExampleComponent',
  setup() {
    return { greet };
  }
}
</script>
```

#### Command:

```bash
jsdoc-builder example.vue
```

#### Output File (`example.vue`):

```vue
<template>
  <div>{{ message }}</div>
</template>

<script>
/**
 * @description Press Your { Function greet } Description
 * @param {any} name
 * @returns {void}
 */
function greet(name) {
  return `Hello, ${name}`;
}

export default {
  name: 'ExampleComponent',
  setup() {
    return { greet };
  }
}
</script>
```

## API

### `generateJSDoc(filePath: string): void`

- **Description**: Processes the specified file to add JSDoc comments.
- **Parameters**:
  - `filePath` (string): The path to the file to be processed.
- **Returns**: `void`

## Contributing

Contributions are welcome! Please follow these steps:

1. Fork the repository.
2. Create a new branch: `git checkout -b feature-name`.
3. Commit your changes: `git commit -m 'Add feature-name'`.
4. Push to the branch: `git push origin feature-name`.
5. Submit a pull request.

## License

This project is licensed under the MIT License. See the LICENSE file for details.
