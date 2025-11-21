import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { budgetVectorService } from '@/services/budgetVectorService';
import { langchainService } from '@/services/langchainService';
import { supabase } from '@/integrations/supabase/client';

export default function TestVectorSearch() {
  const [question, setQuestion] = useState('What is the police department budget?');
  const [results, setResults] = useState<any[]>([]);
  const [answer, setAnswer] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [dbCount, setDbCount] = useState<number | null>(null);
  const [error, setError] = useState<string>('');

  const checkDatabase = async () => {
    const { count, error } = await supabase
      .from('budget_chunks')
      .select('*', { count: 'exact', head: true });

    if (error) {
      setError(`DB Error: ${error.message}`);
    } else {
      setDbCount(count);
    }
  };

  const testSearch = async () => {
    setLoading(true);
    setError('');
    setResults([]);
    setAnswer('');

    try {
      // Step 1: Vector search
      const result = await budgetVectorService.searchBudgetChunks(question, 5, 0.3);
      setResults(result);

      if (result.length === 0) {
        setError('No results found. Try lower threshold...');
        const result2 = await budgetVectorService.searchBudgetChunks(question, 5, 0.0);
        setResults(result2);
      }

      // Step 2: Generate answer using LangChain with the chunks
      const llmResponse = await langchainService.generateResponse(question);
      setAnswer(llmResponse.content);

    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-6 max-w-6xl">
      <Card>
        <CardHeader>
          <CardTitle>Vector Search Test</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <Button onClick={checkDatabase} variant="outline">
              Check Database
            </Button>
            {dbCount !== null && (
              <div className="flex items-center px-3 py-2 bg-green-100 text-green-800 rounded">
                ✓ {dbCount} chunks in database
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Input
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder="Enter your question..."
            />
            <Button onClick={testSearch} disabled={loading} className="w-full">
              {loading ? 'Searching...' : 'Test Vector Search'}
            </Button>
          </div>

          {error && (
            <div className="p-4 bg-red-100 text-red-800 rounded">
              {error}
            </div>
          )}

          {answer && (
            <Card className="bg-blue-50">
              <CardHeader>
                <CardTitle>🤖 AI Answer</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="whitespace-pre-wrap">{answer}</p>
              </CardContent>
            </Card>
          )}

          {results.length > 0 && (
            <div className="space-y-4">
              <h3 className="font-semibold">📚 Vector Search Results ({results.length} chunks):</h3>
              {results.map((result, i) => (
                <Card key={i}>
                  <CardHeader>
                    <CardTitle className="text-sm">
                      Result {i + 1} - Similarity: {(result.similarity * 100).toFixed(1)}%
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{result.content}</p>
                    <div className="mt-2 text-xs text-muted-foreground">
                      Chunk #{result.metadata?.chunk_index} | {result.metadata?.char_count} chars
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
