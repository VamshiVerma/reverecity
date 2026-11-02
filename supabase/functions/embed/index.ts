// Returns gte-small embeddings for a few texts. Token-protected; used to seed intent exemplars.
// deno-lint-ignore no-explicit-any
const session = new (globalThis as any).Supabase.ai.Session("gte-small");
Deno.serve(async (req) => {
  if (req.headers.get("x-ingest-token") !== Deno.env.get("INGEST_TOKEN")) return new Response("forbidden", { status: 403 });
  const { texts } = await req.json();
  if (!Array.isArray(texts) || texts.length > 4) return Response.json({ error: "1-4 texts" }, { status: 400 });
  const out = [];
  for (const t of texts) out.push(Array.from(await session.run(String(t).slice(0, 500), { mean_pool: true, normalize: true }) as number[]));
  return Response.json({ embeddings: out });
});
