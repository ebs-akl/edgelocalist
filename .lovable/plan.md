
## Fix: Client-Side Deduplication + Duplicate Warning in CSV Upload

### Problem
When a CSV contains duplicate phone numbers, the Supabase upsert throws:
> `ON CONFLICT DO UPDATE command cannot affect a row a second time`

This happens because `contact_id` is set to the phone number, so two rows with the same phone in a single upsert batch conflict with each other — Postgres can't update the same row twice in one statement.

### What Will Change
**File**: `src/components/dashboard/CsvUploadTab.tsx`

---

### Step 1 — Add `duplicatesRemoved` to `UploadStats`

Extend the `UploadStats` interface with one new field:

```ts
interface UploadStats {
  total: number;
  geocoded: number;
  failed: number;
  duplicatesRemoved: number;   // NEW
  lastUpload: string | null;
}
```

---

### Step 2 — Deduplicate after parsing, before geocoding

Immediately after the `contacts` array is built (line 85), add a deduplication pass that iterates in reverse and keeps only the **last** occurrence of each phone number (blank phones are kept as-is since they fall back to a random ID and don't conflict):

```ts
// Deduplicate by phone (keep last occurrence)
const phoneMap = new Map<string, ParsedContact>();
for (const c of contacts) {
  if (c.phone) {
    phoneMap.set(c.phone, c);   // later rows overwrite earlier ones
  } else {
    phoneMap.set(`no-phone-${Math.random()}`, c); // keep no-phone rows
  }
}
const deduped = Array.from(phoneMap.values());
const duplicatesRemoved = contacts.length - deduped.length;
```

All downstream logic (`validContacts`, batching, geocoding, upsert) then operates on `deduped` instead of `contacts`.

---

### Step 3 — Surface `duplicatesRemoved` in the stats

Pass `duplicatesRemoved` into `setStats(...)`:

```ts
setStats({
  total: deduped.length,
  geocoded: totalGeocoded,
  failed: totalFailed,
  duplicatesRemoved,
  lastUpload: new Date().toISOString(),
});
```

---

### Step 4 — Show the warning banner in the upload results UI

In the "Upload results" section (currently lines 263–273), add a second row below the success line that only renders when `duplicatesRemoved > 0`:

```tsx
{stats.duplicatesRemoved > 0 && (
  <div className="flex items-center gap-2 text-amber-600">
    <AlertCircle className="h-4 w-4 shrink-0" />
    <span className="text-sm">
      {stats.duplicatesRemoved} duplicate phone number
      {stats.duplicatesRemoved === 1 ? " was" : "s were"} removed from your CSV.
    </span>
  </div>
)}
```

`AlertCircle` is already imported, so no new imports are needed.

---

### Result After Change

The upload completion card will look like:

```
✓ 847 contacts ready.  3 addresses could not be geocoded.
⚠ 12 duplicate phone numbers were removed from your CSV.
```

Reps immediately understand why their imported count is lower than the row count in their spreadsheet — no confusion, no support tickets.

### No Database Changes Required
The upsert conflict key (`rep_id,contact_id`) stays the same. Deduplication is purely client-side.
