# Contributing Guide

We are grateful for your selfless contribution to the project. We hope that contributing to this project would be as simple and transparent as possible, regardless whatever it is (including but not limited to):

- Reporting bugs
- Fixing bugs
- Submitting Pull Requests
- Suggestions for new feature(s)
- Becoming a maintainer (for this project)

The following content is a serial of guidelines for contributing to `Khamsa`. Before starting your work, you are supposed to read the following advice:

- Understand what changes you want to make
- Look through the issue list and check if there's an issue to solve the same problem
- **Publish** and/or **redistribute** this project should under [MIT](LICENSE) license

## Code of Conduct

We have proposed a [Code of Conduct](CODE_OF_CONDUCT.md) to *regulate* the behavior of each participant. We sincerely hope each participant would be able to firmly entrenched to this conduct. Therefore, please take some time to read the full content in that file.

## Setup Environment

Clone repo and initialize the setup environment:

```bash
git clone git@github.com:lenconda/khamsa.git
cd khamsa && npm i
```

## Flow Management

### For Core Contributors

#### New Feature

1. Checkout a new branch from `master`, name it as `feat/<name>`
2. Commit code to this branch
3. Make a Pull Request that merge from your branch to `master`

#### Hot Fixes

1. Checkout a new branch from `master`, name it as `hotfix/<name>`
2. Fix bugs and commit code to this branch
3. Make a Pull Request to `master`
4. Merge and tag a new version in `khamsa@<number>.<number>.<number>` format

### For Normal Contributors

1. Fork this project to your namespace
2. Commit code and push to your forked origin
3. Make a Pull Request, merge from your repo to `master` branch of `lenconda/khamsa`

## Start Developing

We provide a lot of examples, you can run the examples：

After setting up project, you can run the following command to start TSC watchers:

```bash
$ cd khamsa
$ npm run watch
```

After executing the commands above, the packages will be watched to compile from TS to JS automatically.

## Versioning

Please note that the version must follow the following conventions:
The version is seperated by `major`, `minor` and `patch` parts:
1. `major` means major updates, usually represents the API changes or some APIs are deleted
2. `minor` means the new version add some new APIs or refactor the existed APIs
3. `patch` means some bugs are fixed

## Publish Packages

> NOTE: Only core contributors can publish packages, by merging from other branch to `master` and add a tag in `khamsa@<number>.<number>.<number>` format. After a commit on `master` is beeing tagged, the CI will build and publish all packages automatically.

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

## Issue Reporting Guidelines

- The issue list of this repo is **exclusively** for bug reports and feature requests. Non-conforming issues will be closed immediately.
  - For simple beginner questions, you can get quick answers from
  - For more complicated questions, you can use Google or StackOverflow. Make sure to provide enough information when asking your questions - this makes it easier for others to help you!
- Try to search for your issue, it may have already been answered or even fixed in the development branch.
- It is **required** that you clearly describe the steps necessary to reproduce the issue you are running into. Issues with no clear repro steps will not be triaged. If an issue labeled "need repro" receives no further input from the issue author for more than 5 days, it will be closed.
- For bugs that involves build setups, you can create a reproduction repository with steps in the README.
- If your issue is resolved but still open, don’t hesitate to close it. In case you found a solution by yourself, it could be helpful to explain how you fixed it.

## Git Commit Specific

- Your commits message must follow our [git commit specific](./GIT_COMMIT_SPECIFIC.md).
- We will check your commit message, if it does not conform to the specification, the commit will be automatically refused, make sure you have read the specification above.
- You could use `git cz` with a CLI interface to replace `git commit` command, it will help you to build a proper commit-message, see [commitizen](https://github.com/commitizen/cz-cli).
