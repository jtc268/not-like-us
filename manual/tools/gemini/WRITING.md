# Gemini writing guide

Gemini can blend search, source material, and generation. Keep synthesis traceable and prevent a neutral summary voice from replacing the speaker.

## Common defaults to reject

- A broad contextual introduction before the requested answer.
- Smooth summaries that erase disagreement between sources.
- Vague phrases such as “research suggests” without a named source.
- Identical bullet structure for claims with different certainty.
- Inflated transition words and recap conclusions.
- Citations that do not support the nearby clause.

## Better moves

- Put citations beside the exact claim they support.
- Preserve disagreement and evidence quality.
- Separate source fact, inference, and recommendation.
- Supply a voice sample when writing as a person or brand.
- Remove setup and recap that do not change the decision.

## Prompt addition

```text
Lead with the answer. Preserve conflicts and uncertainty in the sources.
Cite each unstable claim beside the sentence it supports.
Do not add generic context, vague consensus, forced symmetry, or a recap. Do not use em dashes.
```

Sources: [Google Gemini prompting strategies](https://ai.google.dev/gemini-api/docs/prompting-strategies), [No AI Slop](https://github.com/petergyang/no-ai-slop), and [Pew Research Center's corpus study](https://www.pewresearch.org/data-labs/2026/08/20/how-much-of-the-internet-is-written-with-ai/).
