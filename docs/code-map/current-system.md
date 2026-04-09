# Current System Code Map

## Why This File Exists

This file is the fastest possible map for understanding what the current system is, how the major files interact, and what must change before the product can become SaaS.

## Repo Inventory

### `index.html`

Role:
- Main application shell and almost all frontend logic.

What lives inside:
- UI layout
- CSS
- booking domain logic
- room map rendering
- meal management
- guest list and filters
- calendar and stats views
- localStorage persistence
- Google Apps Script sync
- live sync polling
- PWA install helpers
- mobile UX behavior
- backup/import/export utilities
- trash/restore behavior

Assessment:
- Valuable because it contains real business workflow.
- Risky because rendering, state, persistence, sync, and product rules are tightly coupled in one file.

### `integrations/google-apps-script/IBS_AppScript.gs`

Role:
- Lightweight backend integration layer between the dashboard and Google Sheets.

Observed responsibilities:
- `doGet` and `doPost` entry points
- booking load
- bulk booking save
- KPI snapshot write
- archive booking write
- dashboard sheet update

Important limitation:
- `saveOne`, `updateOne`, and `deleteOne` are effectively stubs returning success.
- In practice, reliable persistence depends on `bulkSave`.

### `sw.js`

Role:
- Service worker for PWA caching.

Current behavior:
- Network-first for Apps Script traffic
- Cache-first for static assets

Risk:
- Versioned cache can cause stale frontend behavior if not consciously bumped and cleared during important releases.

### `manifest.json`

Role:
- PWA metadata for installability and standalone launch.

### `legacy/excel/Room Map.xlsx`

Role:
- Legacy spreadsheet artifact and context source from the pre-HTML operating model.

Strategic meaning:
- This is legacy input/reference, not the desired long-term product core.

## Frontend Runtime Model

### Data sources

Current effective data sources:

1. localStorage
2. Google Sheets via Apps Script
3. built-in default sample data fallback

This means the app is currently local-first with spreadsheet synchronization.

### Core frontend state areas

Main operational data:
- `DATA` for bookings
- `MEAL_DATA` for meal operations
- room status state
- guest memos
- daily memos
- trash state
- offline queue

Session/UI state:
- active property
- active tab
- active building
- filters and sort options
- dark mode
- installation guides and dismissals

### Important architectural truth

The app currently mixes:

- domain state
- UI state
- persistence state
- integration state

inside one browser runtime.

That is acceptable for MVP speed, but it is the main obstacle to SaaS-grade scalability.

## Domain Model Inferred From The Current Product

### Current implicit entities

- Property group
- Building
- Room
- Booking
- Guest
- Company
- Meal entry
- Daily memo
- Guest memo
- Snapshot KPI
- Archived booking

### Missing explicit SaaS entities

- Tenant
- User
- Role
- Permission
- Audit event
- Organization
- Property
- Rate plan
- Invoice / billing record
- Notification event
- Integration credential

## Sync Model

### Current sync pattern

- Client saves local state frequently.
- Client uploads booking data to Apps Script.
- Apps Script overwrites the booking sheet with full dataset on bulk save.
- Client polls sheet updates using `loadAll`.
- Conflict resolution is lightweight and timestamp/hash based.

### Risks

- Full overwrite writes are simple but fragile at scale.
- Conflict semantics are not strong enough for multi-user commercial usage.
- There is no authoritative audit log.
- Partial write APIs are not truly implemented.

## Mobile / PWA Model

The app is already meaningfully optimized for mobile operations:

- viewport set
- install prompt handling
- service worker registration
- touch interactions
- mobile-specific UX adjustments

This is a strong reason to keep the product web-first during the next phase rather than diverting into native app development.

## SaaS Readiness Assessment

### Strong assets worth preserving

- Real workflow depth
- Real room inventory structure
- Real operational reporting logic
- Mobile-first practical UX
- Offline-aware mindset
- Existing sync concept

### Structural debt that must be addressed

- single-file application architecture
- weak backend contract
- no auth
- no tenancy
- no billing model
- no proper audit/event model
- secrets/config handled in frontend

## Recommended Codebase Evolution

### Phase 1: Stabilize the MVP foundation

- Extract domain modules conceptually, even if still delivered to one page initially.
- Move config and secrets out of hardcoded frontend state.
- Make sync observability explicit.
- Document entity model and workflow rules.

### Phase 2: Prepare for real backend migration

- Define API contract for bookings, rooms, guests, meals, and snapshots.
- Replace bulk-overwrite assumptions with entity-level writes and revision tracking.
- Introduce authentication and operator identity.

### Phase 3: SaaS conversion

- Add tenant and property hierarchy.
- Add user roles and permissions.
- Add billing and subscription primitives.
- Add customer onboarding and admin console.

## Practical Reading Order For New Sessions

1. Read `AGENTS.md`
2. Read `docs/continuity/current.md`
3. Read `docs/ARCHITECTURE.md`
4. Read `docs/FRONTEND.md`
5. Read `docs/exec-plans/active/saas-foundation-plan.md`
6. Open `index.html`
7. Open `integrations/google-apps-script/IBS_AppScript.gs`

## What Not To Do

- Do not assume this is a throwaway prototype.
- Do not jump straight to a full rewrite without preserving workflow parity.
- Do not commercialize directly on top of the current hidden coupling.
- Do not add many more features into `index.html` without documenting the boundaries first.
