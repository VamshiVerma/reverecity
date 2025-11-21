-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Create budget_chunks table for vector embeddings
CREATE TABLE IF NOT EXISTS public.budget_chunks (
  id BIGSERIAL PRIMARY KEY,
  content TEXT NOT NULL,
  metadata JSONB,
  embedding vector(768),  -- Gemini text-embedding-004 produces 768-dimensional vectors
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Create index for vector similarity search
CREATE INDEX IF NOT EXISTS budget_chunks_embedding_idx ON public.budget_chunks
USING ivfflat (embedding vector_cosine_ops)
WITH (lists = 100);

-- Create index on metadata for filtering
CREATE INDEX IF NOT EXISTS budget_chunks_metadata_idx ON public.budget_chunks USING gin(metadata);

-- Enable RLS
ALTER TABLE public.budget_chunks ENABLE ROW LEVEL SECURITY;

-- Allow public read access
CREATE POLICY "Allow public read access to budget chunks"
  ON public.budget_chunks FOR SELECT TO public USING (true);

-- Allow public insert access (for initial data loading)
CREATE POLICY "Allow public insert access to budget chunks"
  ON public.budget_chunks FOR INSERT TO public WITH CHECK (true);

-- Create function for similarity search
CREATE OR REPLACE FUNCTION match_budget_chunks(
  query_embedding vector(768),
  match_threshold float DEFAULT 0.5,
  match_count int DEFAULT 5
)
RETURNS TABLE (
  id bigint,
  content text,
  metadata jsonb,
  similarity float
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    budget_chunks.id,
    budget_chunks.content,
    budget_chunks.metadata,
    1 - (budget_chunks.embedding <=> query_embedding) AS similarity
  FROM budget_chunks
  WHERE 1 - (budget_chunks.embedding <=> query_embedding) > match_threshold
  ORDER BY budget_chunks.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Add helpful comment
COMMENT ON TABLE public.budget_chunks IS 'Stores budget document chunks with vector embeddings for semantic search';
COMMENT ON FUNCTION match_budget_chunks IS 'Finds similar budget chunks based on vector similarity';
