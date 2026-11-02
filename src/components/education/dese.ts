import { useEffect, useState } from "react";

// Massachusetts DESE open data (Socrata, keyless, CORS-enabled). Revere's district code is 02480000; the state is 00000000.
export const DESE = "https://educationtocareer.data.mass.gov";
export const DISTRICT = "02480000";
export const STATE = "00000000";

export const DATASETS = {
  enrollment: { id: "t8td-gens", name: "Enrollment: Grade, Race/Ethnicity, Gender, and Selected Populations" },
  teachers: { id: "4684-cw3t", name: "Elementary and Secondary Teacher Data" },
  classSize: { id: "35yv-uxv5", name: "Class Size by Gender, Race/Ethnicity, and Selected Populations" },
  graduation: { id: "n2xa-p822", name: "High School Graduation Rates" },
  mcas: { id: "i9w6-niyt", name: "MCAS Achievement Results" },
  spending: { id: "8szy-v4ed", name: "Elementary and Secondary District Expenditures Per Pupil" },
  attendance: { id: "ak6h-9k7x", name: "Student Attendance" },
} as const;

export const datasetUrl = (k: keyof typeof DATASETS) => `${DESE}/d/${DATASETS[k].id}`;

type Raw = Record<string, string | undefined>;

async function soda(id: string, params: Record<string, string>): Promise<Raw[]> {
  const url = `${DESE}/resource/${id}.json?${new URLSearchParams({ $limit: "5000", ...params })}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error(`DESE ${id}: ${r.status}`);
  return r.json();
}

export const num = (s?: string) => (s == null || s === "" ? null : Number(s));
/** "2026" → "2025–26" */
export const schoolYear = (sy: string) => `${Number(sy) - 1}–${sy.slice(2)}`;
export const pct = (v: number | null, digits = 0) => (v == null ? "n/a" : `${(v * 100).toFixed(digits)}%`);

export type SchoolsData = {
  enrollment: Raw[]; schools: Raw[]; teachers: Raw[]; classSize: Raw[]; graduation: Raw[]; mcas: Raw[]; spending: Raw[]; attendance: Raw[];
};
type Part<K extends keyof SchoolsData> = { data: SchoolsData[K] | null; error: boolean };
export type SchoolsState = { [K in keyof SchoolsData]: Part<K> };

const both = `org_code in('${DISTRICT}','${STATE}')`;
const QUERIES: { [K in keyof SchoolsData]: [string, Record<string, string>] } = {
  enrollment: [DATASETS.enrollment.id, { $where: both, $select: "sy,org_code,total_cnt,el_pct,li_pct,swd_pct,hn_pct", $order: "sy" }],
  schools: [DATASETS.enrollment.id, { $where: `dist_code='${DISTRICT}' AND org_type='School' AND sy>='2023'`, $select: "sy,org_code,org_name,total_cnt,el_pct,li_pct" }],
  teachers: [DATASETS.teachers.id, { $where: `(dist_code='${DISTRICT}' OR org_code='${STATE}') AND subject='All Teachers' AND sy>='2020'`, $select: "sy,org_code,org_name,org_type,tchr_cnt,stu_tchr_ratio" }],
  classSize: [DATASETS.classSize.id, { $where: `${both} AND subj='All'`, $select: "sy,org_code,avg_clss_cnt", $order: "sy" }],
  graduation: [DATASETS.graduation.id, { $where: `${both} AND grad_rate_type='4-Year Graduation Rate' AND stu_grp in('All Students','English Learners','Low Income','Students with Disabilities','High Needs')`, $select: "sy,org_code,stu_grp,cohort_cnt,grad_pct,drpout_pct", $order: "sy" }],
  mcas: [DATASETS.mcas.id, { $where: `(dist_code='${DISTRICT}' OR org_code='${STATE}') AND stu_grp='All Students' AND test_grade in('ALL (03-08)','10') AND subject_code in('ELA','MATH')`, $select: "sy,org_code,org_name,org_type,test_grade,subject_code,m_plus_e_pct,stu_cnt", $order: "sy" }],
  spending: [DATASETS.spending.id, { $where: `dist_code='${DISTRICT}'`, $select: "sy,tot_exp_per_pupil,in_dist_exp_per_pupil", $order: "sy" }],
  attendance: [DATASETS.attendance.id, { $where: `${both} AND stu_grp='All Students' AND attend_period='End of Year'`, $select: "sy,org_code,attend_rate,pct_chron_abs_10", $order: "sy" }],
};

/** Each section loads on its own, so one slow or failed dataset doesn't blank the page. */
export function useSchoolsData(): SchoolsState {
  const init = Object.fromEntries(Object.keys(QUERIES).map((k) => [k, { data: null, error: false }])) as unknown as SchoolsState;
  const [s, set] = useState<SchoolsState>(init);
  useEffect(() => {
    let live = true;
    (Object.keys(QUERIES) as (keyof SchoolsData)[]).forEach((k) => {
      const [id, p] = QUERIES[k];
      soda(id, p)
        .then((data) => live && set((o) => ({ ...o, [k]: { data, error: false } })))
        .catch(() => live && set((o) => ({ ...o, [k]: { data: null, error: true } })));
    });
    return () => { live = false; };
  }, []);
  return s;
}
