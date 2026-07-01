// Browser-based budget embedding script
// Run this from the browser console when app is running

import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from '@/integrations/supabase/client';

const GEMINI_API_KEY = import.meta.env.VITE_GEMINI_API_KEY || '';

export async function embedBudgetDocument(budgetText: string) {
  console.log('🚀 Starting budget document embedding process...\n');

  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

  console.log(`📄 Budget text length: ${budgetText.length.toLocaleString()} characters\n`);

  // Initialize text splitter
  const splitter = new RecursiveCharacterTextSplitter({
    chunkSize: 800,
    chunkOverlap: 200,
    separators: ['\n\n', '\n', '. ', ' ', ''],
  });

  // Split document into chunks
  console.log('✂️  Splitting document into chunks...');
  const chunks = await splitter.createDocuments([budgetText]);
  console.log(`✓ Created ${chunks.length} chunks\n`);

  // Process chunks in batches
  const batchSize = 10;
  let processed = 0;
  let errors = 0;

  console.log('🧮 Generating embeddings and storing in database...\n');

  for (let i = 0; i < chunks.length; i += batchSize) {
    const batch = chunks.slice(i, i + batchSize);

    try {
      // Generate embeddings for each chunk in batch
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

        // Small delay between API calls
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Insert into Supabase
      const { error } = await supabase
        .from('budget_chunks')
        .insert(records);

      if (error) {
        console.error(`❌ Error inserting batch ${Math.floor(i / batchSize) + 1}:`, error.message);
        errors++;
      } else {
        processed += batch.length;
        const progress = ((processed / chunks.length) * 100).toFixed(1);
        console.log(`✓ Progress: ${processed}/${chunks.length} chunks (${progress}%)`);
      }

    } catch (error) {
      console.error(`❌ Error processing batch ${Math.floor(i / batchSize) + 1}:`, error);
      errors++;
    }
  }

  console.log('\n✅ Budget embedding complete!');
  console.log(`📊 Total chunks: ${chunks.length}`);
  console.log(`✓ Successfully processed: ${processed}`);
  console.log(`❌ Errors: ${errors}`);

  // Verify storage
  const { count } = await supabase
    .from('budget_chunks')
    .select('*', { count: 'exact', head: true });

  console.log(`\n💾 Total chunks in database: ${count}`);

  return { chunks: chunks.length, processed, errors, total: count };
}

// Make it available globally for console access
(window as any).embedBudgetDocument = embedBudgetDocument;

console.log('💡 To embed budget document:');
console.log('1. Fetch budget text from file or paste it');
console.log('2. Run: await embedBudgetDocument(budgetText)');
