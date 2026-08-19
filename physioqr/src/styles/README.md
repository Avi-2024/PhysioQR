# Frontend styling ownership

Keep global styling intentionally small and predictable.

- `globals.css` owns Tailwind directives, base document styles, focus behavior, and app-wide primitives.
- `App.css` currently owns the legacy RehabCare/landing design-system classes and responsive landing rules. New portal-specific styles should not be added here.
- Feature-specific styling belongs next to the feature when Tailwind utilities are not sufficient.

## Rules

1. Prefer Tailwind utilities for component-level styling.
2. Add a global class only when it is reused across unrelated features.
3. Do not create new root-level CSS files under `src/`.
4. Avoid duplicating reset/body/font declarations across stylesheets.
5. Migrate `App.css` incrementally instead of doing a risky visual rewrite.
