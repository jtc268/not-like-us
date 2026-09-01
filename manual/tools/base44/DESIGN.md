# Base44 design guide

Base44 exposes themes, global visual settings, and AI-assisted design changes. A global theme is useful only after the product's content and task structure are clear.

## Common defaults to reject

- Selecting a theme as a substitute for a product-specific design system.
- Applying the same card, radius, shadow, and button treatment to every surface.
- Making a dashboard from equal panels before establishing decision priority.
- Asking the AI to “make it modern” without references or constraints.
- Fixing a local problem with a global style change.
- Ignoring loading, empty, error, disabled, and destructive states.

## Better moves

- Define global tokens from a brand source, not the theme gallery alone.
- Separate structural prompts from visual prompts.
- Name the affected component and scope of each design change.
- Use hierarchy, whitespace, and rules before adding containers.
- Verify states and responsive behavior after global changes.
- Keep a representative page for regression checks.

## Prompt addition

```text
Use the supplied brand tokens and change only the named scope.
Do not make every section a rounded card or apply one surface treatment globally.
Preserve task hierarchy and show non-ideal states before calling the design complete.
```

Primary source: [Base44 design documentation](https://docs.base44.com/Building-your-app/Design). Supporting source: [Anti AI Slop](https://github.com/Vinayak-Shukla-03/anti-ai-slop).
