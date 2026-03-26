

## Redesign Auth Page to Match Alomar Layout

### Current state
The auth page is a single centered Card on a plain background with a Footer.

### Target layout (from Alomar project)
A full-screen split layout:
- **Left half** (desktop only): full-bleed GIF image covering the entire left side
- **Right half**: vertically centered form area with logo at top, heading, form fields, and footer links — no Card wrapper

### Changes

**1. Copy the uploaded GIF into the project**
- Copy `user-uploads://696f8a802da948b83db18ef4.gif` to `public/images/auth-bg.gif`

**2. Rewrite the layout in `src/pages/Auth.tsx`**
- Remove the `Card` wrapper and `Footer` component
- Change outer container from centered single-column to `min-h-screen flex flex-col md:flex-row`
- Add left panel: `<div className="hidden md:block md:w-1/2 relative overflow-hidden">` with the GIF as an `object-cover` background image
- Right panel: `<div className="w-full md:w-1/2 flex items-center justify-center bg-background px-6 py-12 min-h-screen">` containing `<div className="w-full max-w-md space-y-6">`
- Keep the existing LocaList logo at the top center of the right panel
- Style inputs with `h-12 bg-muted/40 border-border/60` classes
- Style buttons with `h-12 text-base font-semibold uppercase tracking-wide`
- Move "Forgot password?" link inline next to Password label (like Alomar)
- Add footer support link and terms text at bottom of form area
- Use `HelpCircle` icon for support link

All existing form logic, state, handlers, and validation remain unchanged — only the JSX layout and styling classes change.

### Files to change
- `src/pages/Auth.tsx` — layout rewrite
- `public/images/auth-bg.gif` — new file (copied from upload)

