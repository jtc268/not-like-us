# Gemini design guide

Gemini appears in several product surfaces and coding environments. The output depends heavily on the host tool, so inspect both the model's choices and the surrounding template.

## Common defaults to reject

- A generic Material-like surface applied where no Material system exists.
- Blue-purple AI color cues, sparkle icons, and glow effects used as product identity.
- Broad visual changes prompted by “clean up” or “modernize.”
- Equal cards for content with unequal importance.
- Generated images with decorative text, illegible interface details, or no content role.
- Treating a screenshot as proof of responsive and accessible behavior.

## Better moves

- Name the host environment, design-system version, and components Gemini may use.
- Give references and anti-references with reasons.
- Ask for a hierarchy and state inventory before component code.
- Keep generated images out unless they communicate specific information or brand value.
- Verify output in the target browser and assistive modes.

## Prompt addition

```text
Follow the named local design system, not a generic Material or AI visual language.
Do not use blue-purple glow, sparkle icons, equal card grids, or decorative generated imagery.
Base structure on task priority and verify states in the target environment.
```

Sources: [Google AI Studio prompting guidance](https://ai.google.dev/gemini-api/docs/prompting-strategies), [Google Material Design](https://m3.material.io/), and [AHD](https://github.com/Ad-Astra-Computing/ahd/blob/main/docs/SLOP_TAXONOMY.md). Material resemblance is an observed tendency, not a provider-declared Gemini default.
