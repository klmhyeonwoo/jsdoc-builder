# JSDoc Builder

JSDoc Builder is a CLI tool for automatically generating JSDoc comments for JavaScript and TypeScript files. It parses functions and variables to infer parameter types, return types, and descriptions, and then inserts JSDoc comments directly into the source code.

## Features

- Automatically generates JSDoc comments for:
  - Function declarations
  - Arrow functions
  - TypeScript types and interfaces
- Infers parameter and return types from TypeScript annotations.
- **AI-Powered Descriptions**: Use OpenAI to generate meaningful function descriptions automatically.
- Outputs clean and structured JSDoc comments.

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

### Basic Usage (Without AI)

Run the following command to generate JSDoc comments for a file:

```bash
jsdoc-builder <file-path>
```

Replace `<file-path>` with the path to the JavaScript or TypeScript file you want to process.

### AI-Powered Usage

To enable AI-powered description generation using OpenAI:

```bash
jsdoc-builder <file-path> --ai --api-key YOUR_OPENAI_API_KEY
```

Or set the API key as an environment variable:

```bash
export OPENAI_API_KEY=your_api_key_here
jsdoc-builder <file-path> --ai
```

You can also specify a different model:

```bash
jsdoc-builder <file-path> --ai --model gpt-4
```

### CLI Options

- `--ai` - Enable AI-powered description generation
- `--api-key <key>` - OpenAI API key (can also be set via `OPENAI_API_KEY` environment variable)
- `--model <model>` - AI model to use (default: `gpt-3.5-turbo`)

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

#### Basic Command (Without AI):

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

#### AI-Powered Command:

```bash
export OPENAI_API_KEY=your_api_key_here
jsdoc-builder example.ts --ai
```

#### AI-Generated Output:

The AI will generate contextual descriptions based on the function code, parameter names, and types:

```typescript
/**
 * @description Adds two numbers and returns their sum
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
function add(a: number, b: number) {
  return a + b;
}

/**
 * @description Multiplies two numbers and returns the product
 * @param {number} a
 * @param {number} b
 * @returns {number}
 */
const multiply = (a: number, b: number): number => {
  return a * b;
};
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
