

## Contact Category Filters: RLT, BIZ, REG

### What we're building
Add a set of toggle filter buttons (RLT, BIZ, REG) to the search results area so users can quickly filter contacts by category:
- **RLT** — contacts where `rlt` equals "Y" (case-insensitive)
- **BIZ** — contacts where `biz` equals "Y" (case-insensitive)  
- **REG** — contacts where both `biz` and `rlt` are null, empty, or "N" (i.e. regular/residential contacts)

Filters are client-side (applied to already-fetched results), multi-selectable (e.g. RLT + BIZ shows both), and default to "all" when none are active.

### Changes

**`src/components/dashboard/SearchTab.tsx`**

1. Add a new state variable:
   ```ts
   const [categoryFilters, setCategoryFilters] = useState<Set<"RLT" | "BIZ" | "REG">>(new Set());
   ```

2. Add a toggle helper:
   ```ts
   const toggleCategory = (cat: "RLT" | "BIZ" | "REG") => {
     setCategoryFilters(prev => {
       const next = new Set(prev);
       next.has(cat) ? next.delete(cat) : next.add(cat);
       return next;
     });
   };
   ```

3. Update the `filtered` pipeline (around line 305) to apply category filters between the text filter and the sort:
   - If `categoryFilters` is empty, no filtering (show all)
   - Otherwise, include a contact if it matches **any** active filter:
     - RLT: `c.rlt?.toUpperCase() === "Y"`
     - BIZ: `c.biz?.toUpperCase() === "Y"`
     - REG: `rlt` is not "Y" AND `biz` is not "Y"

4. Render filter buttons in the results header area (near line 450, alongside the sort dropdown), as a row of small toggle buttons styled like the existing radius selector — highlighted when active. Reset `selectedIds` when filters change.

5. Clear `categoryFilters` when a new search is performed (in `runRadiusQuery`).

No backend or database changes required — `rlt` and `biz` fields are already returned by both the RPC and edge function queries.

