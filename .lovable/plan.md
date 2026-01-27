

# HomeShelf MVP Implementation Plan

## Overview
A private home-library catalog where book owners can manage their collection and share an unlisted link with friends who can request books via email—no login required for requesters.

---

## Phase 1: Foundation & Database Setup

### Supabase Configuration
- Set up Supabase Cloud integration
- Create all tables with proper constraints:
  - **profiles**: user display name, city, linked to auth.users
  - **libraries**: each user's library with unique share_token
  - **books**: catalog entries with status (available/lent_out/reading/unavailable) and shareable toggle
  - **requests**: incoming book requests with status tracking

### Row-Level Security (RLS)
- profiles: users can only read/update their own profile
- libraries: owners have full CRUD; no public read (token-based access via edge function)
- books: owners have full CRUD on their library's books
- requests: owners can read/update requests for their library; inserts via secure edge function only

### Auto-Initialization
- Database trigger to create profile + default library with generated share_token on first login

---

## Phase 2: Authentication & Core Layout

### Auth Flow
- Email + password authentication (simpler than magic links for MVP)
- Login page with sign-up option
- Protected routes redirect to login if unauthenticated

### App Shell
- **Desktop**: Left sidebar navigation with warm cream background
- **Mobile**: Top navigation with hamburger menu
- Consistent styling: burgundy/forest green accents, charcoal text, gold highlights
- Toast notifications for all user actions

---

## Phase 3: Owner Dashboard & Profile

### Dashboard (/app)
- Welcome message with owner's display name
- Library summary card (book count, pending requests count)
- Quick action buttons: Add Book, Manage Share Link, View Requests
- Empty state handling

### Profile Management (/app/profile)
- Edit display name and city
- Form validation and save confirmation

---

## Phase 4: Book Management

### Book List (/app/books)
- Table/card view of all books
- Columns: title, author, status (color-coded pill), shareable toggle
- Quick status dropdown (available → lent_out → reading → unavailable)
- Edit and delete actions
- Search by title/author
- Filter by status and shareable toggle
- Empty state: "No books yet—add your first book!"

### Add Book (/app/books/new)
- Manual entry form: title (required), author, ISBN, notes
- Status selector (default: available)
- Shareable checkbox (default: on)
- Validation and success redirect

### Edit Book
- Modal or inline editing for existing books

---

## Phase 5: Share Link Management

### Share Settings (/app/share)
- Display current share link with copy-to-clipboard button
- Visual explanation of how sharing works
- "Regenerate Link" button with confirmation (old link stops working immediately)
- Preview link opens shared view in new tab

---

## Phase 6: Public Shared Library

### Shared Library Page (/s/[token])
- **No login required**
- Edge function resolves token → library, returns only:
  - Library name
  - Owner display name (no email or personal info)
  - Shareable books where status ≠ unavailable
- Book cards show: title, author, status pill
- "Request this Book" button on each card

### Request Modal
- Fields: your name, email, message (optional)
- Client-side validation (email format, max lengths)
- Submit triggers edge function

### Invalid Token
- Friendly 404-style page: "This library doesn't exist or the link has expired"

---

## Phase 7: Request System & Email

### Edge Function: Create Request
- Validates share_token
- Validates input (name, email format, length limits)
- Basic rate limiting (time-based throttle per IP)
- Creates request row with status "pending"
- Sends email to owner via Resend:
  - Subject: "New book request: {book title}"
  - Body: requester info, book details, link to /app/requests
- Sends confirmation email to requester (optional but included)

### Request Management (/app/requests)
- List of all requests with filters (pending/approved/declined)
- Each request shows: requester name, email, message, book title, date
- Action buttons: Approve / Decline
- Approve action offers checkbox: "Mark book as lent out" (default on)
- Empty state: "No requests yet"

---

## Phase 8: Polish & Edge Cases

### Error Handling
- Network errors show retry options
- Form validation with clear error messages
- Graceful degradation for all failure states

### Mobile Optimization
- Fully responsive layouts
- Touch-friendly buttons and toggles
- Collapsible navigation

### Styling
- Background: warm cream (#F5F1E8)
- Primary: deep burgundy or forest green
- Text: charcoal (#2D2D2D)
- Accent: soft gold (#D4A574) for buttons and highlights

---

## Environment Variables Required
After implementation, you'll need to configure:
- `RESEND_API_KEY` - for sending emails
- Supabase connection is handled automatically by Lovable Cloud

---

## What's Included in MVP
✅ Manual book entry with full CRUD
✅ Status toggles and shareable controls
✅ Secure token-based sharing (unlisted link)
✅ Email notifications via Resend
✅ Request approval workflow
✅ Mobile-friendly, clean UI
✅ Complete RLS security

## Explicitly Excluded from MVP
❌ AI/OCR book import
❌ Image uploads for book covers
❌ Friend accounts/login
❌ Multiple libraries per user
❌ Public library discovery

