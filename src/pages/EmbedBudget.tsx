import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/integrations/supabase/client';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || 'AIzaSyDjm7WuesLoSLJlZ3wEU9Vmm-wKBq7GUkg';
const BUDGET_TEXT_URL = '/FY2025-Budget.md'; // Place budget file in public folder

export default function EmbedBudget() {
  const [status, setStatus] = useState<string>('Ready');
  const [progress, setProgress] = useState<number>(0);
  const [logs, setLogs] = useState<string[]>([]);
  const [isRunning, setIsRunning] = useState(false);

  const addLog = (message: string) => {
    setLogs(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  const clearDatabase = async () => {
    if (!confirm('Delete ALL existing budget embeddings? This cannot be undone.')) return;

    setLogs([]);
    addLog('🗑️ Clearing database...');

    const { error } = await supabase
      .from('budget_chunks')
      .delete()
      .neq('id', 0); // Delete all rows

    if (error) {
      addLog(`❌ Error: ${error.message}`);
    } else {
      addLog('✓ Database cleared successfully');
      const { count } = await supabase
        .from('budget_chunks')
        .select('*', { count: 'exact', head: true });
      addLog(`💾 Remaining chunks: ${count || 0}`);
    }
  };

  const embedBudget = async () => {
    setIsRunning(true);
    setProgress(0);
    setLogs([]);

    try {
      addLog('🚀 Starting budget embedding...');
      setStatus('Loading budget document...');

      // Fetch budget text
      const response = await fetch(BUDGET_TEXT_URL);
      const budgetText = await response.text();
      addLog(`✓ Loaded ${budgetText.length.toLocaleString()} characters`);

      // Initialize
      const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);
      const splitter = new RecursiveCharacterTextSplitter({
        chunkSize: 800,
        chunkOverlap: 200,
        separators: ['\n\n', '\n', '. ', ' ', ''],
      });

      // Split into chunks
      setStatus('Splitting document...');
      const chunks = await splitter.createDocuments([budgetText]);
      addLog(`✓ Created ${chunks.length} chunks`);

      // Process in batches
      const batchSize = 10;
      let processed = 0;
      let errors = 0;

      setStatus('Generating embeddings...');

      for (let i = 0; i < chunks.length; i += batchSize) {
        const batch = chunks.slice(i, i + batchSize);

        try {
          const records = [];

          for (let j = 0; j < batch.length; j++) {
            const chunk = batch[j];
            const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
            const result = await model.embedContent(chunk.pageContent);
            const embedding = result.embedding.values;

            records.push({
              content: chunk.pageContent,
              metadata: {
                chunk_index: i + j,
                char_count: chunk.pageContent.length,
                source: 'FY2025-Budget.md',
                fiscal_year: 'FY2025',
              },
              embedding: Array.from(embedding),
            });

            await new Promise(resolve => setTimeout(resolve, 100));
          }

          // Insert batch
          const { error } = await supabase
            .from('budget_chunks')
            .insert(records);

          if (error) {
            addLog(`❌ Error batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
            errors++;
          } else {
            processed += batch.length;
            const pct = (processed / chunks.length) * 100;
            setProgress(pct);
            addLog(`✓ Progress: ${processed}/${chunks.length} (${pct.toFixed(1)}%)`);
          }

        } catch (error: any) {
          addLog(`❌ Error batch ${Math.floor(i / batchSize) + 1}: ${error.message}`);
          errors++;
        }
      }

      // Verify
      const { count } = await supabase
        .from('budget_chunks')
        .select('*', { count: 'exact', head: true });

      setStatus('Complete!');
      addLog(`\n✅ Embedding complete!`);
      addLog(`📊 Total chunks: ${chunks.length}`);
      addLog(`✓ Processed: ${processed}`);
      addLog(`❌ Errors: ${errors}`);
      addLog(`💾 Database total: ${count}`);

    } catch (error: any) {
      addLog(`❌ Fatal error: ${error.message}`);
      setStatus('Failed');
    } finally {
      setIsRunning(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-4xl">
      <Card>
        <CardHeader>
          <CardTitle>Budget Document Embedding</CardTitle>
          <CardDescription>
            Generate and store vector embeddings for FY2025 budget document
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Status: {status}</span>
              <span className="text-sm text-muted-foreground">{progress.toFixed(1)}%</span>
            </div>
            <Progress value={progress} />
          </div>

          <div className="flex gap-2">
            <Button
              onClick={clearDatabase}
              disabled={isRunning}
              variant="destructive"
              className="flex-1"
            >
              Clear Database
            </Button>
            <Button
              onClick={embedBudget}
              disabled={isRunning}
              className="flex-1"
            >
              {isRunning ? 'Processing...' : 'Start Embedding'}
            </Button>
          </div>

          <div className="border rounded-lg p-4 h-96 overflow-y-auto bg-muted/50 font-mono text-xs">
            {logs.length === 0 ? (
              <p className="text-muted-foreground">Click "Start Embedding" to begin...</p>
            ) : (
              logs.map((log, i) => (
                <div key={i} className="mb-1">{log}</div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
