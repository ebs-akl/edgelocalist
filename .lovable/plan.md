

## Link "Watch Demo" Button to Video URL

### Change
**File: `src/pages/Landing.tsx`** — Update the "Watch Demo" button (around line 219) to navigate to `https://video.edgedms.com/video/exploring-the-localist-app-2sut`. Change it from a plain `<Button>` to an `<a>` tag (or wrap with one) with `target="_blank"` and `rel="noopener noreferrer"`.

