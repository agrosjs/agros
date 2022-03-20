# Khamsa

Build your React.js apps by modules and dependency injecting.

## Installation

In your React.js project, run following command:

```bash
npm i khamsa -S
# or
yarn add khamsa
```

## Requirements

- Node.js 12.x and later
- Use TypeScript to write project

## Project Setup

### TypeScript Configuration

In your `tsconfig.json` file in the project root directory, add following options into it:

```json
{
    // ...
    "compilerOptions": {
        // ...
        "emitDecoratorMetadata": true,
        "experimentalDecorators": true,
    },
    //...
}
```

### Babel Configuration

Install Babel plugins:

```
npm i babel-plugin-transform-typescript-metadata -D
npm i @babel/plugin-proposal-decorators -D
npm i @babel/plugin-proposal-class-properties -D
```

In your `.babelrc` or `.babelrc.json` or other types of configuration file for Babel, write the code as below:

```json
{
    "plugins": [
        "babel-plugin-transform-typescript-metadata",
        [
            "@babel/plugin-proposal-decorators",
            {
                "legacy": true,
            },
        ],
        [
            "@babel/plugin-proposal-class-properties",
            {
                "loose": true,
            },
        ],
    ]
}
```

> For [`create-react-app`](https://create-react-app.dev/) users, please checkout the example in [`config-overrides.js`](examples/config-overrides.js).

## Usage

### Basic Concepts

#### `Module`

A module is a class annotated with a `@Module()` decorator. The `@Module()` decorator provides metadata that Khamsa makes use of to organize the application structure.

When a Khamsa instance is to be initialized, one and only one module, called the root module, must be provided as the entry module for the application built by Khamsa.
