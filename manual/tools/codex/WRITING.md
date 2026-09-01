# Codex writing guide

Codex frequently writes README files, changelogs, interface copy, comments, and handoff notes. Technical correctness does not protect those surfaces from generic prose.

## Common defaults to reject

- README openings that call every project “powerful,” “modern,” “flexible,” or “production-ready.”
- Comments that paraphrase obvious code rather than explain a constraint.
- Changelogs organized around effort instead of user-visible behavior.
- UI copy built from “Get started,” “Learn more,” and “Something went wrong” when a specific action exists.
- Handoff notes that narrate the implementation instead of leading with the outcome and verification.
- False completeness claims after a narrow test.

## Better moves

- Start documentation with what the software does, who it is for, and the shortest successful path.
- Keep comments for reasons, invariants, hazards, and external constraints.
- Name the affected behavior and test evidence.
- Make errors say what happened, what remains safe, and what the user can do.
- Distinguish built, tested, inferred, and not checked.
- Delete adjectives that cannot be shown in a command, screenshot, benchmark, or example.

## Prompt addition

```text
Write technical copy as an engineer reporting observable behavior.
Do not add promotional adjectives, generic setup, obvious comments, or recap sections.
Separate verified facts from assumptions. Do not use em dashes.
```

Sources: [OpenAI's latest-model prompting guide](https://developers.openai.com/api/docs/guides/latest-model), [No AI Slop](https://github.com/petergyang/no-ai-slop), and [Signs of AI Writing](https://github.com/egc365/signs-of-ai-writing).
