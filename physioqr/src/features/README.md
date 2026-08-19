# Feature architecture

PhysioQR uses feature-first frontend organization.

## Ownership

Each business capability belongs under `features/<feature>` or a role-specific domain folder. A feature may contain:

- `pages/` — route-level components only
- `components/` — UI used only by that feature/domain
- `api/` — endpoint functions and request/response mapping
- `hooks/` — feature-specific React hooks and query orchestration
- `types/` — feature-owned types when they are not shared app contracts
- `utils/` — pure helpers that are truly feature-specific

Do not create these folders until the feature actually needs them.

## Shared-code rule

Move code to top-level `components`, `lib`, or `types` only after it is reused across multiple unrelated features. Shared folders are infrastructure, not a dumping ground for business logic.

## Role areas

- `admin` owns admin operations and domain management screens.
- `agents` owns agent portal workflows.
- `doctors` owns doctor portal workflows.
- `patients` owns patient portal workflows.
- `auth` owns authentication screens/workflows.
- `landing` owns the public marketing experience.
- `payments` owns public payment-result flows.
- `common` is reserved for genuinely cross-feature route pages such as 404; avoid putting domain logic here.

## Naming

Use descriptive route component names ending in `Page`. Avoid aggregate files that implement many unrelated screens. Prefer one domain folder over giant `*Pages.tsx` or `*Operations.tsx` modules.
