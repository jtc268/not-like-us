# Cursor design guide

Cursor edits an existing codebase well when the design system is legible. Without local constraints, it can assemble familiar library components into a plausible but interchangeable surface.

## Common defaults to reject

- Introducing a second component or styling system for one feature.
- Copying the latest screen's structure instead of the product's established patterns.
- Reaching for dashboard cards, badges, and Lucide icons to make unfinished work look complete.
- Broad “make it premium” changes that alter type, color, spacing, and behavior at once.
- Creating a new palette because tokens were hard to find.
- Skipping visual verification after a refactor.

## Better moves

- Point Cursor to the exact tokens, primitives, representative screens, and accessibility rules.
- Request small visual changes with explicit invariants.
- Search the repository for an existing component before adding one.
- Provide screenshots and acceptance criteria at the target viewport.
- Review the diff for duplicated CSS, hard-coded values, and accidental system drift.
- Test in the real browser with real content.

## Prompt addition

```text
Preserve the repository's existing design system. Before adding a component, search for its local equivalent.
Do not introduce a new palette, generic cards, badges, or icon tiles to signal polish.
Keep behavior unchanged unless the acceptance criteria require it, then verify visually.
```

Sources: [Cursor documentation](https://docs.cursor.com/), [Cursor practitioner discussion](https://www.reddit.com/r/cursor/comments/1uc5ani/how_do_you_get_cursor_to_build_premium_saas_ui/), and [Unslop UI](https://github.com/claudiusararu/unslop-ui-skill). Community discussion is anecdotal.
