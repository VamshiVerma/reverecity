import { readFileSync } from 'fs';
import { RecursiveCharacterTextSplitter } from '@langchain/textsplitters';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import fetch from 'node-fetch';

// @ts-ignore
globalThis.fetch = fetch;

dotenv.config();

const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY || 'AIzaSyDjm7WuesLoSLJlZ3wEU9Vmm-wKBq7GUkg';
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://kacadimifbgdqeegpcyx.supabase.co';
const SUPABASE_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImthY2FkaW1pZmJnZHFlZWdwY3l4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Mjc2NzA2NTIsImV4cCI6MjA0MzI0NjY1Mn0.xaNjLjhC9aeKYxLOcfLVkFdq0jAX0NJRhCJw8hPNVWY';

const BUDGET_FILE = 'C:\\Users\\Shruthi\\Downloads\\revere-city-insights-main\\FY2025-Budget.md';

async function embedBudgetDocument() {
  console.log('🚀 Starting budget document embedding process...\n');

  // Initialize Supabase client
  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

  // Initialize Gemini for embeddings
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

  // Read budget document
  console.log('📄 Reading budget document...');
  const budgetText = readFileSync(BUDGET_FILE, 'utf-8');
  console.log(`✓ Loaded ${budgetText.length.toLocaleString()} characters\n`);

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
          embedding: embedding,
        });

        // Small delay between API calls
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // Insert into Supabase
      const { error } = await supabase
        .from('budget_chunks')
        .insert(records);

      if (error) {
        console.error(`❌ Error inserting batch ${i / batchSize + 1}:`, error.message);
        errors++;
      } else {
        processed += batch.length;
        const progress = ((processed / chunks.length) * 100).toFixed(1);
        console.log(`✓ Progress: ${processed}/${chunks.length} chunks (${progress}%)`);
      }

    } catch (error) {
      console.error(`❌ Error processing batch ${i / batchSize + 1}:`, error);
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
}

embedBudgetDocument().catch(console.error);
