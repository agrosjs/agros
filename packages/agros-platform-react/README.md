<p align="center">
    <a href="https://agrosjs.github.io">
        <img alt="Agros" src="https://avatars.githubusercontent.com/u/107540884?s=200&v=4" width="120">
    </a>
</p>

<p align="center">Build robust, clean and scalable web applications.</p>

<p align="center">
  <a href="https://github.com/agrosjs/agros/blob/master/LICENSE"><img src="https://img.shields.io/github/license/agrosjs/agros"></a>
  <a href="https://www.npmjs.com/package/@agros/app"><img src="https://img.shields.io/npm/v/@agros/app.svg"></a>
  <a href="https://www.npmjs.com/package/@agros/app"><img src="https://img.shields.io/npm/dm/@agros/app.svg"></a>
  <a href="https://app.circleci.com/pipelines/github/agrosjs/agros"><img src="https://img.shields.io/circleci/build/github/agrosjs/agros" /></a>
</p>

---

# Introduction

Agros is a framework for building robust, clean and scalable web applications. It based on TypeScript and combines elements of OOP (Object Oriented Programming), FP (Functional Programming).

## Motivation

Web front-end frameworks (such as React.js, Vue.js and so on) has greatly helped developers build fast and responsive web applications, while its simplicity has also allowed it to accumulate a large number of users in a short period of time, and some large websites have started to be built entirely using them. All of this speaks volumes about the success of them. However, there are a number of architectural problems with building large web applications using front-end frameworks that add up to additional and increasingly large expenses for maintaining and iterating on the project, and Agros was created to solve these problems.

Inspired by [Angular](https://angular.io) and [Nest.js](https://nestjs.com/) and based on multiple platforms support, Agros provides an out-of-the-box experience to help developers create highly available, highly maintainable, stable, and low-coupling web applications.

## Features

- Framework irrelevant. It would be OK to use different frameworks to build web applications with Agros, It has a core factory function that governs everything Agros needs and is implemented by the platform to support different front-end frameworks
- Full CLI supported to help standardize workflow and project structure

## Requirements

- ✅ Use TypeScript to write project
- ❇️ Node.js v16.0.0 or later

## Quick Start

### Install Agros CLI

The Agros CLI helps you easily make and configure collections (providers, components and modules) into your projects, which is useful when the structure project is increasing.

```
npm i @agros/cli -g
```

Here comes the usages of Agros CLI:

```
Usage: agros [options] [command]

Options:
  -V, --version   output the version number
  -h, --help      display help for command

Commands:
  generate|g      Generate Agros.js collections
  update|u        Update an Agros.js collections with another collection
  routes|r        Manage project routes
  help [command]  display help for command
```

### Create an Agros project

Create an Agros project by Agros CLI:

```bash
agros generate application
```

As an alternative, you can also use Agros official-recommended scaffold `@agros/create-app` and prepare project directory:

```bash
npm i @agros/create-app -g
mkdir example-project && cd example-project
```

Run create command:

```bash
npm create @agros/app
# or
create-agros-app
```

Follow the instruction and the project will be initialized in the directory.

### Configure TypeScript

In your `tsconfig.json` file in the project root directory, add following options into it:

```json
{
    "compilerOptions": {
        "emitDecoratorMetadata": true,
        "experimentalDecorators": true,
    },
}
```

### Run the Project

```bash
npm start
# or
npx agros-app start
```

### Build the Project

```bash
npm run build
# or
npx agros-app build
```

# Participate in Project Development

Getting involved in the development of Agros is welcomed. But before that, please read the [Code of Conduct](CODE_OF_CONDUCT.md) of Agros. You can also read [this doc](.github/CONTRIBUTING.md) to get more information about contribute your code into this repository.

> Before starting working on the project, please upgrade your Node.js version to v16.0.0 or later.

# Sponsorship

We accept sponsorship and are committed to spending 100% of all sponsorship money on maintaining Agros, including but not limited to purchasing and maintaining the Agros documentation domain, servers, and paying stipends to some of our core contributors.

Before initiating a sponsorship, please send an email to [i@lenconda.top](i@lenconda.top) or [prexustech@gmail.com](prexustech@gmail.com) with your name, nationality, credit card (VISA or MasterCard) number, what problem Agros has helped you solve (optional), and a thank-you message (optional), etc. After review and approval, we will reply with an email with a payment method that you can complete the sponsorship via this email.

Thank you so much for your support of the Agros project and its developers!
