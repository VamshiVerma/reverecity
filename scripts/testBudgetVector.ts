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

async function testVectorSearch() {
  console.log('🧪 Testing Budget Vector Search\n');

  const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);
  const genAI = new GoogleGenerativeAI(GEMINI_API_KEY);

  // Test 1: Check if embeddings exist
  console.log('📊 Test 1: Checking database...');
  const { count, error: countError } = await supabase
    .from('budget_chunks')
    .select('*', { count: 'exact', head: true });

  if (countError) {
    console.error('❌ Database error:', countError);
    return;
  }

  console.log(`✓ Found ${count} chunks in database\n`);

  if (!count || count === 0) {
    console.error('❌ No embeddings found! Run embedding script first.');
    return;
  }

  // Test 2: Generate query embedding
  console.log('🔍 Test 2: Generating query embedding...');
  const question = 'What is the police department budget?';
  console.log(`Question: "${question}"`);

  const model = genAI.getGenerativeModel({ model: 'text-embedding-004' });
  const result = await model.embedContent(question);
  const queryEmbedding = Array.from(result.embedding.values);

  console.log(`✓ Generated embedding with ${queryEmbedding.length} dimensions\n`);

  // Test 3: Direct RPC call
  console.log('🎯 Test 3: Testing vector search RPC...');
  const { data, error } = await supabase.rpc('match_budget_chunks', {
    query_embedding: queryEmbedding,
    match_threshold: 0.3,
    match_count: 5,
  });

  if (error) {
    console.error('❌ RPC Error:', error);
    return;
  }

  console.log(`✓ Found ${data?.length || 0} matching chunks\n`);

  if (!data || data.length === 0) {
    console.log('⚠️  No matches found. Trying with lower threshold...\n');

    const { data: data2, error: error2 } = await supabase.rpc('match_budget_chunks', {
      query_embedding: queryEmbedding,
      match_threshold: 0.0,
      match_count: 5,
    });

    if (error2) {
      console.error('❌ RPC Error:', error2);
      return;
    }

    console.log(`✓ Found ${data2?.length || 0} chunks with threshold 0.0\n`);

    if (data2 && data2.length > 0) {
      console.log('📝 Top results:');
      data2.slice(0, 3).forEach((chunk: any, i: number) => {
        console.log(`\n[${i + 1}] Similarity: ${(chunk.similarity * 100).toFixed(1)}%`);
        console.log(`Content preview: ${chunk.content.substring(0, 200)}...`);
      });
    }
  } else {
    console.log('📝 Top results:');
    data.slice(0, 3).forEach((chunk: any, i: number) => {
      console.log(`\n[${i + 1}] Similarity: ${(chunk.similarity * 100).toFixed(1)}%`);
      console.log(`Content preview: ${chunk.content.substring(0, 200)}...`);
    });
  }

  console.log('\n✅ Vector search test complete!');
}

testVectorSearch().catch(console.error);
