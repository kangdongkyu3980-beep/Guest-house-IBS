# Active Execution Plan: SaaS Foundation

## Objective

Turn the current IBS operations dashboard from a valuable internal MVP into a system that can realistically progress toward commercial SaaS without breaking current operations.

## Current Starting Point

- The product already solves real workflows.
- The product is browser-based and mobile-usable.
- The architecture is still MVP-shaped.
- The next phase is not "build more screens first".
- The next phase is "make the system trustworthy, legible, and separable".

## Success Definition

This plan is successful when:

1. Daily operators can continue using the product without regression.
2. The codebase becomes easier to reason about.
3. The data model becomes explicit enough for backend migration.
4. The system is no longer dependent on implicit single-tenant assumptions.
5. A future SaaS backend can be introduced without rewriting product knowledge from scratch.

## Strategic Workstreams

### Workstream 1: Domain Clarification

Goal:
- Convert hidden business rules into explicit product concepts.

Deliverables:
- canonical entity glossary
- booking lifecycle definition
- room occupancy rules
- meal and reporting rules
- property/building hierarchy definition

Status:
- Not started formally

### Workstream 2: Frontend Boundary Extraction

Goal:
- Reduce risk inside `index.html` by separating concerns.

Deliverables:
- identified module boundaries
- extracted config/constants layer
- extracted sync layer
- extracted domain utility layer
- extracted view renderer groups

Status:
- Partially implied, not yet formalized

### Workstream 3: Data Integrity And Sync Trust

Goal:
- Make operators trust that what they see is what is saved.

Deliverables:
- explicit sync health UX
- verified save/readback behavior
- conflict policy definition
- better last-modified and revision discipline
- documented offline queue behavior

Status:
- In progress

Notes:
- A sync verification flow and test entrypoint now exist in the frontend, but the overall persistence model is still not SaaS-grade.

### Workstream 4: Backend Migration Design

Goal:
- Design the replacement path for Apps Script + Sheets.

Deliverables:
- target API surface
- auth strategy
- tenancy model
- audit log model
- migration sequencing plan

Status:
- Not started

### Workstream 5: Commercial SaaS Readiness

Goal:
- Define what must exist before external customers can use the product.

Deliverables:
- role model
- tenant provisioning model
- subscription and billing assumptions
- onboarding flow
- support and observability checklist

Status:
- Not started

## Recommended Execution Order

### Step 1

Create a domain glossary and normalized entity map from the current app.

Why first:
- Every later backend, UX, and SaaS decision depends on this.

### Step 2

Extract architecture notes and code boundaries from `index.html`.

Why second:
- The code is currently too dense for safe acceleration.

### Step 3

Refactor sync into a clearly isolated layer.

Why third:
- Sync trust is the operational heart of this product today.

### Step 4

Design the target backend model and migration contract.

Why fourth:
- This prevents accidental lock-in to spreadsheet-era assumptions.

### Step 5

Build SaaS primitives only after the product data model is explicit.

Why fifth:
- Otherwise auth, billing, and tenancy get bolted onto unstable foundations.

## Near-Term Milestones

### Milestone A: Operational Stability Baseline

Target:
- Documented current system
- continuity docs in place
- sync checks visible
- no blind-save workflow for key operations

### Milestone B: Architecture Legibility

Target:
- file/module split strategy defined
- top-level domains identified
- current business rules written down

### Milestone C: Backend Readiness

Target:
- target entities and API contract drafted
- migration path from Sheets agreed

### Milestone D: Internal Platform

Target:
- auth
- user identity
- audit logs
- role permissions
- deployable backend

### Milestone E: SaaS Beta

Target:
- multi-tenant property model
- onboarding
- subscription controls
- customer-safe operations

## Risks To Manage

- Feature pressure may tempt more additions to `index.html` without boundary cleanup.
- Spreadsheet comfort may delay necessary backend investment.
- Hidden workflow rules may be lost if refactoring happens before documentation.
- Commercialization too early will expose trust, security, and audit gaps.

## Explicit Recommendation

Do not jump straight from the current MVP into customer-facing SaaS sales.

First make the product:

- structurally legible,
- operationally trustworthy,
- and backend-migration ready.

That sequence is faster in the medium term than accumulating more MVP coupling.

## Next Best Tasks

1. Create `docs/code-map/domain-model.md` with explicit entities and relationships.
2. Create `docs/code-map/index-html-boundaries.md` mapping the giant file into logical modules.
3. Define a target backend contract for bookings, rooms, guests, meals, and snapshots.
4. Move the Apps Script URL out of hardcoded frontend code.
5. Decide the intended long-term stack for auth, tenancy, and billing.

## Status Log

- 2026-04-09: continuity and execution documentation introduced.
- 2026-04-09: sync verification UX added to the frontend.
