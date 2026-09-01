# Research method

## Collection

We collect provider documentation, model guidance, reproducible prompt outputs, maintained pattern catalogs, corpus research, and community reports. Official sources establish documented behavior. Community reports help form hypotheses, but do not become facts through repetition.

## The release test

`manual/benchmarks/suite.json` holds six prompts: two interface builds that return one HTML file and four pieces of writing. Every model release gets all six with default settings and no system prompt, then all six again with the paste block and the universal rules as standing instructions. Six is enough to see a model's habits and cheap enough to run on every release.

`node manual/scripts/release-test.mjs --model <id>` records both outputs, asks a judge model to name the defaults in the first against the catalog, writes `manual/benchmarks/runs/<date>-<model>/run.json` with the rendered HTML beside it, and regenerates `manual/benchmarks/LEDGER.md`. The runner talks to any OpenAI-compatible endpoint.

Judge findings are drafts. A maintainer keeps, rejects, or turns each into a rule with the model in its scope. Only then does it reach the stream, and the run's `reviewed` flag flips.

`manual/benchmarks/baseline-prompts.json` is the older prompt set for manual runs inside product builders such as Lovable and v0, where an API is not the interface.

## Rule admission

A rule enters the catalog when the provider documents it, when it repeats across recorded release tests, or when more than one independent source corroborates it. Each entry includes a better move because prohibition alone creates a new house style.

## Limits

The catalog describes defaults and recurring patterns. It does not detect authorship. A strong local design system can eliminate many tool-specific tendencies. Model and product updates can make a rule stale, which is why the radar script checks sources and rules retain review dates.

## Update policy

Automation may refresh timestamps, changed page hashes, and repository revisions, and it may open a pull request. It may not change editorial guidance or evidence levels without human review.
