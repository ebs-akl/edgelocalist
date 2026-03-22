

## Overhaul: SMS Snippet Library

### What we're building
Replace the 4 flat templates with a structured snippet library organized into 3 categories (BIZ, RLT, REG), each with named snippets containing 3 timing variants (Immediate, Morning Gap, In Advance). Users pick a category → snippet → timing, then the message populates the textarea.

### Data Structure
A new `SMS_SNIPPETS` array with this shape:
```ts
type SmsSnippet = {
  category: "BIZ" | "RLT" | "REG";
  categoryLabel: string; // "Business Gifting", "RLT (Realtor/Lender)", "Neighborhood Stop-Ins"
  snippets: {
    name: string;        // e.g. "The Coffee & Catch-Up"
    variants: {
      timing: "Immediate" | "Morning Gap" | "In Advance";
      body: string;
    }[];
  }[];
};
```

**6 snippets total** (2 per category), each with 3 timing variants = 18 messages.

### UI Changes (GroupSmsModal.tsx)

1. **Replace** the flat `SMS_TEMPLATES` array and template buttons with a 3-step selector:
   - **Step 1 — Category tabs**: Three small toggle buttons (BIZ / RLT / REG) styled like the existing category filter buttons
   - **Step 2 — Snippet selector**: Once a category is selected, show the 2 snippet names as buttons (e.g. "Coffee & Catch-Up" / "Artifact Drop")
   - **Step 3 — Timing selector**: Three small buttons (Immediate / Morning Gap / In Advance) — clicking populates the textarea

2. **State additions**: `snippetCategory`, `snippetIndex`, `snippetTiming` — all nullable, used to highlight active selections.

3. **Message content**: All 18 messages from the user's spec, verbatim. Note: The messages include `{{contact.first_name}}` and `{{custom_values.rep_first_name}}` GHL merge fields — these stay as-is since the Workflow resolves them. The "Hi {{contact.first_name}}!" greeting IS included in the snippet bodies (unlike the old templates where the Workflow added it).

4. **Important detail**: Since these snippets already include the greeting ("Hi {{contact.first_name}}!"), update the "How it works" step 3 and success screen preview to remove the "adds Hi [Name] automatically" language, or add a note that snippets already include it.

5. **maxLength**: Bump textarea `maxLength` from 1000 to 1600 since the longest snippet (~450 chars) is well within range but users may edit/expand.

### Snippet Content (all 18 messages as provided by user)

**BIZ — "The Coffee & Catch-Up"**: 3 variants (Immediate, Morning Gap, In Advance) — coffee drop + check on gifts
**BIZ — "The Artifact Drop" (Catalog)**: 3 variants — 2026 Gifting Catalog drop + Q4 urgency
**RLT — "The Top-Down Coffee Drop"**: 3 variants — broker/manager brokerage visit + coffees
**RLT — "The Show and Tell"**: 3 variants — agent closing gift drop
**REG — "The Forever Guarantee Audit"**: 3 variants — straight edge touch-up + Double-D® factory refurbishing
**REG — "The Unpacked Gear Audit"**: 3 variants — neighbor service call + right tool for right job

### Files Changed
- `src/components/dashboard/GroupSmsModal.tsx` — full template section overhaul (data + UI)

No backend changes needed.

