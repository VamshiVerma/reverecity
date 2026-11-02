// Refresh the page_facts table: what each statistics page shows, so the assistant answers with the same figures.
// Usage: build the site, serve dist on http://127.0.0.1:4173, then
//   SUPABASE_PAT=<personal access token> node scripts/capture-page-facts.cjs
const { execSync } = require('child_process');
const { chromium } = require(execSync('npm root -g').toString().trim() + '/playwright');
const PAGES = ['demographics', 'economic', 'transportation', 'health', 'education', 'housing'];
(async () => {
  const b = await chromium.launch({ executablePath: '/opt/pw-browsers/chromium', args: ['--no-sandbox', '--no-proxy-server'] });
  const ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  await ctx.route((u) => !u.hostname.startsWith('127.0.0.1'), async (route) => {
    const r = route.request();
    try { const headers = Object.fromEntries(Object.entries(r.headers()).filter(([k]) => !['host','content-length'].includes(k)));
      const res = await fetch(r.url(), { method: r.method(), headers, body: ['GET','HEAD'].includes(r.method()) ? undefined : r.postDataBuffer() });
      const body = Buffer.from(await res.arrayBuffer()); const hh = {}; res.headers.forEach((v,k)=>{ if(!['content-encoding','content-length','transfer-encoding'].includes(k)) hh[k]=v; }); hh['access-control-allow-origin']='*';
      await route.fulfill({ status: res.status, headers: hh, body }); } catch { await route.abort(); } });
  const out = [];
  for (const p of PAGES) {
    const pg = await ctx.newPage();
    await pg.goto(`http://127.0.0.1:4173/${p}`, { waitUntil: 'domcontentloaded' });
    await pg.waitForTimeout(4000);
    // scroll so lazy sections render
    for (let y = 0; y < 12; y++) { await pg.mouse.wheel(0, 1200); await pg.waitForTimeout(500); }
    await pg.waitForTimeout(5000);
    const text = await pg.evaluate(() => {
      const m = document.querySelector('main') || document.body;
      m.querySelectorAll('[role="img"]').forEach((e) => { const l = e.getAttribute('aria-label'); const r = document.createElement('p'); r.textContent = l ? `[Chart: ${l}]` : ''; e.replaceWith(r); });
      m.querySelectorAll('button, nav, svg, script, style, [aria-hidden="true"]').forEach((e) => e.remove());
      return m.innerText.replace(/\n\s*\n+/g, '\n').replace(/[ \t]+/g, ' ').trim();
    });
    out.push({ page: p, text });
    console.log(p, text.length);
    await pg.close();
  }
  await b.close();
  const TITLE = { demographics: 'Who lives here (Census ACS)', economic: 'Jobs and income (Census ACS)', transportation: 'Commuting (Census ACS)', health: 'Health and insurance (Census ACS, CDC PLACES)', education: 'Schools (Massachusetts DESE)', housing: 'Housing costs (Zillow)' };
  const q = (s) => "'" + s.replace(/'/g, "''") + "'";
  let sql = '';
  for (const p of out) {
    // Drop long runs of bare chart numbers; keep the sentences and labelled figures.
    const lines = p.text.split('\n').map((l) => l.trim()).filter(Boolean); const keep = []; let run = 0;
    for (const l of lines) { const num = /^[\$]?[\d,.]+[%K]?$|^\d{4}–\d{2,4}$|^(Class of|FY)\s?\d{4}$/.test(l); run = num ? run + 1 : 0; if (num && run > 2) continue; keep.push(l); }
    if (keep.join('').length < 500) { console.error('skipping', p.page, '(page did not load)'); continue; }
    sql += `insert into public.page_facts (page,title,url,body,captured_at) values (${q(p.page)},${q(TITLE[p.page])},${q('/' + p.page)},${q(keep.join('\n'))},now()) on conflict (page) do update set title=excluded.title,url=excluded.url,body=excluded.body,captured_at=now();\n`;
  }
  const r = await fetch('https://api.supabase.com/v1/projects/ckwiryfnnguarcsgiuws/database/query', { method: 'POST', headers: { Authorization: `Bearer ${process.env.SUPABASE_PAT}`, 'Content-Type': 'application/json' }, body: JSON.stringify({ query: sql }) });
  console.log('upload', r.status);
})();
