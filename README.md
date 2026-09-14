# EdgeLocalist

**Proximity-based contact search for independent knife-sales reps.**

EdgeLocalist helps you find customers near any location, plan efficient routes, and maximize your face-to-face selling time. Upload your contacts or sync them from Edge DMS, and search by address with configurable radius options.

---

## Features

### Core
- **Nearby Search** — Find contacts within 5, 10, 25, or 50 miles of any address
- **Interactive Map** — View results as color-coded pins (by lifetime value) on a Mapbox-powered map
- **Contact Details** — Full customer profile with revenue metrics, order history, and sales data
- **Quick Actions** — One-tap call, text, and Google Maps directions from any contact card

### Standalone Mode
- **CSV Upload** — Import contacts from any spreadsheet; auto-detects common column names
- **Automatic Geocoding** — Addresses are converted to coordinates in batches after upload
- **Deduplication** — Smart matching by phone number prevents duplicate records
- **Account Settings** — Manage display name, rep number, and subscription

### Edge DMS Integration
- **Automatic Sync** — Contacts pull from your CRM automatically with real-time webhook updates
- **Single Sign-On** — No extra passwords; opens directly from your Edge DMS dashboard
- **Group SMS** — Send personalized texts to multiple nearby contacts with merge-field templates
- **Tag Contacts** — Apply tags that sync back to your CRM for campaign targeting
- **LC Call** — Initiate calls through your CRM's calling system from contact detail cards

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18 · TypeScript · Vite · Tailwind CSS |
| UI Components | shadcn/ui · Radix Primitives · Framer Motion |
| Backend | Supabase (Auth · Postgres · Edge Functions · Realtime) |
| Maps | Mapbox GL JS |
| CRM Integration | Edge DMS OAuth + REST API |

---

## Getting Started

### Prerequisites
- Node.js 18+ (recommend [nvm](https://github.com/nvm-sh/nvm))
- A Supabase project with the EdgeLocalist schema
- Mapbox access token (for geocoding and map display)

### Local Development

```sh
# Clone the repository
git clone <YOUR_GIT_URL>
cd edgelocalist

# Install dependencies
npm install

# Set environment variables
cp .env.example .env
# Edit .env with your VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY, and VITE_MAPBOX_ACCESS_TOKEN

# Start the dev server
npm run dev
```

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `VITE_SUPABASE_URL` | Yes | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anonymous/public key |
| `VITE_MAPBOX_ACCESS_TOKEN` | Yes | Mapbox GL token for maps and geocoding |

---

## Project Structure

```
src/
├── assets/          # Images, logos, animations
├── components/
│   ├── dashboard/   # SearchTab, CsvUploadTab, ContactMapView, modals
│   └── ui/          # shadcn/ui component library
├── contexts/        # AuthContext (session + GHL bridge)
├── hooks/           # useGhlSso, useInactivityTimeout, useMobile
├── integrations/    # Supabase client + generated types
├── lib/             # Utility functions
├── pages/           # Landing, Auth, Dashboard, Settings, FAQ, UserGuide
└── main.tsx         # App entry point

supabase/
├── functions/       # Edge Functions (sync, search, SMS, tagging, webhooks)
└── migrations/      # Database schema migrations
```

---

## Documentation

- **[FAQ](/faq)** — Common questions with answers for both Standalone and Edge DMS users
- **[User Guide](/guide)** — Step-by-step walkthrough of every feature

---

## Deployment

The app is deployed via [Lovable](https://lovable.dev). Frontend changes require clicking "Update" in the publish dialog. Backend changes (Edge Functions, migrations) deploy automatically.

**Live URL:** [edgelocalist.lovable.app](https://edgelocalist.lovable.app)

---

## License

Proprietary — All rights reserved.
