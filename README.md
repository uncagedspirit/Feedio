# feedio — Feedback Board SaaS

A production-ready React + Tailwind feedback board app.

## Project structure

```
src/
├── App.jsx                          ← root: providers + routing
├── main.jsx                         ← entry point
├── index.css                        ← tailwind + fonts
│
├── router/
│   └── index.jsx                    ← lightweight hash router (swap for react-router-dom)
│
├── context/
│   └── AppContext.jsx                ← auth, boards, posts — swap internals for real API
│
├── data/
│   └── mockData.js                  ← all dummy data, pastel colors, plan config
│
├── hooks/
│   └── useFadeIn.js                 ← scroll-triggered fade animations
│
├── components/
│   ├── ui/
│   │   ├── Icons.jsx                ← SVG icon library
│   │   └── index.jsx                ← Button, Badge, Modal, Input, Toggle, Avatar, etc.
│   │
│   ├── layout/
│   │   ├── Navbar.jsx
│   │   └── Footer.jsx
│   │
│   ├── auth/
│   │   └── AuthModal.jsx
│   │
│   └── boards/
│       ├── FeedbackCard.jsx         ← expandable card with pastel colors
│       ├── BoardCard.jsx            ← directory listing card
│       ├── RoadmapView.jsx          ← kanban columns
│       ├── AddRequestModal.jsx      ← consumer submission form
│       └── CreateBoardModal.jsx     ← 2-step board creation wizard
│
└── pages/
    ├── LandingPage.jsx
    ├── BoardsPage.jsx               ← /boards
    ├── PublicBoardPage.jsx          ← /boards/:slug
    ├── DashboardPage.jsx            ← /dashboard
    └── AdminBoardPage.jsx           ← /dashboard/boards/:slug
```

## Routes

| URL | Page |
|-----|------|
| `/` | Landing page with featured boards |
| `/boards` | Public boards directory |
| `/boards/:slug` | Consumer board view (feed + roadmap) |
| `/dashboard` | Owner dashboard |
| `/dashboard/boards/:slug` | Admin board management |

## Quick start

```bash
npm install
npm run dev
```

## Integrating a real backend

All data operations are isolated in `src/context/AppContext.jsx`.
Replace the `localStorage`-based functions with API calls:

- `login(email, password)`          → `POST /api/auth/login`
- `signup(name, email, password)`   → `POST /api/auth/signup`
- `createBoard(data)`               → `POST /api/boards`
- `updateBoard(boardId, updates)`   → `PATCH /api/boards/:id`
- `deleteBoard(boardId)`            → `DELETE /api/boards/:id`
- `addPost(boardId, data)`          → `POST /api/boards/:id/posts`
- `updatePost(postId, updates)`     → `PATCH /api/posts/:id`
- `deletePost(postId)`              → `DELETE /api/posts/:id`
- `toggleUpvote(postId, boardId)`   → `POST /api/posts/:id/upvote`
- `upgradePlan()`                   → open Stripe Checkout

## Plan limits (enforced in AppContext)

- **Free**: 1 public board, 25 interactions total, no private boards
- **Pro**: Unlimited boards, unlimited interactions, private boards

## Notes

- Uses hash-based routing (`#/boards/slug`) for zero-config deployment
- To use `react-router-dom`, replace `src/router/index.jsx` and update imports
- Demo mode: any email + password creates a session
