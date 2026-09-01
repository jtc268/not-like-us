# Base44 writing guide

Base44 can generate screens, entities, and workflows together. Keep generated labels aligned with the underlying data and permissions.

## Common defaults to reject

- Different names for the same entity across navigation, forms, and tables.
- Status labels that do not map to real state transitions.
- Generic field help that repeats the label.
- Friendly error messages that omit the failed action and data state.
- Invented sample records that resemble customer data.
- Promotional language inside high-frequency workflows.

## Better moves

- Maintain one glossary for entities, actions, roles, and states.
- Write field help for format, consequence, or privacy, not repetition.
- Tie copy review to the data model and state machine.
- Label sample records and generated examples.
- Use plain operational language inside the app.

Sources: [Base44 design documentation](https://docs.base44.com/Building-your-app/Design) and [No AI Slop](https://github.com/petergyang/no-ai-slop).
