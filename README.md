# 📚 Runo — Personal Library Manager

**Runo** is a web application for managing your personal book library and sharing it with friends. Built with React, TypeScript, and Lovable Cloud.

🔗 **Live:** [homeshelf.lovable.app](https://homeshelf.lovable.app)

## Features

- **📖 Book Management** — Add, edit, and organize your books with status tracking (available, reading, lent out)
- **📷 AI Book Scanner** — Scan book covers or bookshelves with AI to auto-detect title and author
- **🔗 Library Sharing** — Generate a unique link so friends can browse your collection
- **📩 Borrow Requests** — Friends can request to borrow books; you approve or decline
- **🌐 Bilingual** — Full Bulgarian and English support
- **🔐 Authentication** — Secure email-based signup and login
- **👤 Admin Panel** — User statistics and management for administrators

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | React 18, TypeScript 5, Vite 5 |
| Styling | Tailwind CSS 3, shadcn/ui |
| Backend | Lovable Cloud (Supabase) |
| AI | Lovable AI Gateway (Gemini 2.5 Flash) |
| State | TanStack React Query |
| Routing | React Router 6 |

## Project Structure

```
src/
├── components/       # Reusable UI components
├── contexts/         # Auth & Language context providers
├── hooks/            # Custom hooks (books, library, requests, etc.)
├── i18n/             # Translations (BG/EN)
├── pages/            # Route pages (Landing, Login, Dashboard, Books…)
└── integrations/     # Supabase client & types (auto-generated)

supabase/
└── functions/        # Edge functions (book scanning, notifications, etc.)
```

## Getting Started

```bash
npm install
npm run dev
```

Requires Node.js 18+. Environment variables are managed automatically via Lovable Cloud.

## Development

- **Lovable Editor:** [lovable.dev/projects/ae8e676a-20df-4270-a328-c39e18c288cd](https://lovable.dev/projects/ae8e676a-20df-4270-a328-c39e18c288cd)
- Changes sync bidirectionally between Lovable and GitHub
- Database schema and edge functions deploy automatically

## License

Private project.
