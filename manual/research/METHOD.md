# Research method

## Collection

We collect provider documentation, model guidance, reproducible prompt outputs, maintained pattern catalogs, corpus research, and community reports. Official sources establish documented behavior. Community reports help form hypotheses, but do not become facts through repetition.

## Controlled benchmark

The prompts in `manual/benchmarks/baseline-prompts.json` cover a product page, an operational app, a dense dashboard, an editorial page, a rewrite, an executive summary, and an error-state flow. A run gives each generator the same prompt in a new project with default settings and records the date, model, template, visible defaults, and deviations.

No run has been recorded yet. Recorded runs will live in `manual/benchmarks/runs/`. Until then, every rule rests on provider documentation and the cited catalogs, and its evidence label says so.

## Rule admission

A rule enters the catalog when the provider documents it, when it repeats across recorded benchmark runs, or when more than one independent source corroborates it. Each entry includes a better move because prohibition alone creates a new house style.

## Limits

The catalog describes defaults and recurring patterns. It does not detect authorship. A strong local design system can eliminate many tool-specific tendencies. Model and product updates can make a rule stale, which is why the radar script checks sources and rules retain review dates.

## Update policy

Automation may refresh timestamps, changed page hashes, and repository revisions, and it may open a pull request. It may not change editorial guidance or evidence levels without human review.
