create table if not exists public.housing_market (
  zip text not null,
  place text not null,
  metric text not null check (metric in ('zhvi','zori')),
  month date not null,
  value integer not null,
  source text not null default 'Zillow Research',
  primary key (zip, metric, month)
);
alter table public.housing_market enable row level security;
drop policy if exists "public read housing_market" on public.housing_market;
create policy "public read housing_market" on public.housing_market for select using (true);
