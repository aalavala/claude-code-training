# SPEC · NWP-101 — Payments export: let ops choose columns and scope

> Written before any code. Generated with `/spec`, then edited by a human.
> Load it as context when you build: `@docs/specs/NWP-101-export-options.md`

**Ticket:** [NWP-101](../tickets/NWP-101.md)
**Author:** Claude (`/spec`)
**Status:** draft

## Problem

Ops exports the payments table several times a day, and today it ships every column, unfiltered scope aside, with no choice. Card last-four is in every file, so anything going to a merchant needs manual spreadsheet cleanup first — Dana's team spends 3–4 hours a month on this, and had a near-miss last quarter where an uncleaned file nearly reached the wrong merchant. They need to pick columns (last-four off by default) and scope before downloading.

## Current state

- `src/app/payments/page.tsx:68-76` — the Export "button" is a plain `<Button asChild><a href="/api/payments/export?<query>">`. No JS, no dialog — clicking it is a normal browser navigation/download. `query` (line 46-48) is rebuilt from the current `searchParams` on every render, so it always reflects the active filters.
- `src/app/api/payments/export/route.ts:11-25` — the export `GET` handler: `parseFilters()` → `filterPayments()` + `sortPayments()` → `toCsv(rows)` with the default column set → `Response` with a fixed `exportFilename()`. Its own doc comment (lines 5-9) already names this ticket: "the column set and the scope are fixed. Giving ops control over both is NWP-101."
- `src/data/queries.ts` — "the one query builder" (per its own comment, lines 38-41): `parseFilters()` (18-36, the allowlist boundary — whitelists `status`/`sort`/`direction`, coerces `page`), `filterPayments()` (45-70), `sortPayments()` (72-85), `paginate()` (87-99), `queryPayments()` (102-106, filter+sort+paginate combined). The export route deliberately calls `filterPayments`+`sortPayments` directly, skipping `paginate` — so "scope" today already means *all* filtered rows, not one page. The "browser exports the current page only" failure mode the ticket warns about isn't present in the current route; it's a risk only if this gets rebuilt client-side.
- `src/lib/csv.ts:13-24` — `EXPORT_COLUMNS`, a fixed 10-column tuple including `last4`. `toCsv(payments, columns = EXPORT_COLUMNS)` (58-67) **already accepts an optional column list** — only the route (line 19 of `export/route.ts`) hard-codes the default by calling `toCsv(rows)` with no second argument. `exportFilename(date)` (69-71) only stamps a UTC date, no scope segment.
- `src/lib/csv.ts` `cell()` (33-56) already formats `amount` via `formatMoney()` and keeps `currency` in its own column — AC4 is already satisfied by the existing serializer and just needs to keep passing once columns become selectable.
- `src/lib/csv.test.ts` — existing tests pin escaping and the column-subset contract (`toCsv(payments, columns)` already has a dedicated test at lines 32-36). Ticket's DoD says extend this file, not add a new one.
- `src/lib/money.ts:14-23` — `formatMoney(minorUnits, currency)`, the only formatter; nothing new needed here.
- **Contradicts `.claude/rules/components.md`:** that rule states `src/components/` "already has Button, Input, Select, Dialog, Badge, and the rest." There is no `Dialog.tsx`. The closest thing is `src/components/Drawer.tsx`, which wraps `@radix-ui/react-dialog` directly (same primitive a `Dialog` would use) but is styled as a slide-over panel, not a centered modal. There's also no `Checkbox`/`Radio` primitive for a column picker. This changes what "reuse what's here" means for this ticket — see Approach.

## Domain rules

| Rule | Source | What breaks if ignored |
| --- | --- | --- |
| Money is integer minor units, formatted once at the edge | `CLAUDE.md` convention 1; `money.md` | AC4 requires exactly this; already true in `csv.ts`'s `cell()` — a regression here would drift totals |
| Validate anything from the client against an allowlist before it reaches a query, a filename, or the store | `CLAUDE.md` convention 4; `api-routes.md`; ticket note "validate them server-side... do not interpolate them into SQL" | Client-supplied `columns`/`scope` reaching `toCsv`/the filename unchecked is the exact injection risk the ticket calls out |
| One query builder — payment filtering goes through the builder behind `GET /api/payments` | `CLAUDE.md` convention 3; ticket note | A second filter path for "all payments" scope would be "a defect, not a shortcut" |
| Reuse existing UI primitives before hand-rolling a control; dialogs must be fully accessible | `components.md` | Justifies building on `Drawer` (Radix dialog) rather than a second modal implementation |

## Approach

Add a client component (`ExportDialog`) built on the existing `Drawer` primitives (`src/components/Drawer.tsx`) and open it from the current Export button in `src/app/payments/page.tsx`, instead of the button linking straight to the export URL. The dialog offers column checkboxes (`last4` unchecked by default) and a scope choice (current filter / all payments, current filter default), fetches a row count from the existing `GET /api/payments` route (reading `.total` off its existing response shape, requesting a small `pageSize` to keep the payload light — no new endpoint) so the count is visible before download, and disables Download when zero columns are selected. Download stays a real navigation (`<a href>`/`window.location`) to `/api/payments/export?<filters>&columns=...&scope=...`, not a `fetch`+blob, so the browser's native download handling is unchanged. The export route validates `columns` (against `EXPORT_COLUMNS`) and `scope` (`"filtered" | "all"`) server-side, then either keeps calling `filterPayments`/`sortPayments` with the active filters (current behavior, "filtered" scope) or calls `filterPayments` with an empty filter set for "all payments" — same builder either way, no second implementation. `toCsv` receives the validated column subset. `exportFilename` gains a scope segment: the active status filter value when one is set (e.g. `disputed`), else `filtered` for current-filter scope with no status set, else `all` for all-payments scope — this is what reproduces the ticket's own example, `payments-disputed-2026-08-13.csv`.

**Considered and rejected:** an inline expanding panel on the payments page instead of a dialog. Rejected because the ticket asks for "an options dialog" specifically, and `Drawer` already gives correct focus-trap/Escape/accessible-name behavior via Radix for free — an inline panel would have to reimplement that to satisfy `components.md`'s accessibility rule. Also considered a dedicated `/api/payments/count` endpoint for the live row count; rejected as a second read path when `GET /api/payments`'s existing `{ total, ... }` response already covers it.

## File map

| File | Add or change | Why |
| --- | --- | --- |
| `src/app/payments/page.tsx` | change | Replace the plain `<a href>` Export link with a trigger that opens `ExportDialog`, passing the current filter query string |
| `src/app/payments/export-dialog.tsx` | add | Client component: column checkboxes (`last4` off by default), scope choice, live row count via `GET /api/payments`, Download disabled at zero columns |
| `src/app/api/payments/export/route.ts` | change | Parse and allowlist `columns` and `scope` params; branch scope through `filterPayments`/`sortPayments`; pass validated columns to `toCsv`; pass scope to the filename helper |
| `src/lib/csv.ts` | change | `exportFilename(date, scope?)` gains the scope segment described in Approach; `EXPORT_COLUMNS`/`toCsv` are unchanged, they already support a column subset |
| `src/lib/csv.test.ts` | change | Extend with cases for the new `exportFilename(date, scope)` behavior (per DoD, extend rather than add a new test file) |

## Plan

1. **Extend `exportFilename` and its tests** — done when: `npm test` is green with new cases covering status-filter, `filtered`, and `all` scope tokens.
2. **Update the export route to accept and validate `columns`/`scope`**, defaulting to today's behavior when absent — done when: hitting `/api/payments/export` with no new params still downloads the same file as before, and with `columns=id,amount&scope=all` returns a two-column CSV of every payment regardless of the on-screen filter.
3. **Build `ExportDialog` and wire it into `page.tsx`** in place of the plain link — done when: opening it in the browser shows the checkboxes (last4 unchecked), a row count that updates when scope or filters change, and Download disabled with zero columns checked.
4. **Manual end-to-end pass** — done when: exporting with last4 excluded and scope set to "all payments" produces a filename and CSV matching the selections, checked by hand in the browser.

## Verification

| Acceptance criterion | How it is proven |
| --- | --- |
| Ops choose columns; last-four off by default | `ExportDialog` default state, checked in the browser; route-level allowlist rejects unknown column names |
| Ops choose scope (current filter default / all payments); row count visible before download | Browser check: dialog's count updates on scope/filter change before Download is clickable |
| Filename reflects scope and date | `csv.test.ts` cases for `exportFilename(date, scope)`, covering a status-filtered name, `filtered`, and `all` |
| Amounts stay minor units internally, formatted once, currency in its own column | Already covered by existing `csv.test.ts` cases against `cell()`; confirm unchanged after this change |
| Deselecting every column disables Download | `ExportDialog` browser check; route should also reject an empty column list defensively (belt-and-suspenders, not the primary gate) |

## Risks

- The dialog's row count depends on `GET /api/payments`'s response shape (`{ total, ... }`). If that shape changes later, the count breaks silently — worth a comment linking the two call sites.
- "All payments" scope with no pagination can produce a very large CSV for a big dataset. Ticket doesn't ask for streaming/chunking, so this is accepted as-is, not solved here.
- No `Dialog`/`Checkbox` primitives exist yet; keep new UI code scoped to what `ExportDialog` needs rather than growing a general-purpose component library addition.

## Out of scope

- NWP-102 (linked ticket) — not investigated or touched here.
- Changes to the on-screen payments table itself (visible columns, pagination).
- Persisting a user's column preference across sessions — no database, and the ticket doesn't ask for it.

## Open questions

- None outstanding — the filename scope-token ambiguity was resolved with the engineer before writing this spec (status filter value when set, else `filtered`/`all`).
