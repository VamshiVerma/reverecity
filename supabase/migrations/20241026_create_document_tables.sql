-- Create table for storing processed documents
CREATE TABLE IF NOT EXISTS processed_documents (
  id TEXT PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  total_chunks INTEGER NOT NULL,
  uploaded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  chunks JSONB NOT NULL,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_processed_documents_file_name ON processed_documents(file_name);
CREATE INDEX IF NOT EXISTS idx_processed_documents_file_type ON processed_documents(file_type);
CREATE INDEX IF NOT EXISTS idx_processed_documents_uploaded_at ON processed_documents(uploaded_at);
CREATE INDEX IF NOT EXISTS idx_processed_documents_chunks ON processed_documents USING GIN(chunks);

-- Create table for storing document chunks separately (for better performance)
CREATE TABLE IF NOT EXISTS document_chunks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL,
  chunk_index INTEGER NOT NULL,
  content TEXT NOT NULL,
  embeddings VECTOR(100), -- Using pgvector for embeddings (if available)
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),

  FOREIGN KEY (document_id) REFERENCES processed_documents(id) ON DELETE CASCADE
);

-- Add indexes for document chunks
CREATE INDEX IF NOT EXISTS idx_document_chunks_document_id ON document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_document_chunks_chunk_index ON document_chunks(chunk_index);
CREATE INDEX IF NOT EXISTS idx_document_chunks_content ON document_chunks USING GIN(to_tsvector('english', content));

-- If pgvector is available, create index for similarity search
-- CREATE INDEX IF NOT EXISTS idx_document_chunks_embeddings ON document_chunks USING ivfflat (embeddings vector_cosine_ops);

-- Enable RLS for documents
ALTER TABLE processed_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE document_chunks ENABLE ROW LEVEL SECURITY;

-- Allow users to manage their own documents
CREATE POLICY "Users can manage their documents"
  ON processed_documents
  FOR ALL
  TO public
  USING (true) -- For demo purposes, allowing all access
  WITH CHECK (true);

CREATE POLICY "Users can manage their document chunks"
  ON document_chunks
  FOR ALL
  TO public
  USING (true) -- For demo purposes, allowing all access
  WITH CHECK (true);

-- Create function to search document chunks
CREATE OR REPLACE FUNCTION search_document_chunks(
  query_text TEXT,
  limit_count INTEGER DEFAULT 5
)
RETURNS TABLE (
  chunk_id TEXT,
  document_id TEXT,
  file_name TEXT,
  content TEXT,
  chunk_index INTEGER,
  relevance_score REAL
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    dc.id as chunk_id,
    dc.document_id,
    pd.file_name,
    dc.content,
    dc.chunk_index,
    ts_rank(to_tsvector('english', dc.content), plainto_tsquery('english', query_text)) as relevance_score
  FROM document_chunks dc
  JOIN processed_documents pd ON dc.document_id = pd.id
  WHERE to_tsvector('english', dc.content) @@ plainto_tsquery('english', query_text)
  ORDER BY relevance_score DESC
  LIMIT limit_count;
END;
$$;

-- Create function to get document statistics
CREATE OR REPLACE FUNCTION get_document_stats()
RETURNS TABLE (
  total_documents BIGINT,
  total_chunks BIGINT,
  file_types JSONB
)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  SELECT
    COUNT(*)::BIGINT as total_documents,
    (SELECT COUNT(*) FROM document_chunks)::BIGINT as total_chunks,
    jsonb_object_agg(file_type, type_count) as file_types
  FROM (
    SELECT file_type, COUNT(*) as type_count
    FROM processed_documents
    GROUP BY file_type
  ) type_counts,
  processed_documents;
END;
$$;

-- Create trigger to update document chunk count
CREATE OR REPLACE FUNCTION update_document_chunk_count()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    UPDATE processed_documents
    SET total_chunks = (
      SELECT COUNT(*) FROM document_chunks WHERE document_id = NEW.document_id
    )
    WHERE id = NEW.document_id;
    RETURN NEW;
  ELSIF TG_OP = 'DELETE' THEN
    UPDATE processed_documents
    SET total_chunks = (
      SELECT COUNT(*) FROM document_chunks WHERE document_id = OLD.document_id
    )
    WHERE id = OLD.document_id;
    RETURN OLD;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_chunk_count_trigger
  AFTER INSERT OR DELETE ON document_chunks
  FOR EACH ROW
  EXECUTE FUNCTION update_document_chunk_count();