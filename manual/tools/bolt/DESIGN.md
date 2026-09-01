# Bolt design guide

Bolt can move from prompt to working full-stack app quickly. Speed makes early structural defaults expensive if they spread through the generated code.

## Common defaults to reject

- A generic hero or dashboard shell created before the data model and task flow.
- Vite or React starter structure left visible in the product.
- Purple-blue accent gradients, soft shadows, rounded cards, and icon-led feature grids.
- A single happy-path page presented as a product.
- Styling copied into components instead of forming a coherent token and layout system.
- Broad visual rewrites that damage working behavior.

## Better moves

- Start with the smallest complete workflow, including failure and recovery.
- Define tokens, typography, and layout primitives before multiplying pages.
- Preserve functioning code during visual revisions and test after each bounded change.
- Use real product nouns and real data constraints in the first prompt.
- Ask for mobile task priority, not a generic stacked layout.

## Prompt addition

```text
Build one complete user workflow before adding marketing sections or decorative polish.
Do not infer purple gradients, rounded card grids, icon tiles, or a generic dashboard shell.
Create reusable tokens and verify behavior after each visual change.
```

Sources: [Bolt documentation](https://support.bolt.new/), [AHD's slop taxonomy](https://github.com/Ad-Astra-Computing/ahd/blob/main/docs/SLOP_TAXONOMY.md), and [Anti AI Slop](https://github.com/Vinayak-Shukla-03/anti-ai-slop). Bolt does not document these visual tendencies. They come from the cited catalogs and community reports, so they carry the corroborated label rather than documented.
