# Not Like Us agent instructions

Apply this repository in this order:

1. Read `manual/rules/WRITING.md` and `manual/rules/DESIGN.md`.
2. Read both guides in `manual/tools/<tool>/` for the tool you are using.
3. Inspect the project's existing product, audience, content, brand, and component system.
4. Treat local design systems and voice guides as higher priority than this repository.
5. Before delivery, run the checks below and state any intentional exception.

The same rules are packaged as an installable skill in `skills/not-like-us/SKILL.md`.

## Hard checks

- Do not infer a brand from the generator's defaults.
- Do not make a marketing landing page when the task is an app.
- Do not use purple gradients, aurora blobs, glass panels, or dark zinc as an unprompted mood.
- Do not use Inter, Geist, a high-contrast serif, or an italic display word without a reason tied to the brand.
- Do not wrap every section in a rounded card or arrange every argument into three equal columns.
- Do not use icons, pills, charts, testimonials, metrics, or motion as filler.
- Do not write throat-clearing openings, binary contrast slogans, fake quotations, vague consensus, or recap conclusions.
- Do not use em dashes.
- Do not claim that a single pattern proves AI authorship.
- Use real content and real states. Mark fabricated demo data clearly.

## Delivery check

Ask: could this exact writing, palette, type system, component mix, and page sequence be pasted into an unrelated AI product? If yes, revise the parts that travel too easily.

Machine-readable rules are in `manual/data/rules.json`. Stable IDs may be cited in reviews, for example `D-COLOR-001`.
