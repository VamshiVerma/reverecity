// Extracted from the City of Revere FY2027 Adopted Budget, "Local Revenue - 10 Year Analysis" (pp. 237-242),
// "Free Cash" (p. 230) and "Stabilization Fund" (p. 231). FY2026 and FY2027 values are the city's projections.
export const REVENUE_SOURCE = {
  title: "FY2027 Adopted Budget",
  url: "https://files.aptuitivcdn.com/GB7r14nbKy-1182/docs/FY2027-Budget-Adopted.pdf",
};

export type Point = { fy: number; v: number; projected?: boolean };
export type RevenueLine = { id: string; name: string; page: number; series: Point[] };

export const REVENUE_LINES: RevenueLine[] = [
  { id: "property", name: "Real & Personal Property Taxes", page: 237, series: [{ fy: 2018, v: 82651350 }, { fy: 2019, v: 86350243 }, { fy: 2020, v: 90462324 }, { fy: 2021, v: 93769513 }, { fy: 2022, v: 99747952 }, { fy: 2023, v: 107656370 }, { fy: 2024, v: 113715482 }, { fy: 2025, v: 120249280 }, { fy: 2026, v: 126466294, projected: true }, { fy: 2027, v: 133198908, projected: true }] },
  { id: "mve", name: "Motor Vehicle Excise", page: 237, series: [{ fy: 2018, v: 5844249 }, { fy: 2019, v: 6040326 }, { fy: 2020, v: 5402654 }, { fy: 2021, v: 6640706 }, { fy: 2022, v: 6030338 }, { fy: 2023, v: 6932313 }, { fy: 2024, v: 7691791 }, { fy: 2025, v: 7436937 }, { fy: 2026, v: 7400000, projected: true }, { fy: 2027, v: 7500000, projected: true }] },
  { id: "hotel", name: "Hotel Excise", page: 238, series: [{ fy: 2018, v: 1796177 }, { fy: 2019, v: 1903018 }, { fy: 2020, v: 1816373 }, { fy: 2021, v: 548001 }, { fy: 2022, v: 1757032 }, { fy: 2023, v: 2961891 }, { fy: 2024, v: 3610657 }, { fy: 2025, v: 3292155 }, { fy: 2026, v: 3300000, projected: true }, { fy: 2027, v: 3400000, projected: true }] },
  { id: "meals", name: "Meals Tax", page: 238, series: [{ fy: 2018, v: 675481 }, { fy: 2019, v: 720250 }, { fy: 2020, v: 715005 }, { fy: 2021, v: 635412 }, { fy: 2022, v: 864367 }, { fy: 2023, v: 1028621 }, { fy: 2024, v: 1103456 }, { fy: 2025, v: 1151466 }, { fy: 2026, v: 1200000, projected: true }, { fy: 2027, v: 1250000, projected: true }] },
  { id: "interest", name: "Interest on Taxes", page: 239, series: [{ fy: 2018, v: 889791 }, { fy: 2019, v: 351221 }, { fy: 2020, v: 309592 }, { fy: 2021, v: 794419 }, { fy: 2022, v: 518003 }, { fy: 2023, v: 442889 }, { fy: 2024, v: 715777 }, { fy: 2025, v: 423913 }, { fy: 2026, v: 420000, projected: true }, { fy: 2027, v: 420000, projected: true }] },
  { id: "pilot", name: "Payment In Lieu of Taxes", page: 239, series: [{ fy: 2018, v: 279961 }, { fy: 2019, v: 185119 }, { fy: 2020, v: 245982 }, { fy: 2021, v: 210693 }, { fy: 2022, v: 250234 }, { fy: 2023, v: 203653 }, { fy: 2024, v: 144985 }, { fy: 2025, v: 163018 }, { fy: 2026, v: 160000, projected: true }, { fy: 2027, v: 160000, projected: true }] },
  { id: "licenses", name: "Licenses and Permits", page: 240, series: [{ fy: 2018, v: 1699345 }, { fy: 2019, v: 3560639 }, { fy: 2020, v: 2631700 }, { fy: 2021, v: 1712972 }, { fy: 2022, v: 6490307 }, { fy: 2023, v: 3258647 }, { fy: 2024, v: 3886334 }, { fy: 2025, v: 3614241 }, { fy: 2026, v: 3700000, projected: true }, { fy: 2027, v: 3700000, projected: true }] },
  { id: "fines", name: "Fines and Forfeits", page: 240, series: [{ fy: 2018, v: 1516913 }, { fy: 2019, v: 1305851 }, { fy: 2020, v: 1176545 }, { fy: 2021, v: 1399289 }, { fy: 2022, v: 1730859 }, { fy: 2023, v: 2099865 }, { fy: 2024, v: 2058015 }, { fy: 2025, v: 2084540 }, { fy: 2026, v: 2200000, projected: true }, { fy: 2027, v: 2200000, projected: true }] },
  { id: "investment", name: "Investment Income", page: 241, series: [{ fy: 2018, v: 425818 }, { fy: 2019, v: 1214506 }, { fy: 2020, v: 833972 }, { fy: 2021, v: 124118 }, { fy: 2022, v: 324037 }, { fy: 2023, v: 3177706 }, { fy: 2024, v: 3633713 }, { fy: 2025, v: 3137163 }, { fy: 2026, v: 3000000, projected: true }, { fy: 2027, v: 3000000, projected: true }] },
  { id: "otherdept", name: "Other Department Revenue", page: 241, series: [{ fy: 2018, v: 1835193 }, { fy: 2019, v: 1863198 }, { fy: 2020, v: 1850000 }, { fy: 2021, v: 1624400 }, { fy: 2022, v: 1854610 }, { fy: 2023, v: 1479750 }, { fy: 2024, v: 1450000 }, { fy: 2025, v: 1350000 }, { fy: 2026, v: 1425000, projected: true }] },
  { id: "misc", name: "Miscellaneous Recurring", page: 242, series: [{ fy: 2018, v: 463922 }, { fy: 2019, v: 467802 }, { fy: 2020, v: 435192 }, { fy: 2021, v: 436251 }, { fy: 2022, v: 224997 }, { fy: 2023, v: 413400 }, { fy: 2024, v: 273172 }, { fy: 2025, v: 288188 }, { fy: 2026, v: 250000, projected: true }, { fy: 2027, v: 250000, projected: true }] },
  { id: "miscnr", name: "Miscellaneous Non-Recurring", page: 242, series: [{ fy: 2018, v: 645525 }, { fy: 2019, v: 468952 }, { fy: 2020, v: 208806 }, { fy: 2021, v: 493168 }, { fy: 2022, v: 190103 }, { fy: 2023, v: 758568 }, { fy: 2024, v: 355739 }, { fy: 2025, v: 432845 }, { fy: 2027, v: 130000, projected: true }] },
];

// General fund revenue mix, FY2027 estimate (p. 228 pie chart).
export const GENERAL_FUND_MIX = {
  page: 228,
  fy2027: [
    { name: "Property taxes", pct: 47 },
    { name: "State aid", pct: 44 },
    { name: "Local receipts", pct: 8 },
    { name: "Water/sewer indirect costs", pct: 1 },
  ],
  fy2026: [
    { name: "Property taxes", pct: 46 },
    { name: "State aid", pct: 45 },
    { name: "Local receipts", pct: 8 },
    { name: "Water/sewer indirect costs", pct: 1 },
  ],
};

export const FREE_CASH = {
  page: 230,
  series: [
    { fy: 2018, v: 6273580 }, { fy: 2019, v: 6127553 }, { fy: 2020, v: 6303811 }, { fy: 2021, v: 1329154 },
    { fy: 2022, v: 1573554 }, { fy: 2023, v: 5924275 }, { fy: 2024, v: 3665974 }, { fy: 2025, v: 4452682 },
    { fy: 2026, v: 2787498 }, { fy: 2027, v: 2500000, projected: true },
  ] as Point[],
};

export const STABILIZATION = {
  page: 231,
  series: [
    { fy: 2018, v: 7386313 }, { fy: 2019, v: 8472453 }, { fy: 2020, v: 8560370 }, { fy: 2021, v: 8990923 },
    { fy: 2022, v: 9333931 }, { fy: 2023, v: 9177416 }, { fy: 2024, v: 10211686 }, { fy: 2025, v: 11469505 },
    { fy: 2026, v: 12199003, projected: true }, { fy: 2027, v: 12790003, projected: true },
  ] as Point[],
};
