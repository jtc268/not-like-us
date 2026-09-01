# Contributing

A contribution should make the field manual more accurate. Length is not the goal.

## A useful report contains

- tool and version or date
- exact prompt or reproducible setup
- output or screenshot with sensitive data removed
- the recurring choice you observed
- at least one better move that remains context-dependent
- source type: official, research, repository, benchmark, or community

## Before opening a pull request

Run the validator from the repository root:

```sh
node manual/scripts/validate.mjs
```

It checks that every rule has an ID, scope, evidence level, and known sources, that every link in a rule or guide appears in `manual/data/sources.json`, that the README paste block matches `manual/prompt.txt`, that the skill mentions every rule ID, and that no file contains an em dash.

A rule may not claim that a pattern proves AI authorship. New tool folders must contain both `WRITING.md` and `DESIGN.md`.

The radar script only updates source metadata. A maintainer must review any editorial change.
