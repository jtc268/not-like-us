# Codex design guide

Codex follows explicit product and frontend instructions well. The risk is an underspecified request that becomes a generic React marketing page or an untouched component-library demo.

## Common defaults to reject

- Building a landing page when the request is an app, admin surface, or operational workflow.
- A decorative hero with gradients or generated SVG art before the primary task.
- Cards inside cards, floating section wrappers, and a separate rounded container for every concept.
- Dominant purple, beige, dark-blue, or brown-orange palettes selected without brand input.
- Large corner radii, pills, soft shadows, and default component-library spacing everywhere.
- Desktop-first pages that merely stack on mobile.
- “Polish” passes that add hover lift, fade-up motion, and icons without improving comprehension.

These points closely follow OpenAI's current frontend guidance, which explicitly warns against many of them.

## Better moves

- Tell Codex whether the output is an app, document, storefront, tool, or campaign page.
- Put the main workflow on the first meaningful screen.
- Inspect the repository's existing tokens, components, and content before adding a new system.
- Use stable dimensions, common control placement, and realistic data.
- Test breakpoints and interaction states in the browser, not only in code.
- Ask which existing rule each new visual choice serves.

## Prompt addition

```text
Build the actual product surface, not a marketing page for it.
Use the repository's existing design system. Avoid floating cards, nested cards, generic heroes,
purple gradients, decorative blobs, and large radii unless the brand requires them.
Verify the primary workflow and responsive states in the browser.
```

Primary source: [OpenAI frontend prompt guidance](https://developers.openai.com/api/docs/guides/frontend-prompt). Supporting catalogs: [Unslop UI](https://github.com/claudiusararu/unslop-ui-skill) and [AHD](https://github.com/Ad-Astra-Computing/ahd/blob/main/docs/SLOP_TAXONOMY.md).
