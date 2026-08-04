# Sangam — Everything. One Sangam.

A full-featured social media platform with posts, flicks (short videos), watch (long videos), stories, real-time chats, notifications (Pulse), search, explore, hashtags, and people discovery.

## Tech Stack

- **Frontend**: React 18 + TypeScript + Vite
- **Styling**: Tailwind CSS (dark/light mode)
- **Backend**: Supabase (Postgres + Auth + Realtime + Storage)
- **State**: Zustand
- **Icons**: Lucide React
- **Routing**: React Router v7

## Features

- **Feed**: Text/image posts, likes, comments, reposts (echo), bookmarks
- **Flicks**: Short vertical videos with swipe navigation
- **Watch**: Long-form videos with comments and reactions
- **Stories**: 24-hour ephemeral stories with gradient rings
- **Chats**: Real-time direct messages with typing indicators and read receipts
- **Pulse**: Notifications system with realtime updates and per-type settings
- **Search**: Global search with suggestions, recent searches, and multi-tab results
- **Explore**: Trending content, masonry grid, trending hashtags sidebar
- **Hashtags**: Follow hashtags, view tagged content across posts/flicks/watch
- **People Discovery**: Suggestions based on mutual connections
- **Dark/Light Mode**: System preference detection + manual toggle
- **PWA**: Installable, offline support, service worker caching

## Project Setup

### Prerequisites

- Node.js 18+
- npm

### Installation

```bash
npm install
```

### Environment Variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```bash
cp .env.example .env
```

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### Supabase Setup

1. Create a new Supabase project at [supabase.com](https://supabase.com)
2. Run the migrations in `supabase/migrations/` in order (they are timestamped)
3. Create the following storage buckets (public):
   - `post-media` — for post images and chat images
   - `avatars` — for profile pictures
   - `covers` — for profile cover photos
   - `stories` — for story media
   - `flicks` — for short videos
   - `videos` — for long-form videos
4. Enable Email/Password auth (email confirmation OFF)

### Local Development

```bash
npm run dev      # Start dev server
npm run build    # Production build
npm run typecheck # TypeScript check
npm run lint     # ESLint
```

## Deployment (Vercel)

1. Push your code to GitHub
2. Import the repository at [vercel.com](https://vercel.com)
3. Set environment variables in Vercel project settings:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy — Vercel will auto-detect Vite and run `npm run build`

The `vercel.json` file handles SPA routing rewrites so all routes serve `index.html`.

## Project Structure

```
src/
  components/     # Reusable UI components
  pages/          # Route pages
  lib/            # API clients, stores, types, utilities
  index.css       # Global styles + Tailwind
  main.tsx        # Entry point + service worker registration
supabase/
  migrations/     # Database migrations (SQL)
public/
  manifest.json   # PWA manifest
  sw.js           # Service worker
  icon.svg        # App icon
```

## License

Private project.
