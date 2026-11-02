// Embeds document chunks with Supabase's built-in gte-small model and stores them
// in public.doc_chunks. Protected by the INGEST_TOKEN secret (x-ingest-token header).
// Body: { chunks: [{doc_id, doc_title, source_url, page, section, content}], replace_doc?: string }
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// deno-lint-ignore no-explicit-any
const session = new (globalThis as any).Supabase.ai.Session("gte-small");

Deno.serve(async (req) => {
  const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { "Content-Type": "application/json" } });
  if (req.headers.get("x-ingest-token") !== Deno.env.get("INGEST_TOKEN")) return json({ error: "unauthorized" }, 401);
  try {
    const { chunks = [], replace_doc } = await req.json();
    const supabase = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
    if (replace_doc) await supabase.from("doc_chunks").delete().eq("doc_id", replace_doc);
    const rows = [];
    for (const c of chunks) {
      const embedding = await session.run(`${c.doc_title} — ${c.section ?? ""}\n${c.content}`, { mean_pool: true, normalize: true });
      rows.push({ ...c, embedding: Array.from(embedding as number[]) });
    }
    if (rows.length) {
      const { error } = await supabase.from("doc_chunks").insert(rows);
      if (error) throw error;
    }
    return json({ inserted: rows.length });
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : String(e) }, 500);
  }
});
