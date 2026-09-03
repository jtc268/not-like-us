# Research method

## Collection

We collect provider documentation, model guidance, reproducible prompt outputs, maintained pattern catalogs, corpus research, and community reports. Official sources establish documented behavior. Community reports help form hypotheses, but do not become facts through repetition.

## The release test

The release benchmark uses a fixed private suite across design and writing. Every model release runs at default settings with no system prompt, then runs again with the Not Like Us rules as standing instructions.

The runner stores its outputs and ledger outside the public repository. It asks a judge model to name the defaults in the first pass against the catalog and retains rendered design output for review.

Judge findings are drafts. A maintainer keeps, rejects, or turns each into a rule with the model in its scope. Only then does it reach the stream, and the run's `reviewed` flag flips.

The separate manual-builder suite is private too.

## Rule admission

A rule enters the catalog when the provider documents it, when it repeats across recorded release tests, or when more than one independent source corroborates it. Each entry includes a better move because prohibition alone creates a new house style.

## Limits

The catalog describes defaults and recurring patterns. It does not detect authorship. A strong local design system can eliminate many tool-specific tendencies. Model and product updates can make a rule stale, which is why the radar script checks sources and rules retain review dates.

## Update policy

Automation may refresh timestamps, changed page hashes, and repository revisions, and it may open a pull request. It may not change editorial guidance or evidence levels without human review.
