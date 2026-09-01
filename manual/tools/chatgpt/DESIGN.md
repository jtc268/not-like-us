# ChatGPT design guide

ChatGPT can generate visual directions, code, images, and copy in one conversation. That convenience can make a loosely described mood harden into a complete but generic identity.

## Common defaults to reject

- Describing the desired result only as “clean,” “premium,” “modern,” or “futuristic.”
- Purple-blue gradients, soft glows, rounded panels, and an AI sparkle icon as a visual shorthand.
- A one-page SaaS narrative when the user needs an interface or a content system.
- Generic generated people, fake dashboards, or abstract 3D forms used to occupy space.
- Switching typefaces without checking licenses, language coverage, weights, and loading.
- Confusing a polished mockup with a tested responsive product.

## Better moves

- Give a visual brief with references, anti-references, audience, task, content density, and existing constraints.
- Request an information architecture and content inventory before visual styling.
- Ask for alternatives that differ in structure, not just mood.
- Replace generated imagery with product evidence, commissioned art, diagrams, or no image.
- Review contrast, focus, keyboard order, text scaling, and reduced-motion behavior.
- Keep an explicit list of fabricated content.

## Prompt addition

```text
Translate the brief into a specific information architecture before choosing a visual style.
Do not infer a generic AI brand. Do not use purple glow, glass cards, sparkle icons, or fake dashboards.
Show how the design handles real content and non-ideal states.
```

Sources: [OpenAI frontend prompt guidance](https://developers.openai.com/api/docs/guides/frontend-prompt), [OpenAI image-generation guidance](https://platform.openai.com/docs/guides/image-generation), and [Anti AI Slop](https://github.com/Vinayak-Shukla-03/anti-ai-slop).
