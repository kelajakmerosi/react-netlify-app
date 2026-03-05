# Engineering Standards

## Purpose
This document defines the minimum quality bar for changes in Kelajak Merosi.

## Definition Of Done
A task is done only when all are true:
- Navigation/state behavior is deterministic and deep-linkable.
- Naming and file placement follow the conventions below.
- Accessibility checks pass for keyboard and focus behavior.
- Error handling is explicit and observable; no silent fallbacks for critical paths.
- API contracts are validated at boundaries.
- Relevant tests are updated or added.
- Docs that describe changed behavior are updated.

## Naming Conventions
- Route screens: `*Page.tsx`
- Reusable view units: `*Card`, `*Panel`, `*Item`, `*Row`
- Providers: `*Provider.tsx`
- Service clients: `<domain>.service.ts`
- Server controllers: `<domain>.controller.js`
- Server models/data modules: `<domain>.model.js`

## Foldering Rules
- `client/src/pages`: route-level pages only.
- `client/src/components/ui`: reusable primitives only.
- `client/src/components/features`: domain-specific composed components.
- `client/src/components/layout`: shell/navigation/top-level layout components.
- `client/src/services`: API and persistence adapters only.
- `shared/contracts`: runtime request/response schemas used by client and server.
- `server/src/controllers`: HTTP adapters only; avoid data access logic in controllers.
- `server/src/models`: data access and data mapping logic.

## UI Ownership
- Every reusable UI component owns its local CSS module.
- Global CSS is limited to reset, tokens, layout primitives, and utility classes.
- Do not add new reusable component styles to a shared global module.

## API Contract Standards
- Success envelope: `{ data, meta? }`
- Error envelope: `{ error: { code, message, requestId, details? } }`
- Validate inbound request payloads at server route/controller boundaries.
- Validate critical client responses before using payloads.

## Error Handling Standards
- Do not swallow backend errors in user-critical pages.
- Include `requestId` in server error responses and logs.
- Distinguish network errors from validation/auth errors in UI messaging.

## Observability Standards
- Structured logs must include request id and route.
- Authenticated requests should include user id when available.
- Security-relevant events (auth failures, forbidden access) should be warn-level or above.

## Testing Baseline
- Route-level flow tests for dashboard, subjects, topic, profile, and admin paths.
- Contract tests for success/error envelope parsing.
- Regression checks for auth expiry handling.

## UI Consistency Baseline (Frozen)

### Canonical Token Matrix
- Source of truth: [client/src/styles/tokens.css](client/src/styles/tokens.css)
- Spacing scale (canonical): 4 / 8 / 12 / 16 / 20 / 24 / 32
- Radius scale (canonical): 8 / 12 / 16 / 22 / 28 / full
- Typography scale (canonical):
	- Label: 12px, weight 700, uppercase + tracking
	- Body: 13–14px, weight 400–600
	- Button: 13–16px, weight 700
	- Section title: 20–23px
	- Page title: clamp(28px, 3vw, 40px)
- Interaction tokens (canonical): `--transition`, `--accent`, `--accent-light`, `--surface-border`

### Canonical Primitive Ownership
- `Button`: [client/src/components/ui/Button.tsx](client/src/components/ui/Button.tsx)
- `Input`: [client/src/components/ui/Input.tsx](client/src/components/ui/Input.tsx)
- `GlassCard`: [client/src/components/ui/GlassCard.tsx](client/src/components/ui/GlassCard.tsx)
- `Alert/Divider/Tabs/ProgressBar/Avatar`: [client/src/components/ui/index.tsx](client/src/components/ui/index.tsx)

### Enforcement Rules
- Do not add new raw `<button>` or `<input>` in `src/components` and `src/pages` unless explicitly migration-exempted.
- Prefer variant props on shared primitives instead of introducing sibling duplicates.
- Modal, segmented tab/step controls, and icon-only controls must use shared primitives.

### Migration + Rollback Policy
- Each migration PR must preserve old implementation behind a module-level feature flag for one release cycle.
- Rollback path must be import-alias or wrapper-toggle based (no destructive rewrites).
- Remove dead selectors and duplicate styles only after migration tests pass.

### Regression Protection Requirements
- Add/maintain UI interaction tests for:
	- Button states (hover/focus/disabled semantics)
	- Modal keyboard + dismiss behavior
	- Tabs/stepper selection and keyboard navigation
	- Admin route baseline rendering
- Add a11y checks (`axe`) for modal and tab flows.

## Localization Baseline
- Supported app languages are fixed: `uz`, `ru`, `en`.
- Default and fallback language must be `uz`.
- Runtime localization must use `i18next` + `react-i18next`.
- Language resolution order: URL `?lang=` -> persisted preference -> browser locale -> `uz`.
- New user-facing strings must be added to locale resources before UI usage.
