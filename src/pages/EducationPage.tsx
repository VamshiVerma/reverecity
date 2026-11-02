import { useMemo, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import DashboardLayout from "@/components/DashboardLayout";
import { AskButton, ErrorNote, Figure, Legend, LineChart, PairBars, Panel, Section, SourceLink } from "@/components/education/blocks";
import { DATASETS, DISTRICT, STATE, datasetUrl, num, pct, schoolYear, useSchoolsData } from "@/components/education/dese";
import { cn } from "@/lib/utils";

const BUDGET_PDF = "https://files.aptuitivcdn.com/GB7r14nbKy-1182/docs/FY2027-Budget-Adopted.pdf#page=172";
// From the City of Revere FY2027 adopted budget, School Department appropriation (page 172).
const BUDGET = { fy27: 132_944_577, fy26: 131_567_036 };

const BLUE = "hsl(var(--brand))";
const GREY = "hsl(var(--muted-foreground) / 0.55)";
const n0 = (n: number) => Math.round(n).toLocaleString("en-US");
const usd = (n: number) => `$${n0(n)}`;
const yy = (sy: string) => `’${sy.slice(2)}`;
const ratio = (s?: string) => num(s?.match(/^[\d.]+/)?.[0]);
const SCHOOL_NAMES: Record<string, string> = { "Revere High": "Revere High School", "Abraham Lincoln": "Abraham Lincoln School", "Paul Revere": "Paul Revere School" };
const range = (a: number, b: number) => Array.from({ length: b - a + 1 }, (_, i) => String(a + i));
const unavailable = <ErrorNote>DESE's data portal didn't answer just now, so this section can't be shown. Try again in a minute.</ErrorNote>;

export default function EducationPage() {
  const d = useSchoolsData();
  const reduce = useReducedMotion();
  const [subject, setSubject] = useState<"ELA" | "MATH">("ELA");

  // Enrollment and selected populations
  const enr = useMemo(() => {
    const rows = d.enrollment.data; if (!rows) return null;
    const rev = rows.filter((r) => r.org_code === DISTRICT && num(r.total_cnt) != null);
    const st = new Map(rows.filter((r) => r.org_code === STATE).map((r) => [r.sy!, r]));
    const last = rev[rev.length - 1], prev = rev[rev.length - 2];
    const sinceYear = Number(last.sy) - 20;
    const trend = rev.filter((r) => Number(r.sy) >= sinceYear).map((r) => ({ sy: r.sy!, n: num(r.total_cnt)! }));
    const peak = trend.reduce((a, b) => (b.n > a.n ? b : a));
    const s = st.get(last.sy!);
    const tenAgo = rev.find((r) => Number(r.sy) === Number(last.sy) - 10);
    return {
      last, prev, trend, peak, state: s, tenAgo,
      total: num(last.total_cnt)!, change: num(last.total_cnt)! - num(prev.total_cnt)!,
      elTrend: { xs: trend.map((t) => t.sy), rev: trend.map((t) => num(rev.find((r) => r.sy === t.sy)?.el_pct)), st: trend.map((t) => num(st.get(t.sy)?.el_pct)) },
    };
  }, [d.enrollment.data]);

  // Teachers and class size
  const staff = useMemo(() => {
    const rows = d.teachers.data; if (!rows) return null;
    const years = [...new Set(rows.map((r) => r.sy!))].sort();
    const L = years[years.length - 1], P = years[years.length - 2];
    const get = (sy: string, org: string) => rows.find((r) => r.sy === sy && r.org_code === org);
    const dist = get(L, DISTRICT), distPrev = P ? get(P, DISTRICT) : undefined, st = get(L, STATE);
    const schools = new Map(rows.filter((r) => r.sy === L && r.org_type === "School").map((r) => [r.org_code!, ratio(r.stu_tchr_ratio)]));
    return { L, ratio: ratio(dist?.stu_tchr_ratio), stRatio: ratio(st?.stu_tchr_ratio), teachers: num(dist?.tchr_cnt), teachersPrev: num(distPrev?.tchr_cnt), schools };
  }, [d.teachers.data]);
  const cls = useMemo(() => {
    const rows = d.classSize.data; if (!rows?.length) return null;
    const L = rows[rows.length - 1].sy!;
    const g = (org: string) => num(rows.find((r) => r.sy === L && r.org_code === org)?.avg_clss_cnt);
    return { L, rev: g(DISTRICT), st: g(STATE) };
  }, [d.classSize.data]);

  // Spending
  const spend = useMemo(() => {
    const rows = d.spending.data; if (!rows?.length) return null;
    const t = rows.map((r) => ({ sy: r.sy!, n: num(r.tot_exp_per_pupil)! })).filter((r) => r.n);
    return { trend: t, last: t[t.length - 1], first: t[0] };
  }, [d.spending.data]);

  // Graduation
  const grad = useMemo(() => {
    const rows = d.graduation.data; if (!rows?.length) return null;
    const all = rows.filter((r) => r.stu_grp === "All Students");
    const years = [...new Set(all.map((r) => r.sy!))].sort();
    const v = (sy: string, org: string, grp = "All Students") => num(rows.find((r) => r.sy === sy && r.org_code === org && r.stu_grp === grp)?.grad_pct);
    const L = years[years.length - 1];
    const drop = num(rows.find((r) => r.sy === L && r.org_code === DISTRICT && r.stu_grp === "All Students")?.drpout_pct);
    const cohort = num(rows.find((r) => r.sy === L && r.org_code === DISTRICT && r.stu_grp === "All Students")?.cohort_cnt);
    const groups = ["All Students", "High Needs", "Low Income", "English Learners", "Students with Disabilities"].map((g) => ({
      label: g === "All Students" ? "All students" : g === "High Needs" ? "High needs" : g === "Low Income" ? "Low income" : g === "English Learners" ? "English learners" : "Students with disabilities",
      a: v(L, DISTRICT, g), b: v(L, STATE, g),
    }));
    const tenAgo = String(Number(L) - 10);
    return { years, L, rev: years.map((y) => v(y, DISTRICT)), st: years.map((y) => v(y, STATE)), drop, cohort, groups, tenAgo, revTenAgo: v(tenAgo, DISTRICT) };
  }, [d.graduation.data]);

  // MCAS
  const mcas = useMemo(() => {
    const rows = d.mcas.data; if (!rows?.length) return null;
    const ys = rows.map((r) => Number(r.sy));
    const L = String(Math.max(...ys));
    const v = (sy: string, org: string, g: string, s: string) => num(rows.find((r) => r.sy === sy && r.org_code === org && r.test_grade === g && r.subject_code === s)?.m_plus_e_pct);
    const series = (g: string, s: string) => {
      const yrs = rows.filter((r) => r.org_code === DISTRICT && r.test_grade === g).map((r) => Number(r.sy));
      const xs = range(Math.min(...yrs), Number(L));
      return { xs, rev: xs.map((y) => v(y, DISTRICT, g, s)), st: xs.map((y) => v(y, STATE, g, s)) };
    };
    const schools = new Map<string, { ela: number | null; math: number | null; grade: string }>();
    for (const r of rows.filter((r) => r.sy === L && r.org_type === "Public School")) {
      const o = schools.get(r.org_code!) ?? { ela: null, math: null, grade: r.test_grade! };
      if (r.subject_code === "ELA") o.ela = num(r.m_plus_e_pct); else o.math = num(r.m_plus_e_pct);
      schools.set(r.org_code!, o);
    }
    return { L, v, series, schools };
  }, [d.mcas.data]);

  // Attendance
  const att = useMemo(() => {
    const rows = d.attendance.data; if (!rows?.length) return null;
    const years = [...new Set(rows.map((r) => r.sy!))].sort();
    const v = (sy: string, org: string) => num(rows.find((r) => r.sy === sy && r.org_code === org)?.pct_chron_abs_10);
    const rev = years.map((y) => v(y, DISTRICT)), st = years.map((y) => v(y, STATE));
    const worst = years.reduce((a, y, i) => ((rev[i] ?? 0) > (rev[years.indexOf(a)] ?? 0) ? y : a), years[0]);
    return { years, rev, st, L: years[years.length - 1], worst, worstV: v(worst, DISTRICT) };
  }, [d.attendance.data]);

  // School-by-school table
  const schools = useMemo(() => {
    const rows = d.schools.data; if (!rows?.length) return null;
    const L = String(Math.max(...rows.map((r) => Number(r.sy))));
    const list = rows.filter((r) => r.sy === L).map((r) => ({
      code: r.org_code!, name: SCHOOL_NAMES[r.org_name!] ?? r.org_name!, n: num(r.total_cnt) ?? 0, el: num(r.el_pct),
      ratio: staff?.schools.get(r.org_code!) ?? null, m: mcas?.schools.get(r.org_code!) ?? null,
    })).sort((a, b) => b.n - a.n);
    return { L, list };
  }, [d.schools.data, staff, mcas]);

  const elMult = enr?.state && num(enr.last.el_pct) && num(enr.state.el_pct) ? num(enr.last.el_pct)! / num(enr.state.el_pct)! : null;
  const enrMax = enr ? Math.max(...enr.trend.map((t) => t.n)) : 1;
  const spendMax = spend ? Math.max(...spend.trend.map((t) => t.n)) : 1;
  const m38 = mcas?.series("ALL (03-08)", subject), m10 = mcas?.series("10", subject);
  const subjWord = subject === "ELA" ? "English" : "math";

  return (
    <DashboardLayout pageTitle="Schools">
      <div className="mx-auto max-w-[1280px] space-y-4 pb-10">
        <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <Figure label={enr ? `Students, ${schoolYear(enr.last.sy!)}` : "Students"} accent value={enr ? n0(enr.total) : d.enrollment.error ? "n/a" : null}
            note={enr ? `${n0(Math.abs(enr.change))} ${enr.change < 0 ? "fewer" : "more"} than the year before` : " "} />
          <Figure label="English learners" value={enr ? pct(num(enr.last.el_pct)) : d.enrollment.error ? "n/a" : null} note={enr?.state ? `${pct(num(enr.state.el_pct))} statewide` : " "} />
          <Figure label="From low-income families" value={enr ? pct(num(enr.last.li_pct)) : d.enrollment.error ? "n/a" : null} note={enr?.state ? `${pct(num(enr.state.li_pct))} statewide` : " "} />
          <Figure label="Students per teacher" value={staff ? String(staff.ratio ?? "n/a") : d.teachers.error ? "n/a" : null} note={staff ? `${staff.stRatio} statewide, ${schoolYear(staff.L)}` : " "} />
        </section>

        <Section title="Is enrollment growing or shrinking?" q="Why is enrollment in Revere Public Schools going down?"
          finding={enr ? <>Revere enrolled {n0(enr.total)} students in {schoolYear(enr.last.sy!)}, {n0(Math.abs(enr.change))} {enr.change < 0 ? "fewer" : "more"} than the year before{enr.peak.sy !== enr.last.sy ? <> and {Math.round((1 - enr.total / enr.peak.n) * 100)}% below the {schoolYear(enr.peak.sy)} peak of {n0(enr.peak.n)}</> : null}.</> : d.enrollment.error ? "Enrollment couldn't be loaded." : null}
          source={<>Source: DESE, <SourceLink href={datasetUrl("enrollment")}>{DATASETS.enrollment.name}</SourceLink>. Counts are taken each October 1 and include pre-K.</>}>
          {d.enrollment.error ? unavailable : (
            <Panel title="Students enrolled each school year" sub="Hover or tap a bar for the count. Orange is the latest year.">
              <div className="flex h-[200px] items-end gap-[3px] md:gap-1.5">
                {enr?.trend.map((t, i) => (
                  <div key={t.sy} className="group flex h-full min-w-0 flex-1 flex-col justify-end" title={`${schoolYear(t.sy)}: ${n0(t.n)} students`}>
                    <span className="figure mb-1 hidden text-center text-[11px] text-muted-foreground opacity-0 transition group-hover:opacity-100 md:block">{n0(t.n)}</span>
                    <motion.div className={cn("w-full rounded-t-[4px]", i === enr.trend.length - 1 ? "bg-highlight-secondary" : "bg-highlight/80 group-hover:bg-highlight")}
                      initial={reduce ? false : { height: 0 }} animate={{ height: `${(t.n / enrMax) * 100}%` }} transition={{ delay: i * 0.02, duration: 0.6, ease: [0.22, 1, 0.36, 1] }} />
                  </div>
                ))}
                {!enr && <div className="skeleton h-full w-full" />}
              </div>
              {enr && <div className="mt-2 flex justify-between text-[12px] text-muted-foreground"><span>{schoolYear(enr.trend[0].sy)}</span><span>{schoolYear(enr.trend[enr.trend.length - 1].sy)}</span></div>}
            </Panel>
          )}
        </Section>

        <Section title="Who are Revere's students?" q="How many English learners are in Revere schools and how does that compare to the state?"
          finding={enr && elMult ? <>{pct(num(enr.last.el_pct))} of students are still learning English, {elMult.toFixed(1)} times the state rate{enr.tenAgo ? <>, up from {pct(num(enr.tenAgo.el_pct))} ten years earlier</> : null}. {pct(num(enr.last.li_pct))} come from low-income families, against {pct(num(enr.state?.li_pct))} statewide.</> : d.enrollment.error ? "Student data couldn't be loaded." : null}
          source={<>Source: DESE, <SourceLink href={datasetUrl("enrollment")}>{DATASETS.enrollment.name}</SourceLink>, {enr ? schoolYear(enr.last.sy!) : ""}. "High needs" counts a student who is low-income, an English learner, a former English learner or has a disability.</>}>
          {d.enrollment.error ? unavailable : (
            <div className="grid gap-3 lg:grid-cols-12">
              <Panel className="lg:col-span-5" title="Share of students" sub={enr ? schoolYear(enr.last.sy!) : " "}>
                {enr ? <PairBars max={1} fmt={(v) => pct(v)} rows={[
                  { label: "English learners", a: num(enr.last.el_pct), b: num(enr.state?.el_pct) },
                  { label: "Low income", a: num(enr.last.li_pct), b: num(enr.state?.li_pct) },
                  { label: "Students with disabilities", a: num(enr.last.swd_pct), b: num(enr.state?.swd_pct) },
                  { label: "High needs", a: num(enr.last.hn_pct), b: num(enr.state?.hn_pct) },
                ]} /> : <div className="skeleton h-56" />}
              </Panel>
              <Panel className="lg:col-span-7" title="English learners over time" sub="Share of all students, each school year">
                {enr ? <>
                  <Legend items={[{ label: "Revere", color: BLUE }, { label: "Massachusetts", color: GREY }]} />
                  <div className="mt-4"><LineChart xs={enr.elTrend.xs} xLabel={schoolYear} fmt={(v) => pct(v)} yTicks={[0, 0.1, 0.2, 0.3, 0.4]}
                    series={[{ name: "Revere", color: BLUE, values: enr.elTrend.rev, strong: true }, { name: "Massachusetts", color: GREY, values: enr.elTrend.st }]} /></div>
                </> : <div className="skeleton h-56" />}
              </Panel>
            </div>
          )}
        </Section>

        <Section title="How big are classes?" q="How do class sizes in Revere compare to the rest of Massachusetts?"
          finding={cls && staff ? <>The average Revere class had {cls.rev} students in {schoolYear(cls.L)}, against {cls.st} statewide. There are {staff.ratio} students for every teacher ({staff.stRatio} statewide){staff.teachers && staff.teachersPrev ? <>, with {n0(staff.teachers)} full-time teachers this year, {staff.teachers < staff.teachersPrev ? `${n0(staff.teachersPrev - staff.teachers)} fewer` : `${n0(staff.teachers - staff.teachersPrev)} more`} than last year</> : null}.</> : d.classSize.error || d.teachers.error ? "Class size data couldn't be loaded." : null}
          source={<>Sources: DESE, <SourceLink href={datasetUrl("classSize")}>{DATASETS.classSize.name}</SourceLink> ({cls ? schoolYear(cls.L) : ""}, the latest published) and <SourceLink href={datasetUrl("teachers")}>{DATASETS.teachers.name}</SourceLink> ({staff ? schoolYear(staff.L) : ""}). Teachers are counted as full-time equivalents.</>}>
          {d.classSize.error && d.teachers.error ? unavailable : (
            <Panel title="Students per class and per teacher" sub="Fewer is smaller">
              {cls && staff ? <PairBars max={20} fmt={(v) => v.toFixed(1)} rows={[
                { label: `Average class size, ${schoolYear(cls.L)}`, a: cls.rev, b: cls.st },
                { label: `Students per teacher, ${schoolYear(staff.L)}`, a: staff.ratio, b: staff.stRatio },
              ]} /> : <div className="skeleton h-40" />}
            </Panel>
          )}
        </Section>

        <Section title="What does Revere spend on schools?" q="How much does Revere spend on its schools and what does the money pay for?"
          finding={spend ? <>The city's FY2027 budget gives the School Department {usd(BUDGET.fy27)}, {((BUDGET.fy27 / BUDGET.fy26 - 1) * 100).toFixed(1)}% more than FY2026. Counting every source, Revere spent {usd(spend.last.n)} per student in FY{spend.last.sy}, up from {usd(spend.first.n)} in FY{spend.first.sy}.</> : d.spending.error ? <>The city's FY2027 budget gives the School Department {usd(BUDGET.fy27)}, {((BUDGET.fy27 / BUDGET.fy26 - 1) * 100).toFixed(1)}% more than FY2026.</> : null}
          source={<>Sources: City of Revere, <SourceLink href={BUDGET_PDF}>FY2027 adopted budget, page 172</SourceLink>; DESE, <SourceLink href={datasetUrl("spending")}>{DATASETS.spending.name}</SourceLink>. Per-student spending includes state and federal grants and tuition for Revere students taught outside the district; DESE doesn't publish a statewide figure in this dataset. Not adjusted for inflation.</>}>
          <div className="grid gap-3 lg:grid-cols-12">
            <div className="grid grid-cols-2 gap-3 lg:col-span-4 lg:grid-cols-1">
              <Figure label="School Department, FY2027" value={`$${(BUDGET.fy27 / 1e6).toFixed(1)}M`} note={<>FY2026: ${(BUDGET.fy26 / 1e6).toFixed(1)}M · <SourceLink href={BUDGET_PDF}>Budget p. 172</SourceLink></>} />
              <Figure label={spend ? `Spent per student, FY${spend.last.sy}` : "Spent per student"} value={spend ? usd(spend.last.n) : d.spending.error ? "n/a" : null} note={spend ? `${Math.round((spend.last.n / spend.first.n - 1) * 100)}% more than FY${spend.first.sy}` : " "} />
            </div>
            <Panel className="lg:col-span-8" title="Spending per student, by fiscal year" sub="All sources, in dollars of each year">
              {d.spending.error ? <p className="text-[14px] text-muted-foreground">DESE's spending data didn't load.</p> : (
                <>
                  <div className="flex h-[200px] items-end gap-[3px] md:gap-2">
                    {spend?.trend.map((t, i) => (
                      <div key={t.sy} className="group flex h-full min-w-0 flex-1 flex-col justify-end" title={`FY${t.sy}: ${usd(t.n)}`}>
                        {i === spend.trend.length - 1 && <span className="figure mb-1 text-center text-[11px] text-foreground md:text-[12px]">${(t.n / 1000).toFixed(1)}K</span>}
                        <motion.div className={cn("w-full rounded-t-[4px]", i === spend.trend.length - 1 ? "bg-highlight-secondary" : "bg-highlight/80 group-hover:bg-highlight")}
                          initial={reduce ? false : { height: 0 }} animate={{ height: `${(t.n / spendMax) * 100}%` }} transition={{ delay: i * 0.03, duration: 0.6 }} />
                      </div>
                    ))}
                    {!spend && <div className="skeleton h-full w-full" />}
                  </div>
                  {spend && <div className="mt-2 flex justify-between text-[12px] text-muted-foreground"><span>FY{spend.first.sy}</span><span>FY{spend.last.sy}</span></div>}
                </>
              )}
            </Panel>
          </div>
        </Section>

        <Section title="Are students graduating on time?" q="Why is Revere's graduation rate lower than the state's?"
          finding={grad ? <>{pct(grad.rev[grad.rev.length - 1], 1)} of Revere's class of {grad.L} graduated in four years, against {pct(grad.st[grad.st.length - 1], 1)} statewide{grad.revTenAgo != null ? <> (the class of {grad.tenAgo}: {pct(grad.revTenAgo, 1)})</> : null}. {grad.drop != null && grad.cohort ? <>About {Math.round(grad.drop * grad.cohort)} of the {n0(grad.cohort)} students, {pct(grad.drop, 1)}, dropped out.</> : null}</> : d.graduation.error ? "Graduation data couldn't be loaded." : null}
          source={<>Source: DESE, <SourceLink href={datasetUrl("graduation")}>{DATASETS.graduation.name}</SourceLink>, four-year rate. Revere's figures include Revere High School and CityLab Innovation High School.</>}>
          {d.graduation.error ? unavailable : (
            <div className="grid gap-3 lg:grid-cols-12">
              <Panel className="lg:col-span-7" title="Four-year graduation rate" sub="By graduating class">
                {grad ? <>
                  <Legend items={[{ label: "Revere", color: BLUE }, { label: "Massachusetts", color: GREY }]} />
                  <div className="mt-4"><LineChart xs={grad.years} xLabel={(y) => `Class of ${y}`} fmt={(v) => pct(v)} yTicks={[0.5, 0.6, 0.7, 0.8, 0.9, 1]}
                    series={[{ name: "Revere", color: BLUE, values: grad.rev, strong: true }, { name: "Massachusetts", color: GREY, values: grad.st }]} /></div>
                </> : <div className="skeleton h-56" />}
              </Panel>
              <Panel className="lg:col-span-5" title={grad ? `Class of ${grad.L}, by group` : "By group"} sub="Share who graduated in four years">
                {grad ? <PairBars max={1} fmt={(v) => pct(v)} rows={grad.groups} /> : <div className="skeleton h-56" />}
              </Panel>
            </div>
          )}
        </Section>

        <Section title="How are students doing on MCAS?" q="How did Revere students do on the latest MCAS tests?"
          finding={mcas ? <>On the spring {mcas.L} tests, {pct(mcas.v(mcas.L, DISTRICT, "ALL (03-08)", "ELA"))} of Revere students in grades 3 to 8 met or exceeded expectations in English and {pct(mcas.v(mcas.L, DISTRICT, "ALL (03-08)", "MATH"))} in math, against {pct(mcas.v(mcas.L, STATE, "ALL (03-08)", "ELA"))} and {pct(mcas.v(mcas.L, STATE, "ALL (03-08)", "MATH"))} statewide. In grade 10 it was {pct(mcas.v(mcas.L, DISTRICT, "10", "ELA"))} and {pct(mcas.v(mcas.L, DISTRICT, "10", "MATH"))}.</> : d.mcas.error ? "MCAS results couldn't be loaded." : null}
          source={<>Source: DESE, <SourceLink href={datasetUrl("mcas")}>{DATASETS.mcas.name}</SourceLink>, all students. No tests were given in 2020. Statewide grade 10 scores have also fallen since voters ended the MCAS graduation requirement in November 2024.</>}>
          {d.mcas.error ? unavailable : (
            <>
              <div className="flex rounded-full bg-card p-1 sm:w-fit" role="tablist" aria-label="Subject">
                {(["ELA", "MATH"] as const).map((s) => (
                  <button key={s} role="tab" aria-selected={subject === s} onClick={() => setSubject(s)}
                    className={cn("relative h-10 flex-1 rounded-full px-5 text-[14px] font-medium transition-colors sm:flex-none", subject === s ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground")}>
                    {subject === s && <motion.span layoutId="mcas-subj" className="absolute inset-0 rounded-full bg-primary" transition={{ type: "spring", stiffness: 420, damping: 34 }} />}
                    <span className="relative">{s === "ELA" ? "English" : "Math"}</span>
                  </button>
                ))}
              </div>
              <div className="grid gap-3 lg:grid-cols-2">
                {([["Grades 3 to 8", m38], ["Grade 10", m10]] as const).map(([t, s]) => (
                  <Panel key={t} title={`${t}, ${subjWord}`} sub="Share meeting or exceeding expectations">
                    {s ? <>
                      <Legend items={[{ label: "Revere", color: BLUE }, { label: "Massachusetts", color: GREY }]} />
                      <div className="mt-4"><LineChart xs={s.xs} xLabel={(y) => `Spring ${y}`} fmt={(v) => pct(v)} yTicks={[0, 0.2, 0.4, 0.6, 0.8]} height={190}
                        series={[{ name: "Revere", color: BLUE, values: s.rev, strong: true }, { name: "Massachusetts", color: GREY, values: s.st }]} /></div>
                    </> : <div className="skeleton h-52" />}
                  </Panel>
                ))}
              </div>
            </>
          )}
        </Section>

        <Section title="Are students showing up?" q="How bad is chronic absenteeism in Revere schools?"
          finding={att ? <>{pct(att.rev[att.rev.length - 1])} of Revere students were chronically absent in {schoolYear(att.L)}, meaning they missed at least one day in ten, against {pct(att.st[att.st.length - 1])} statewide. {att.worst !== att.L && att.worstV != null ? <>That's down from {pct(att.worstV)} in {schoolYear(att.worst)}.</> : null}</> : d.attendance.error ? "Attendance data couldn't be loaded." : null}
          source={<>Source: DESE, <SourceLink href={datasetUrl("attendance")}>{DATASETS.attendance.name}</SourceLink>, end of year, all students.</>}>
          {d.attendance.error ? unavailable : (
            <Panel title="Chronically absent students" sub="Share who missed 10% or more of school days">
              {att ? <>
                <Legend items={[{ label: "Revere", color: BLUE }, { label: "Massachusetts", color: GREY }]} />
                <div className="mt-4"><LineChart xs={att.years} xLabel={schoolYear} fmt={(v) => pct(v)} yTicks={[0, 0.1, 0.2, 0.3, 0.4]} height={200}
                  series={[{ name: "Revere", color: BLUE, values: att.rev, strong: true }, { name: "Massachusetts", color: GREY, values: att.st }]} /></div>
              </> : <div className="skeleton h-52" />}
            </Panel>
          )}
        </Section>

        <Section title="How does each school compare?" q="Which Revere public school has the best MCAS scores?"
          finding={schools && mcas ? (() => {
            const ranked = schools.list.filter((s) => s.m?.grade === "ALL (03-08)" && s.m.ela != null).sort((a, b) => b.m!.ela! - a.m!.ela!);
            return ranked.length > 1 ? <>{schools.list.length} public schools. In grades 3 to 8, English results range from {pct(ranked[ranked.length - 1].m!.ela)} at {ranked[ranked.length - 1].name} to {pct(ranked[0].m!.ela)} at {ranked[0].name}.</> : <>{schools.list.length} public schools.</>;
          })() : d.schools.error ? "School data couldn't be loaded." : null}
          source={<>Sources: DESE enrollment ({schools ? schoolYear(schools.L) : ""}), teacher data and MCAS ({mcas ? `spring ${mcas.L}` : ""}). MCAS columns are grades 3 to 8 combined, or grade 10 for high schools. Small schools' results swing more from year to year.</>}>
          {d.schools.error ? unavailable : (
            <section className="rounded-[24px] bg-card p-4 md:p-6">
              <div className="hidden grid-cols-[minmax(0,1fr)_88px_96px_96px_88px_88px] gap-3 pb-2 text-[12.5px] text-muted-foreground md:grid">
                <span>School</span><span className="text-right">Students</span><span className="text-right">English learners</span><span className="text-right">Per teacher</span><span className="text-right">MCAS English</span><span className="text-right">MCAS math</span>
              </div>
              <ul className="divide-y divide-border">
                {schools?.list.map((s) => (
                  <li key={s.code} className="grid grid-cols-2 gap-x-3 gap-y-1 py-3 md:grid-cols-[minmax(0,1fr)_88px_96px_96px_88px_88px] md:items-center">
                    <span className="col-span-2 min-w-0 text-[15px] font-medium text-foreground md:col-span-1 md:truncate">
                      {s.name}{s.m?.grade === "10" && <span className="ml-2 rounded-full bg-secondary px-2 py-0.5 text-[12px] font-normal text-muted-foreground">grade 10</span>}
                    </span>
                    <Cell label="Students" v={n0(s.n)} />
                    <Cell label="English learners" v={pct(s.el)} />
                    <Cell label="Per teacher" v={s.ratio != null ? s.ratio.toFixed(1) : "n/a"} />
                    <Cell label="MCAS English" v={s.m ? pct(s.m.ela) : "n/a"} />
                    <Cell label="MCAS math" v={s.m ? pct(s.m.math) : "n/a"} />
                  </li>
                ))}
              </ul>
              {!schools && <div className="space-y-2">{[0, 1, 2, 3, 4].map((i) => <div key={i} className="skeleton h-12" />)}</div>}
            </section>
          )}
        </Section>

        <section className="flex flex-col gap-3 rounded-[24px] bg-card p-4 text-[14px] md:flex-row md:items-center md:justify-between md:p-6">
          <p className="max-w-[760px] text-muted-foreground">
            School figures are loaded live from the Massachusetts Department of Elementary and Secondary Education's <SourceLink href="https://educationtocareer.data.mass.gov">Education-to-Career data portal</SourceLink> each time this page opens, so they update when DESE publishes a new year. Budget figures are from the city's adopted FY2027 budget.
          </p>
          <AskButton primary q="What are the biggest challenges facing Revere Public Schools right now?" />
        </section>
      </div>
    </DashboardLayout>
  );
}

function Cell({ label, v }: { label: string; v: string }) {
  return (
    <span className="flex items-baseline justify-between gap-2 text-[13px] text-muted-foreground md:block md:text-right">
      <span className="md:hidden">{label}</span>
      <span className="figure text-[15px] text-foreground">{v}</span>
    </span>
  );
}
