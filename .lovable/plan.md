

## Plan: Make the App Installable as a PWA on Android

To allow Android users to install the web app to their home screen (like a native app), we need to set up a **Progressive Web App (PWA)** configuration. This adds an install prompt on Android devices and enables offline caching.

### What this gives you
- Android users get an "Add to Home Screen" / "Install App" prompt automatically
- The app launches in full-screen mode (no browser chrome)
- App icon on the home screen like a native app
- Faster loading with caching

### Implementation Steps

1. **Install `vite-plugin-pwa`** — the standard Vite plugin for PWA support

2. **Configure PWA in `vite.config.ts`**
   - Add the PWA plugin with app name, theme color, icons, and manifest settings
   - Add `/~oauth` to the service worker's `navigateFallbackDenylist` to prevent caching OAuth redirects

3. **Add PWA icons to `public/`**
   - Create `pwa-192x192.png` and `pwa-512x512.png` icons (can reuse the existing logo assets)

4. **Update `index.html`**
   - Add `<meta name="theme-color">` and `<link rel="apple-touch-icon">` tags for mobile optimization

5. **Optionally create an `/install` page**
   - A dedicated page with instructions for users on how to install, with a button to trigger the browser's install prompt

### Technical Details

- Plugin: `vite-plugin-pwa` with `registerType: 'autoUpdate'`
- Manifest will include: `name`, `short_name`, `description`, `theme_color`, `background_color`, `display: 'standalone'`, `icons`
- Service worker will use Workbox with `navigateFallbackDenylist: [/^\/~oauth/]`
- Icons derived from existing `Localist_Logo.png` or `AKL_Logo.png`

