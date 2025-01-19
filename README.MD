# JSDoc Generator

JSDoc Generator is a CLI tool for automatically generating JSDoc comments for JavaScript and TypeScript files. It parses functions and variables to infer parameter types, return types, and descriptions, and then inserts JSDoc comments directly into the source code.

## Features

- Automatically generates JSDoc comments for:
  - Function declarations
  - Arrow functions
  - TypeScript types and interfaces
- Infers parameter and return types from TypeScript annotations.
- Outputs clean and structured JSDoc comments.

## Installation

Install the library globally or locally via npm:

```bash
npm install jsdoc-generator -g
```

or

```bash
npm install jsdoc-generator --save-dev
```

## Usage

### CLI Command

Run the following command to generate JSDoc comments for a file:

```bash
jsdoc-generator <file-path>
```

Replace `<file-path>` with the path to the JavaScript or TypeScript file you want to process.

### Example

#### Input File (`example.ts`):

````typescript
function add(a: number, b: number) {
  return a + b;
}

const multiply = (a: number, b: number): number => {
  return a * b;
};

#### Command:

```bash
jsdoc-generator example.ts
````

#### Output File (`example.ts`):

```typescript
/**
 * @description Press your { Function add } description
 * @param {number} a
 * @param {number} b
 * @returns {void}
 */
function add(a: number, b: number) {
  return a + b;
}

/**
 * @description Press your { Function multiply } description
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
const multiply = (a: number, b: number): number => {
  return a * b;
};

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
```
