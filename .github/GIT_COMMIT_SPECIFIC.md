# GIT COMMIT MESSAGE CHEAT SHEET

## Proposed Format of the Commit Message

```
<type>: <subject>

<body>
```

All lines are wrapped at 100 characters !

## Allowed `<type>`

- feat (A new feature)
- fix (A bug fix)
- docs (Documentation only changes)
- style (Changes that do not affect the meaning of the code (white-space, formatting, missing semi-colons, etc))
- perf (A code change that improves performance)
- refactor (A code change that neither fixes a bug nor adds a feature)
- test (Adding missing tests or correcting existing tests)
- build (Changes that affect the build system or external dependencies (example scopes: gulp, broccoli, npm))
- ci (Changes to our CI configuration files and scripts (example scopes: Travis, Circle, BrowserStack, SauceLabs))
- chore (Other changes that don't modify src or test files)
- revert (Reverts a previous commit)
- release (Relase version)

## Message Body

- uses the imperative, present tense: "change" not "changed" nor "changes"
- includes motivation for the change and contrasts with previous behavior
- a body is allowed to contain more than one changes, each change should use `*` as list style
