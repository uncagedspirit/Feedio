// ─── PASTEL COLOR PALETTE (Light Spring) ───────────────────────────────────
// Each card gets a deterministic pastel color based on its ID
export const PASTEL_COLORS = [
  { bg: '#FEF9C3', border: '#FDE68A', text: '#92400E' },   // butter yellow
  { bg: '#FEF3C7', border: '#FCD34D', text: '#92400E' },   // daffodil
  { bg: '#FFEDD5', border: '#FDBA74', text: '#9A3412' },   // peach
  { bg: '#FFE4E6', border: '#FDA4AF', text: '#9F1239' },   // shell pink
  { bg: '#FCE7F3', border: '#F9A8D4', text: '#9D174D' },   // pink
  { bg: '#EDE9FE', border: '#C4B5FD', text: '#5B21B6' },   // wisteria
  { bg: '#E0F2FE', border: '#7DD3FC', text: '#0C4A6E' },   // sky blue
  { bg: '#CCFBF1', border: '#5EEAD4', text: '#134E4A' },   // aqua
  { bg: '#DCFCE7', border: '#86EFAC', text: '#14532D' },   // mint
  { bg: '#D1FAE5', border: '#6EE7B7', text: '#064E3B' },   // light green
  { bg: '#ECFCCB', border: '#A3E635', text: '#365314' },   // pistachio
  { bg: '#F0FDF4', border: '#4ADE80', text: '#15803D' },   // spring green
]

export const getPastelColor = (id = '') => {
  const index = id.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % PASTEL_COLORS.length
  return PASTEL_COLORS[index]
}

// ─── STATUS CONFIG ──────────────────────────────────────────────────────────
export const STATUS_CONFIG = {
  open:           { label: 'Open',           color: '#6B7280', bg: '#F3F4F6', dot: '#9CA3AF' },
  planned:        { label: 'Planned',        color: '#0C4A6E', bg: '#E0F2FE', dot: '#38BDF8' },
  in_development: { label: 'In Development', color: '#134E4A', bg: '#CCFBF1', dot: '#14B8A6' },
  coming_soon:    { label: 'Coming Soon',    color: '#5B21B6', bg: '#EDE9FE', dot: '#8B5CF6' },
  live:           { label: 'Live',           color: '#14532D', bg: '#DCFCE7', dot: '#22C55E' },
  considering:    { label: 'Considering',    color: '#92400E', bg: '#FEF3C7', dot: '#F59E0B' },
  declined:       { label: 'Declined',       color: '#7F1D1D', bg: '#FEE2E2', dot: '#EF4444' },
}

export const ROADMAP_COLUMNS = [
  { key: 'live',           label: 'Live',           columnBg: '#DCFCE7' },
  { key: 'in_development', label: 'In Development', columnBg: '#CCFBF1' },
  { key: 'coming_soon',    label: 'Coming Soon',    columnBg: '#EDE9FE' },
  { key: 'considering',    label: 'Considering',    columnBg: '#FEF9C3' },
]

// ─── TAG CONFIG ─────────────────────────────────────────────────────────────
export const DEFAULT_TAGS = ['Feature', 'Bug', 'Integration', 'Improvement', 'Question', 'Other']

export const TAG_COLORS = {
  Feature:     { bg: '#EDE9FE', text: '#5B21B6', border: '#C4B5FD' },
  Bug:         { bg: '#FFE4E6', text: '#9F1239', border: '#FDA4AF' },
  Integration: { bg: '#E0F2FE', text: '#0C4A6E', border: '#7DD3FC' },
  Improvement: { bg: '#DCFCE7', text: '#14532D', border: '#86EFAC' },
  Question:    { bg: '#FEF3C7', text: '#92400E', border: '#FCD34D' },
  Other:       { bg: '#F3F4F6', text: '#374151', border: '#D1D5DB' },
}

// ─── MOCK USERS ─────────────────────────────────────────────────────────────
export const MOCK_USERS = [
  {
    id: 'user-1',
    name: 'Alex Rivera',
    email: 'alex@acmaai.io',
    plan: 'pro',
    avatarInitials: 'AR',
    avatarColor: '#CCFBF1',
  },
  {
    id: 'user-2',
    name: 'Mia Chen',
    email: 'mia@taskflow.app',
    plan: 'free',
    avatarInitials: 'MC',
    avatarColor: '#EDE9FE',
  },
  {
    id: 'user-3',
    name: 'Tom Okafor',
    email: 'tom@inkdesk.co',
    plan: 'pro',
    avatarInitials: 'TO',
    avatarColor: '#FFEDD5',
  },
]

// ─── MOCK BOARDS ────────────────────────────────────────────────────────────
export const MOCK_BOARDS = [
  {
    id: 'board-1',
    slug: 'acma-ai',
    name: 'Acma AI',
    tagline: 'The AI assistant that thinks ahead',
    description: 'Acma AI helps product teams automate repetitive tasks, generate insights from data, and ship features faster with intelligent suggestions.',
    website: 'https://acma.ai',
    accentColor: '#14B8A6',
    headerGradient: 'from-teal-600 to-emerald-500',
    visibility: 'public',
    ownerId: 'user-1',
    ownerName: 'Alex Rivera',
    ownerAvatarInitials: 'AR',
    ownerAvatarColor: '#CCFBF1',
    tags: DEFAULT_TAGS,
    settings: {
      requireName: true,
      requireEmail: false,
      allowAnonymous: false,
      showVoterCount: true,
    },
    totalInteractions: 18,
    createdAt: '2024-11-15',
  },
  {
    id: 'board-2',
    slug: 'taskflow',
    name: 'TaskFlow',
    tagline: 'Project management, reimagined',
    description: 'TaskFlow is a lightweight project management tool built for async teams. Kanban, timelines, and integrations that actually work.',
    website: 'https://taskflow.app',
    accentColor: '#8B5CF6',
    headerGradient: 'from-violet-600 to-purple-500',
    visibility: 'public',
    ownerId: 'user-2',
    ownerName: 'Mia Chen',
    ownerAvatarInitials: 'MC',
    ownerAvatarColor: '#EDE9FE',
    tags: ['Feature', 'Bug', 'Workflow', 'Integration', 'Design'],
    settings: {
      requireName: false,
      requireEmail: false,
      allowAnonymous: true,
      showVoterCount: true,
    },
    totalInteractions: 22,
    createdAt: '2024-12-02',
  },
  {
    id: 'board-3',
    slug: 'inkdesk',
    name: 'InkDesk',
    tagline: 'Write beautifully. Think clearly.',
    description: 'InkDesk is a distraction-free writing and note-taking app for creative professionals and researchers.',
    website: 'https://inkdesk.co',
    accentColor: '#F97316',
    headerGradient: 'from-orange-500 to-amber-400',
    visibility: 'public',
    ownerId: 'user-3',
    ownerName: 'Tom Okafor',
    ownerAvatarInitials: 'TO',
    ownerAvatarColor: '#FFEDD5',
    tags: ['Feature', 'Bug', 'Writing', 'Export', 'UX'],
    settings: {
      requireName: true,
      requireEmail: true,
      allowAnonymous: false,
      showVoterCount: false,
    },
    totalInteractions: 9,
    createdAt: '2025-01-08',
  },
]

// ─── MOCK POSTS ─────────────────────────────────────────────────────────────
export const MOCK_POSTS = [
  // Board 1 — Acma AI
  {
    id: 'post-1',
    boardId: 'board-1',
    title: 'Dark mode support',
    description: 'Would love an option to switch to dark theme across the entire dashboard. It strains my eyes at night and I use this tool for long sessions.',
    authorName: 'Jamie L.',
    authorEmail: 'jamie@example.com',
    upvotes: 142,
    status: 'in_development',
    tag: 'Feature',
    pinned: true,
    trending: true,
    createdAt: '2025-02-01',
  },
  {
    id: 'post-2',
    boardId: 'board-1',
    title: 'CSV export for all reports',
    description: 'Need to export billing and usage reports as CSV files monthly for our accounting team. Right now I have to manually copy data.',
    authorName: 'Priya S.',
    authorEmail: 'priya@company.io',
    upvotes: 98,
    status: 'planned',
    tag: 'Feature',
    pinned: false,
    trending: false,
    createdAt: '2025-02-05',
  },
  {
    id: 'post-3',
    boardId: 'board-1',
    title: 'Webhook support for new signups',
    description: 'Fire a webhook event whenever a new user registers so I can trigger onboarding flows in my own system.',
    authorName: 'Marcus D.',
    authorEmail: 'marcus@dev.io',
    upvotes: 76,
    status: 'coming_soon',
    tag: 'Integration',
    pinned: false,
    trending: false,
    createdAt: '2025-02-08',
  },
  {
    id: 'post-4',
    boardId: 'board-1',
    title: 'Login page throws 500 on OAuth',
    description: 'Google login fails intermittently showing a server error page. Happens about 1 in 10 times. Very frustrating for our team.',
    authorName: 'Sarah K.',
    authorEmail: 'sarah@startup.com',
    upvotes: 54,
    status: 'in_development',
    tag: 'Bug',
    pinned: false,
    trending: false,
    createdAt: '2025-02-10',
  },
  {
    id: 'post-5',
    boardId: 'board-1',
    title: 'Batch processing for large datasets',
    description: 'When I try to process files over 500MB the tool times out. Need async batch processing with progress indicator.',
    authorName: 'Chen W.',
    authorEmail: 'chen@bigco.com',
    upvotes: 41,
    status: 'considering',
    tag: 'Feature',
    pinned: false,
    trending: false,
    createdAt: '2025-02-14',
  },
  {
    id: 'post-6',
    boardId: 'board-1',
    title: 'Mobile app (iOS & Android)',
    description: 'The web app is great but I need to access insights on the go. A native mobile app would be huge for our sales team.',
    authorName: 'Leo R.',
    authorEmail: 'leo@sales.com',
    upvotes: 38,
    status: 'live',
    tag: 'Feature',
    pinned: false,
    trending: false,
    createdAt: '2025-01-20',
  },
  // Board 2 — TaskFlow
  {
    id: 'post-7',
    boardId: 'board-2',
    title: 'Timeline / Gantt view',
    description: 'We need a Gantt chart view to visualize project timelines. The Kanban view is great but we need to see dependencies too.',
    authorName: 'Anonymous',
    authorEmail: '',
    upvotes: 203,
    status: 'coming_soon',
    tag: 'Feature',
    pinned: true,
    trending: true,
    createdAt: '2025-01-15',
  },
  {
    id: 'post-8',
    boardId: 'board-2',
    title: 'Recurring tasks',
    description: 'Ability to set tasks to repeat daily/weekly/monthly. Essential for sprint planning.',
    authorName: 'Dev T.',
    authorEmail: 'dev@team.io',
    upvotes: 167,
    status: 'in_development',
    tag: 'Feature',
    pinned: false,
    trending: true,
    createdAt: '2025-01-22',
  },
  {
    id: 'post-9',
    boardId: 'board-2',
    title: 'Slack integration',
    description: 'Sync task updates to Slack channels automatically. Would save us from context-switching constantly.',
    authorName: 'Sam P.',
    authorEmail: 'sam@ops.com',
    upvotes: 89,
    status: 'planned',
    tag: 'Integration',
    pinned: false,
    trending: false,
    createdAt: '2025-01-28',
  },
  // Board 3 — InkDesk
  {
    id: 'post-10',
    boardId: 'board-3',
    title: 'PDF export with custom styling',
    description: 'Allow exporting notes as styled PDFs with custom fonts and margins. The current plain text export loses all formatting.',
    authorName: 'Writer A.',
    authorEmail: 'writer@journalism.com',
    upvotes: 55,
    status: 'planned',
    tag: 'Export',
    pinned: false,
    trending: false,
    createdAt: '2025-02-03',
  },
  {
    id: 'post-11',
    boardId: 'board-3',
    title: 'Folder hierarchy for notes',
    description: 'Need nested folders to organize research by project. Flat tag system isn\'t enough for complex projects.',
    authorName: 'Researcher B.',
    authorEmail: 'r@academia.edu',
    upvotes: 44,
    status: 'in_development',
    tag: 'Feature',
    pinned: false,
    trending: false,
    createdAt: '2025-02-07',
  },
]

// ─── PLAN CONFIG ─────────────────────────────────────────────────────────────
export const PLAN_CONFIG = {
  free: {
    label: 'Free',
    maxBoards: 1,
    maxInteractions: 25,
    canCreatePrivate: false,
    features: [
      '1 public feedback board',
      '25 consumer interactions',
      'Unlimited voters',
      'All request types',
      'Public board listing',
    ],
  },
  pro: {
    label: 'Pro',
    maxBoards: Infinity,
    maxInteractions: Infinity,
    canCreatePrivate: true,
    features: [
      'Unlimited boards (public & private)',
      'Unlimited interactions',
      'Custom board domain',
      'Status update notifications',
      'Email capture & CRM export',
      'Priority support',
      'Analytics dashboard',
    ],
  },
}
