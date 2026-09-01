# Claude writing guide

Claude often produces fluent, considerate prose. Without a strong voice target, that fluency can smooth away tension and turn a direct point into a balanced essay.

## Common defaults to reject

- Long acknowledgments before the answer.
- Paired constructions such as “not merely X, but Y.”
- Calm, abstract synthesis after the evidence has already made the point.
- Repeated signposting: “First,” “Importantly,” “That said,” and “Ultimately.”
- Symmetrical lists and paragraph lengths that make every subject feel equally weighted.
- A polished concluding paragraph that restates the thesis.
- Frequent em dashes used to simulate conversational rhythm.

## Better moves

- Put the decision or answer in the first sentence.
- Preserve sharp opinions, odd wording, and useful asymmetry from the source.
- Name the exact disagreement instead of balancing every side.
- Ask for the minimum effective edit when revising human copy.
- Remove the final paragraph if it contains no new action, fact, or consequence.
- Verify every quotation and link. Fluent phrasing is not evidence.

## Prompt addition

```text
Lead with the answer. Preserve the writer's vocabulary and rough edges.
Do not add an acknowledgment, balanced preamble, fake contrast, neat three-part list, or recap.
Use direct verbs and concrete nouns. Do not use em dashes.
```

Sources: [Anthropic prompt engineering overview](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview), [No AI Slop](https://github.com/petergyang/no-ai-slop), [Wikipedia's maintained field guide](https://en.wikipedia.org/wiki/Wikipedia:Signs_of_AI_writing), and [Pew Research Center's corpus study](https://www.pewresearch.org/data-labs/2026/08/20/how-much-of-the-internet-is-written-with-ai/).
