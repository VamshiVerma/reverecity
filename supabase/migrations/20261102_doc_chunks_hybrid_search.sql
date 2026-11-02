-- Document knowledge base (budget PDFs etc.) with hybrid vector + full-text search.
-- Embeddings: Supabase built-in gte-small (384 dims), generated inside edge functions.
create extension if not exists vector;

create table if not exists public.doc_chunks (
  id bigserial primary key,
  doc_id text not null,
  doc_title text not null,
  source_url text,
  page int,
  section text,
  content text not null,
  fts tsvector generated always as (to_tsvector('english', coalesce(section,'') || ' ' || content)) stored,
  embedding vector(384),
  created_at timestamptz default now()
);
create index if not exists doc_chunks_doc_idx on public.doc_chunks (doc_id);
create index if not exists doc_chunks_fts_idx on public.doc_chunks using gin (fts);
create index if not exists doc_chunks_emb_idx on public.doc_chunks using hnsw (embedding vector_cosine_ops);

alter table public.doc_chunks enable row level security;
drop policy if exists "public read doc_chunks" on public.doc_chunks;
create policy "public read doc_chunks" on public.doc_chunks for select to public using (true);

-- Reciprocal-rank-fusion of semantic and keyword matches.
create or replace function public.match_doc_chunks(
  query_embedding vector(384),
  query_text text,
  match_count int default 8,
  doc_filter text default null
) returns table (id bigint, doc_id text, doc_title text, source_url text, page int, section text, content text, score float)
language sql stable as $$
  with semantic as (
    select c.id, row_number() over (order by c.embedding <=> query_embedding) as rank
    from public.doc_chunks c
    where c.embedding is not null and (doc_filter is null or c.doc_id = doc_filter)
    order by c.embedding <=> query_embedding
    limit 40
  ),
  keyword as (
    select c.id, row_number() over (order by ts_rank_cd(c.fts, websearch_to_tsquery('english', query_text)) desc) as rank
    from public.doc_chunks c
    where c.fts @@ websearch_to_tsquery('english', query_text)
      and (doc_filter is null or c.doc_id = doc_filter)
    order by ts_rank_cd(c.fts, websearch_to_tsquery('english', query_text)) desc
    limit 40
  ),
  fused as (
    select coalesce(s.id, k.id) as id,
           coalesce(1.0 / (60 + s.rank), 0) + coalesce(1.0 / (60 + k.rank), 0) as score
    from semantic s full outer join keyword k on s.id = k.id
  )
  select c.id, c.doc_id, c.doc_title, c.source_url, c.page, c.section, c.content, f.score
  from fused f join public.doc_chunks c on c.id = f.id
  order by f.score desc
  limit match_count;
$$;
