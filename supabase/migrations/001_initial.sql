-- ═══════════════════════════════════════════════════════════════════════════
-- feedio — initial schema
-- Run this in Supabase Dashboard → SQL Editor
-- ═══════════════════════════════════════════════════════════════════════════

-- ─── EXTENSIONS ─────────────────────────────────────────────────────────────
create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ─── PROFILES ────────────────────────────────────────────────────────────────
-- One row per auth.users entry. Created automatically via trigger on signup.
create table public.profiles (
  id                     uuid primary key references auth.users(id) on delete cascade,
  name                   text not null default '',
  avatar_initials        text not null default '??',
  avatar_color           text not null default '#CCFBF1',
  plan                   text not null default 'free'
                           check (plan in ('free', 'pro')),
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- Auto-update updated_at
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute procedure public.set_updated_at();

-- Auto-create profile row when a user signs up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  _name text;
  _initials text;
begin
  -- Pull name from raw_user_meta_data (we pass it during signup)
  _name := coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1));
  _initials := upper(left(_name, 1) || coalesce(split_part(_name, ' ', 2), '')[1:1]);

  insert into public.profiles (id, name, avatar_initials)
  values (new.id, _name, left(upper(_name), 2));

  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- ─── BOARDS ──────────────────────────────────────────────────────────────────
create table public.boards (
  id                   uuid primary key default gen_random_uuid(),
  slug                 text unique not null,
  name                 text not null,
  tagline              text not null default '',
  description          text not null default '',
  website              text not null default '',
  accent_color         text not null default '#14B8A6',
  header_gradient      text not null default 'from-teal-600 to-emerald-500',
  visibility           text not null default 'public'
                         check (visibility in ('public', 'private')),
  owner_id             uuid not null references auth.users(id) on delete cascade,
  -- owner's display info (denormalised for perf)
  owner_name           text not null default '',
  owner_avatar_initials text not null default '??',
  owner_avatar_color   text not null default '#CCFBF1',
  tags                 text[] not null default array['Feature', 'Bug', 'Other'],
  settings             jsonb not null default '{
    "requireName":    true,
    "requireEmail":   false,
    "allowAnonymous": false,
    "showVoterCount": true
  }'::jsonb,
  total_interactions   integer not null default 0,
  created_at           timestamptz not null default now()
);

-- Index for slug lookups
create index boards_slug_idx   on public.boards (slug);
create index boards_owner_idx  on public.boards (owner_id);
create index boards_vis_idx    on public.boards (visibility);

-- ─── POSTS ───────────────────────────────────────────────────────────────────
create table public.posts (
  id           uuid primary key default gen_random_uuid(),
  board_id     uuid not null references public.boards(id) on delete cascade,
  title        text not null,
  description  text not null default '',
  author_name  text not null default 'Anonymous',
  author_email text not null default '',
  upvotes      integer not null default 0,
  status       text not null default 'open'
                 check (status in ('open','planned','in_development','coming_soon','live','considering','declined')),
  tag          text not null default 'Feature',
  pinned       boolean not null default false,
  trending     boolean not null default false,
  created_at   timestamptz not null default now()
);

create index posts_board_idx  on public.posts (board_id);
create index posts_status_idx on public.posts (status);

-- ─── UPVOTES ─────────────────────────────────────────────────────────────────
-- Tracks which browser fingerprint voted on which post.
-- Using a fingerprint (stored in localStorage) lets anonymous users vote
-- without requiring an account.
create table public.upvotes (
  id          uuid primary key default gen_random_uuid(),
  post_id     uuid not null references public.posts(id) on delete cascade,
  board_id    uuid not null references public.boards(id) on delete cascade,
  fingerprint text not null,  -- anonymous browser id from localStorage
  created_at  timestamptz not null default now(),
  unique (post_id, fingerprint)
);

create index upvotes_post_idx        on public.upvotes (post_id);
create index upvotes_fingerprint_idx on public.upvotes (fingerprint);

-- ─── RLS — ROW LEVEL SECURITY ────────────────────────────────────────────────
alter table public.profiles enable row level security;
alter table public.boards   enable row level security;
alter table public.posts    enable row level security;
alter table public.upvotes  enable row level security;

-- PROFILES
create policy "Anyone can read profiles"
  on public.profiles for select using (true);

create policy "Users can update their own profile"
  on public.profiles for update using (auth.uid() = id);

-- BOARDS — public boards are readable by anyone; private only by owner
create policy "Public boards are readable by anyone"
  on public.boards for select
  using (visibility = 'public' or owner_id = auth.uid());

create policy "Owners can insert boards"
  on public.boards for insert
  with check (auth.uid() = owner_id);

create policy "Owners can update their boards"
  on public.boards for update
  using (auth.uid() = owner_id);

create policy "Owners can delete their boards"
  on public.boards for delete
  using (auth.uid() = owner_id);

-- POSTS — readable if the parent board is readable
create policy "Posts are readable when board is readable"
  on public.posts for select
  using (
    exists (
      select 1 from public.boards b
      where b.id = board_id
        and (b.visibility = 'public' or b.owner_id = auth.uid())
    )
  );

create policy "Anyone can insert posts on accessible boards"
  on public.posts for insert
  with check (
    exists (
      select 1 from public.boards b
      where b.id = board_id
        and (b.visibility = 'public' or b.owner_id = auth.uid())
    )
  );

create policy "Board owners can update posts"
  on public.posts for update
  using (
    exists (
      select 1 from public.boards b
      where b.id = board_id and b.owner_id = auth.uid()
    )
  );

create policy "Board owners can delete posts"
  on public.posts for delete
  using (
    exists (
      select 1 from public.boards b
      where b.id = board_id and b.owner_id = auth.uid()
    )
  );

-- UPVOTES — anyone can read/insert/delete their own fingerprint's votes
create policy "Upvotes are readable"
  on public.upvotes for select using (true);

create policy "Anyone can upvote"
  on public.upvotes for insert
  with check (true);

create policy "Anyone can remove their own upvote"
  on public.upvotes for delete
  using (true);

-- ─── HELPER FUNCTIONS ────────────────────────────────────────────────────────

-- Called by the app after a successful Stripe payment to upgrade a user's plan.
-- This is also called by the stripe-webhook edge function.
create or replace function public.upgrade_user_to_pro(
  p_user_id              uuid,
  p_stripe_customer_id   text,
  p_stripe_subscription_id text
)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
  set
    plan                   = 'pro',
    stripe_customer_id     = p_stripe_customer_id,
    stripe_subscription_id = p_stripe_subscription_id,
    updated_at             = now()
  where id = p_user_id;
end;
$$;

-- Called when a Stripe subscription is cancelled / payment fails.
create or replace function public.downgrade_user_to_free(p_stripe_subscription_id text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.profiles
  set plan = 'free', updated_at = now()
  where stripe_subscription_id = p_stripe_subscription_id;
end;
$$;
