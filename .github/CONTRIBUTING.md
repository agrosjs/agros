# Contributing Guide

We are grateful for your selfless contribution to the project. We hope that contributing to this project would be as simple and transparent as possible, regardless whatever it is (including but not limited to):

- Reporting bugs
- Fixing bugs
- Submitting Pull Requests
- Suggestions for new feature(s)
- Becoming a maintainer (for this project)

The following content is a serial of guidelines for contributing to `Agros`. Before starting your work, you are supposed to read the following advice:

- Understand what changes you want to make
- Look through the issue list and check if there's an issue to solve the same problem
- **Publish** and/or **redistribute** this project should under [MIT](LICENSE) license

## Code of Conduct

We have proposed a [Code of Conduct](CODE_OF_CONDUCT.md) to *regulate* the behavior of each participant. We sincerely hope each participant would be able to firmly entrenched to this conduct. Therefore, please take some time to read the full content in that file.

## Setup Environment

Install PNPM & Rush.js:

```bash
npm i pnpm @microsoft/rush -g
```

Clone repo and initialize the setup environment:

```bash
git clone git@github.com:agrosjs/agros.git
cd agros && npm i && rush update
```

And run the example:

```bash
pnpm --filter @agros/example start
```

You can access the example project from `http://127.0.0.1:3000`.

## Flow Management

### For Core Contributors

#### New Feature

1. Checkout a new branch from `master`, name it as `feature/<name>`
2. Commit code to this branch
3. Make a Pull Request that merge from your branch to `master`

#### Hot Fixes

1. Checkout a new branch from `master`, name it as `hotfix/<name>`
2. Fix bugs and commit code to this branch
3. Make a Pull Request to `master`
4. Merge and tag a new version in `agros@<number>.<number>.<number>` format

### For Normal Contributors

1. Fork this project to your namespace
2. Commit code and push to your forked origin
3. Make a Pull Request, merge from your repo to `master` branch of `agrosjs/agros`

## Start Developing

We provide a lot of examples, you can run the examples：

After setting up project, you can run the following command to start TSC watchers:

```bash
cd agros
rush build
```

After executing the commands above, the packages will be compiled from TS to JS automatically.

Once you finish your development work, you should make a Pull Request from your branch to `origin/master` on GitHub.

## Pull Request Guidelines

- Only code that's ready for release should be committed to the master branch. All development should be done in dedicated branches.
- Checkout a **new** topic branch from master branch, and merge back against master branch.
- Make sure `npm test` passes.
- If adding new feature:
  - Add accompanying test case.
  - Provide convincing reason to add this feature. Ideally you should open a suggestion issue first and have it greenlighted before working on it.
- If fixing a bug:
  - If you are resolving a special issue, add `(fix #xxxx[,#xxx])` (#xxxx is the issue id) in your PR title for a better release log, e.g. `update entities encoding/decoding (fix #3899)`.
  - Provide detailed description of the bug in the PR. Live demo preferred.
  - Add appropriate test coverage if applicable.

## Publishing

> This could be done only with the owner access of this project.

In `master` branch, run:

```bash
(git master)$ rush change --target-branch origin/publish
```

Answer the questions and write the changelogs in the prompt, and there will be several changelogs that indeicates the changed packages.

Then, run:

```bash
(git master)$ rush publish --apply
```

Versions will be bumped. Then merge the `origin/master` branch into `origin/publish` and run:

```bash
(git publish)$ rush publish --publish --include-all
```

> There is no need to run these commands manually, it is overtook by CI/CD workflows

# Issue Reporting Guide

- The issue list of this repo is **exclusively** for bug reports and feature requests. Non-conforming issues will be closed immediately.
  - For simple beginner questions, you can get quick answers from
  - For more complicated questions, you can use Google or StackOverflow. Make sure to provide enough information when asking your questions - this makes it easier for others to help you!
- Try to search for your issue, it may have already been answered or even fixed in the development branch.
- It is **required** that you clearly describe the steps necessary to reproduce the issue you are running into. Issues with no clear repro steps will not be triaged. If an issue labeled "need repro" receives no further input from the issue author for more than 5 days, it will be closed.
- For bugs that involves build setups, you can create a reproduction repository with steps in the README.
- If your issue is resolved but still open, don’t hesitate to close it. In case you found a solution by yourself, it could be helpful to explain how you fixed it.

# Git Commit Specific

- Your commits message must follow our [git commit specific](./GIT_COMMIT_SPECIFIC.md).
- We will check your commit message, if it does not conform to the specification, the commit will be automatically refused, make sure you have read the specification above.
- You could use `git cz` with a CLI interface to replace `git commit` command, it will help you to build a proper commit-message, see [commitizen](https://github.com/commitizen/cz-cli).
