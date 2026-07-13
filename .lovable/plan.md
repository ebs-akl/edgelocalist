## Goal

Let the user select every contact matching the current search, not just the 50 shown on the current page. Actions (Group Text, Tag, Export) then operate on the full set.

## Current behavior

- Search results are paginated at 50/page. `results` state only holds the current page.
- The "Select all" checkbox in the list header only selects the 50 rows on screen.
- `selectedContacts` is computed as `filtered.filter(...)`, so even if extra IDs were held in state, downstream actions couldn't see contacts from other pages.

## Proposed behavior

When the header checkbox is clicked and there is more than one page of results:

1. Toggle selects/deselects the current page (existing behavior).
2. A new inline banner appears above the results:
   `All 50 on this page are selected. Select all 312 contacts across all pages.`
   - Clicking the link fetches every matching contact (same all-pages loop the CSV export already uses), stores them in a new `allSelectedContacts` cache, and marks all their IDs as selected.
   - Banner then shows: `All 312 contacts are selected. Clear selection.`
3. `selectedContacts` used by Group Text / Tag / Export is sourced from a merged pool: current page's `filtered` rows plus the `allSelectedContacts` cache, deduped by id, filtered by `selectedIds`.
4. Any manual deselect (unchecking a row or the header) clears the "all pages" mode and returns to per-page selection.
5. Changing the search, radius, or filters clears both `selectedIds` and `allSelectedContacts`.

## UX details

- Banner styling matches existing muted info banners in SearchTab (small text, primary-colored action link).
- While fetching all pages, show a spinner in the banner and disable the link.
- Show toast on failure; keep the current-page selection intact.
- Works in GHL mode only (matches existing selection scope). No change to CSV mode.

## Technical notes

- New state in `SearchTab.tsx`:
  - `allSelectedContacts: NearbyContact[]` — cache of full result set when "select across pages" is active.
  - `fetchingAll: boolean` — loading flag for banner.
- Extract the multi-page fetch loop already inside `handleExport` (lines ~360–395) into a reusable `fetchAllMatchingContacts()` helper so both Export and Select-All use one code path.
- Update `selectedContacts` derivation to merge `filtered` and `allSelectedContacts` before filtering by `selectedIds`.
- Reset new state in the same effects that already reset `selectedIds` on new searches/filter changes.

## Files to change

- `src/components/dashboard/SearchTab.tsx` (only file — pure UI/state, no backend or schema changes).
