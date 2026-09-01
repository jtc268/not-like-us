# Claude design guide

Anthropic documents a recognizable house style for Claude's generated frontends and slides. That makes this the strongest tool-specific case in the catalog.

## Documented house style

Anthropic says Claude tends to use:

- a warm cream or off-white background near `#F4F1EA`
- a serif display face such as Georgia, Fraunces, or Playfair Display
- italic words for visual emphasis
- terracotta or amber accents
- this combination across both web interfaces and slides

Anthropic also tells users to ask for a different aesthetic and warns against Inter, Roboto, system fonts, purple gradients, and predictable layouts. Treat that advice as a minimum, not a substitute for design direction.

## Common defaults to reject

- The cream, editorial serif, italic accent, and terracotta combination when the brand did not ask for it.
- A single italic word in a large headline as the main piece of art direction.
- Warm “tasteful” minimalism applied to operational or high-density products.
- Spacious landing-page sections when the brief calls for a tool.
- Switching from Claude's house style into the equally generic dark-zinc or purple-glow style.

## Better moves

- State the visual premise in terms of audience, task, references, density, and brand history.
- Specify type roles and why they fit. Do not merely ban three common fonts.
- Ask for structural variation before surface styling.
- Check every italic treatment, warm neutral, and amber accent. Keep only choices supported by the product.
- Give Claude actual screenshots or tokens when an existing system must survive.

## Prompt addition

```text
Do not use Claude's cream, display-serif, italic-accent, and terracotta house style.
Do not replace it with purple gradients or dark-zinc SaaS styling.
Derive type, color, spacing, and page structure from the supplied product and audience.
```

Primary source: [Anthropic's Claude Opus 4.8 prompting guide](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/prompting-claude-opus-4-8). Corroborating community discussion: [Claude font defaults](https://www.reddit.com/r/ClaudeAI/comments/1u95x9l/you_can_spot_a_claudebuilt_app_instantly_its_the/) and [italic headline criticism](https://www.reddit.com/r/webdesign/comments/1te1sui/whatever_this_is_called_i_hate_it/). Community reports are anecdotal.
