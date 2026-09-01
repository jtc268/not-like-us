# Replit design guide

Replit Design Mode generates frontend designs before conversion into an application. Treat the design-stage output as a prototype and recheck it after real data and behavior arrive.

## Common defaults to reject

- A polished static shell whose layout cannot survive application state.
- Generic navigation, hero, and card patterns selected from a broad prompt.
- Visual richness created with gradients, glows, large radii, and floating mockups.
- Placeholders that conceal missing data models and interactions.
- A front-end-only demo described as a finished app.
- Style drift when the design is converted and extended.

## Better moves

- Put real content, states, and data constraints into Design Mode.
- Compare the design before and after conversion.
- Define tokens and reusable components before adding routes.
- Test authentication, permissions, slow data, empty results, errors, and destructive actions.
- Cut any section or effect that stops helping once real behavior exists.

## Prompt addition

```text
Design around the real application states and data shapes, not a static showcase.
Avoid generic gradients, floating mockups, rounded card grids, and placeholder metrics.
After conversion, verify that the visual hierarchy survives real behavior and narrow screens.
```

Primary source: [Replit Design Mode](https://replit.com/blog/design-mode). Supporting source: [AHD](https://github.com/Ad-Astra-Computing/ahd/blob/main/docs/SLOP_TAXONOMY.md).
