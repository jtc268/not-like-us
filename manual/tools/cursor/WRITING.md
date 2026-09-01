# Cursor writing guide

Cursor writes within repositories, so its most visible prose is often comments, documentation, tests, commit-ready summaries, and interface strings.

## Common defaults to reject

- Comments that translate code into English.
- Docstrings that restate names while omitting constraints and failures.
- Test names filled with “should” but vague about the behavior under test.
- README additions that advertise instead of documenting.
- UI strings that invent a new product vocabulary.
- Long change summaries that do not say what was verified.

## Better moves

- Explain why a non-obvious choice exists and what breaks if it changes.
- Name input, condition, and observable outcome in tests.
- Reuse the repository's nouns exactly.
- Put the result and verification first in handoffs.
- Delete generated prose that has no maintenance value.

Sources: [Cursor documentation](https://docs.cursor.com/), [No AI Slop](https://github.com/petergyang/no-ai-slop), and [OpenAI's latest-model prompting guide](https://developers.openai.com/api/docs/guides/latest-model).
