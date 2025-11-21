-- Create table for storing RAG chat conversations
CREATE TABLE IF NOT EXISTS chat_history (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id TEXT NOT NULL,
  query TEXT NOT NULL,
  response TEXT NOT NULL,
  context JSONB,
  metadata JSONB DEFAULT '{}',
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add index for efficient querying
CREATE INDEX IF NOT EXISTS idx_chat_history_user_id ON chat_history(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_history_timestamp ON chat_history(timestamp);
CREATE INDEX IF NOT EXISTS idx_chat_history_context ON chat_history USING GIN(context);

-- Add RLS policy (if using Row Level Security)
ALTER TABLE chat_history ENABLE ROW LEVEL SECURITY;

-- Allow users to see their own chat history
CREATE POLICY "Users can view own chat history"
  ON chat_history
  FOR SELECT
  TO public
  USING (true); -- For demo purposes, allowing all access

-- Allow inserting new conversations
CREATE POLICY "Users can insert chat history"
  ON chat_history
  FOR INSERT
  TO public
  WITH CHECK (true); -- For demo purposes, allowing all access

-- Create table for storing dynamic knowledge base updates
CREATE TABLE IF NOT EXISTS knowledge_base_updates (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id TEXT NOT NULL,
  content TEXT NOT NULL,
  embeddings TEXT[] DEFAULT '{}',
  source TEXT NOT NULL,
  last_updated TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  is_active BOOLEAN DEFAULT TRUE
);

-- Add index for efficient knowledge base queries
CREATE INDEX IF NOT EXISTS idx_knowledge_base_content_id ON knowledge_base_updates(content_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_source ON knowledge_base_updates(source);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_active ON knowledge_base_updates(is_active);

-- Enable RLS for knowledge base
ALTER TABLE knowledge_base_updates ENABLE ROW LEVEL SECURITY;

-- Allow reading knowledge base
CREATE POLICY "Allow reading knowledge base"
  ON knowledge_base_updates
  FOR SELECT
  TO public
  USING (is_active = TRUE);

-- Allow updating knowledge base (for admin or system updates)
CREATE POLICY "Allow knowledge base updates"
  ON knowledge_base_updates
  FOR ALL
  TO public
  USING (true) -- For demo purposes
  WITH CHECK (true);

-- Create function to update knowledge base timestamp
CREATE OR REPLACE FUNCTION update_knowledge_base_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.last_updated = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger to automatically update timestamp
CREATE TRIGGER update_knowledge_base_timestamp_trigger
  BEFORE UPDATE ON knowledge_base_updates
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_base_timestamp();