-- What each statistics page on the site shows, as plain text, so the assistant answers with the same
-- figures residents see (Census ACS, DESE, CDC PLACES, Zillow). Refreshed by capturing the rendered pages.
create table if not exists public.page_facts (
  page text primary key,
  title text not null,
  url text not null,
  body text not null,
  captured_at timestamptz not null default now()
);
alter table public.page_facts enable row level security;
drop policy if exists "page_facts are public" on public.page_facts;
create policy "page_facts are public" on public.page_facts for select using (true);
