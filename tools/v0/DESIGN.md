# v0 design guide

v0 documents shadcn/ui, Next.js, and Tailwind as its default stack for new chats. That makes component quality high, but untouched defaults can make unrelated products share the same silhouette.

## Common defaults to reject

- Stock shadcn card, button, badge, tabs, dialog, and command-menu styling with no local system.
- A zinc or neutral palette with one purple or blue accent selected by omission.
- Large rounded panels, muted borders, icon tiles, and generous dashboard spacing everywhere.
- Building from components before mapping the workflow and content hierarchy.
- Treating a generated design-system sample as a brand.
- Repeating the same sidebar, header, KPI row, chart, and table dashboard composition.

## Better moves

- Connect or define a design system before generating screens.
- Change tokens and component behavior, not only colors.
- Give v0 real data shapes, permissions, failure cases, and density targets.
- Ask for a DOM and component audit that removes unnecessary wrappers.
- Compare the output against shadcn defaults and justify every surviving default.
- Test long labels, localization, keyboard navigation, and narrow widths.

## Prompt addition

```text
Use the attached design system instead of stock shadcn presentation.
Map the workflow before selecting components. Avoid generic KPI cards, icon tiles, badges, and rounded wrappers.
Use real data shapes and show empty, error, loading, and permission states.
```

Primary sources: [v0 design systems](https://v0.dev/docs/design-systems) and [v0 design systems guide](https://v0.app/docs/design-systems-2). Supporting catalog: [Unslop UI](https://github.com/claudiusararu/unslop-ui-skill).
