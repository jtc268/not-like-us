![Not Like Us, anti-default field manual](public/not-like-us-banner.png)

# Not Like Us

An open, cited field manual for making AI-assisted writing and interfaces look like they came from a specific person, product, and situation.

Point an agent at this repository, or paste the block below into its project rules.

## Copy this into any AI

```text
Use the Not Like Us rules for every writing and interface decision.
Read: https://github.com/jtc268/not-like-us

Start from the audience, task, and existing brand. Do not invent a generic house style.
Avoid purple gradients, Inter-by-reflex, glass cards, rounded-everything, card grids,
centered hero formulas, decorative pills, icon tiles, fake dashboards, and motion without purpose.
Avoid throat-clearing, binary contrast slogans, faux insight, hype, vague attribution,
rule-of-three filler, synonym cycling, stacked fragments, recap endings, and em dashes.
Use concrete details, real hierarchy, domain-specific structure, deliberate type, restrained color,
plain claims, named sources, varied sentence rhythm, and a human review before shipping.
When a local design system or voice guide conflicts with this block, follow the local system.
```

## Start here

- Agents: read [AGENTS.md](AGENTS.md), then the relevant tool's `WRITING.md` and `DESIGN.md`.
- People: start with [the universal writing guide](rules/WRITING.md) or [the universal design guide](rules/DESIGN.md).
- Systems: consume [not-like-us.json](not-like-us.json) or [data/rules.json](data/rules.json).
- Maintainers: see [CONTRIBUTING.md](CONTRIBUTING.md) and [the research method](research/METHOD.md).

## Field guides

| Tool | Writing | Design |
| --- | --- | --- |
| Lovable | [Guide](tools/lovable/WRITING.md) | [Guide](tools/lovable/DESIGN.md) |
| Claude | [Guide](tools/claude/WRITING.md) | [Guide](tools/claude/DESIGN.md) |
| Codex | [Guide](tools/codex/WRITING.md) | [Guide](tools/codex/DESIGN.md) |
| ChatGPT | [Guide](tools/chatgpt/WRITING.md) | [Guide](tools/chatgpt/DESIGN.md) |
| v0 | [Guide](tools/v0/WRITING.md) | [Guide](tools/v0/DESIGN.md) |
| Bolt | [Guide](tools/bolt/WRITING.md) | [Guide](tools/bolt/DESIGN.md) |
| Cursor | [Guide](tools/cursor/WRITING.md) | [Guide](tools/cursor/DESIGN.md) |
| Replit | [Guide](tools/replit/WRITING.md) | [Guide](tools/replit/DESIGN.md) |
| Base44 | [Guide](tools/base44/WRITING.md) | [Guide](tools/base44/DESIGN.md) |
| Gemini | [Guide](tools/gemini/WRITING.md) | [Guide](tools/gemini/DESIGN.md) |
| Gamma | [Guide](tools/gamma/WRITING.md) | [Guide](tools/gamma/DESIGN.md) |

## Limits

This project does not detect AI authorship. A purple gradient, an em dash, or a three-card row proves nothing. Use the catalog to notice clusters of unearned choices and replace them with choices grounded in the actual work.

## How we check rules

Each rule has a stable ID, scope, source list, and evidence level:

- **Documented:** the product or model provider describes the behavior.
- **Observed:** the pattern repeats in controlled prompts or public artifacts.
- **Corroborated:** independent sources report the same pattern.
- **Hypothesis:** useful enough to test, not strong enough to state as fact.

Rules are reviewed weekly by automation and changed through pull requests. The radar can flag stale sources and product changes, but a human must approve any guidance change.

## License

Code is [MIT](LICENSE). Editorial guidance is [CC BY 4.0](LICENSE-CONTENT.md).
