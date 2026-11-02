import { useEffect, useRef, useState } from "react";

// Everything on the transit page reads the MBTA's public v3 API directly (keyless, CORS-enabled).
// The keyless limit is about 20 requests a minute per visitor, so each feed is one batched request
// on a slow poll, and polling pauses while the tab is hidden.
export const MBTA = "https://api-v3.mbta.com";

// The Blue Line from Wonderland (end of line in Revere) to Bowdoin. Direction 0 runs down this list.
export const LINE = [
  { id: "place-wondl", name: "Wonderland", short: "Wonderland", revere: true },
  { id: "place-rbmnl", name: "Revere Beach", short: "Revere Bch", revere: true },
  { id: "place-bmmnl", name: "Beachmont", short: "Beachmont", revere: true },
  { id: "place-sdmnl", name: "Suffolk Downs", short: "Suffolk", revere: true },
  { id: "place-orhte", name: "Orient Heights", short: "Orient Hts" },
  { id: "place-wimnl", name: "Wood Island", short: "Wood Is." },
  { id: "place-aport", name: "Airport", short: "Airport" },
  { id: "place-mvbcl", name: "Maverick", short: "Maverick" },
  { id: "place-aqucl", name: "Aquarium", short: "Aquarium" },
  { id: "place-state", name: "State", short: "State" },
  { id: "place-gover", name: "Government Center", short: "Gov't Ctr" },
  { id: "place-bomnl", name: "Bowdoin", short: "Bowdoin" },
] as { id: string; name: string; short: string; revere?: boolean }[];
export const REVERE_STATIONS = LINE.filter((s) => s.revere);

// Bus routes through Revere. Route 117 no longer appears in the MBTA's data since the bus network redesign, so it's left out.
export const BUS_ROUTES = [
  { id: "110", name: "Wonderland – Wellington", dest: ["Wonderland", "Wellington"] },
  { id: "116", name: "Wonderland – Maverick", dest: ["Wonderland", "Maverick"] },
  { id: "119", name: "Northgate – Beachmont", dest: ["Northgate", "Beachmont"] },
  { id: "411", name: "Jack Satter House – Malden Center", dest: ["Jack Satter House", "Malden Center"] },
  { id: "424", name: "Eastern Ave & Essex St – Wonderland", dest: ["Eastern Ave & Essex St", "Wonderland"] },
  { id: "426", name: "Lynn – Haymarket or Wonderland", dest: ["Central Square, Lynn", "Haymarket or Wonderland"] },
  { id: "450", name: "Salem Depot – Wonderland or Haymarket", dest: ["Salem Depot", "Wonderland or Haymarket"] },
];
export const ALERT_ROUTES = ["Blue", ...BUS_ROUTES.map((r) => r.id)];

// The busiest places to catch a bus in Revere. Each place groups the stops on both sides of the street;
// direction keeps them apart on screen.
export const BUS_PLACES: { key: string; name: string; stops: string[] }[] = [
  { key: "wonderland", name: "Wonderland busway", stops: ["place-wondl"] },
  { key: "bell", name: "Bell Circle", stops: ["4717", "4733", "14717", "4526"] },
  { key: "center", name: "Revere Center (Broadway)", stops: ["5763", "5713"] },
  { key: "mountain", name: "Broadway at Mountain Ave", stops: ["57641", "57121"] },
  { key: "breed", name: "Revere St at Breed St", stops: ["5704", "5771"] },
  { key: "beachmont", name: "Beachmont station", stops: ["5819", "5810"] },
];
export const BUS_STOP_IDS = BUS_PLACES.flatMap((p) => p.stops);

export const enc = (s: string) => s.replace(/\[/g, "%5B").replace(/\]/g, "%5D");

type JsonApi = { data: any[]; included?: any[] };

/** Poll one MBTA URL. Keeps the last good data on failure so a blip doesn't blank the page. */
export function usePoll<T>(url: string, every: number, parse: (j: JsonApi) => T) {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [asOf, setAsOf] = useState<Date | null>(null);
  const parseRef = useRef(parse);
  parseRef.current = parse;
  useEffect(() => {
    let alive = true;
    let timer: ReturnType<typeof setTimeout> | undefined;
    const load = async () => {
      if (document.hidden) { timer = setTimeout(load, every); return; }
      try {
        const r = await fetch(url);
        if (!r.ok) throw new Error(r.status === 429 ? "The MBTA is limiting requests right now." : `The MBTA returned an error (${r.status}).`);
        const j = (await r.json()) as JsonApi;
        if (!alive) return;
        setData(parseRef.current(j)); setAsOf(new Date()); setError(null);
      } catch (e) {
        if (alive) setError(e instanceof Error && e.message.startsWith("The MBTA") ? e.message : "We couldn't reach the MBTA.");
      }
      if (alive) timer = setTimeout(load, every);
    };
    const onShow = () => { if (!document.hidden) { clearTimeout(timer); load(); } };
    load();
    document.addEventListener("visibilitychange", onShow);
    return () => { alive = false; clearTimeout(timer); document.removeEventListener("visibilitychange", onShow); };
  }, [url, every]);
  return { data, error, asOf, loading: data == null && error == null };
}

export function useNow(every = 1000) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const id = setInterval(() => setNow(Date.now()), every); return () => clearInterval(id); }, [every]);
  return now;
}

const parentOf = (j: JsonApi) => {
  const m = new Map<string, string>();
  for (const i of j.included ?? []) if (i.type === "stop") m.set(i.id, i.relationships?.parent_station?.data?.id ?? i.id);
  return (id: string) => m.get(id) ?? id;
};

/* ---------- Blue Line predictions at the four Revere stations ---------- */
export type Train = { id: string; station: string; dir: 0 | 1; at: number; arrivalOnly: boolean };
export function useTrainPredictions() {
  const stops = REVERE_STATIONS.map((s) => s.id).join(",");
  return usePoll<Train[]>(
    enc(`${MBTA}/predictions?filter[stop]=${stops}&filter[route]=Blue&sort=departure_time&include=stop&fields[prediction]=arrival_time,departure_time,direction_id,schedule_relationship&fields[stop]=parent_station`),
    20_000,
    (j) => {
      const parent = parentOf(j);
      const out: Train[] = [];
      for (const p of j.data) {
        const a = p.attributes;
        if (a.schedule_relationship === "SKIPPED" || a.schedule_relationship === "CANCELLED") continue;
        const t = a.departure_time || a.arrival_time;
        if (!t) continue;
        out.push({ id: p.relationships?.trip?.data?.id ?? p.id, station: parent(p.relationships.stop.data.id), dir: a.direction_id, at: new Date(t).getTime(), arrivalOnly: !a.departure_time });
      }
      return out.sort((x, y) => x.at - y.at);
    },
  );
}

/* ---------- Blue Line vehicles ---------- */
export type Vehicle = { id: string; label: string; dir: 0 | 1; station: string; status: "STOPPED_AT" | "INCOMING_AT" | "IN_TRANSIT_TO"; updated: number };
export function useBlueVehicles() {
  return usePoll<Vehicle[]>(
    enc(`${MBTA}/vehicles?filter[route]=Blue&include=stop&fields[vehicle]=current_status,direction_id,label,updated_at&fields[stop]=parent_station`),
    30_000,
    (j) => {
      const parent = parentOf(j);
      return j.data
        .filter((v) => v.relationships?.stop?.data?.id)
        .map((v) => ({ id: v.id, label: v.attributes.label, dir: v.attributes.direction_id, station: parent(v.relationships.stop.data.id), status: v.attributes.current_status, updated: new Date(v.attributes.updated_at).getTime() }));
    },
  );
}

/* ---------- Bus predictions at Revere's key stops ---------- */
export type BusDeparture = { id: string; route: string; dir: 0 | 1; place: string; at: number; headsign: string };
export function useBusPredictions() {
  const routes = BUS_ROUTES.map((r) => r.id).join(",");
  return usePoll<BusDeparture[]>(
    enc(`${MBTA}/predictions?filter[route]=${routes}&filter[stop]=${BUS_STOP_IDS.join(",")}&sort=departure_time&include=trip,stop&fields[prediction]=departure_time,direction_id,schedule_relationship&fields[trip]=headsign&fields[stop]=parent_station`),
    30_000,
    (j) => {
      const parent = parentOf(j);
      const head = new Map<string, string>();
      for (const i of j.included ?? []) if (i.type === "trip") head.set(i.id, i.attributes?.headsign ?? "");
      const placeOf = new Map<string, string>();
      for (const p of BUS_PLACES) for (const s of p.stops) placeOf.set(s, p.key);
      const out: BusDeparture[] = [];
      for (const p of j.data) {
        const a = p.attributes;
        if (!a.departure_time || a.schedule_relationship === "SKIPPED" || a.schedule_relationship === "CANCELLED") continue;
        const sid = p.relationships.stop.data.id;
        const place = placeOf.get(sid) ?? placeOf.get(parent(sid));
        if (!place) continue;
        const trip = p.relationships?.trip?.data?.id;
        out.push({ id: `${trip ?? p.id}-${sid}`, route: p.relationships.route.data.id, dir: a.direction_id, place, at: new Date(a.departure_time).getTime(), headsign: head.get(trip) ?? "" });
      }
      return out.sort((x, y) => x.at - y.at);
    },
  );
}

/* ---------- Alerts ---------- */
export type Alert = {
  id: string; effect: string; severity: number; header: string; description: string; cause: string;
  lifecycle: string; timeframe: string | null; serviceEffect: string | null; url: string | null;
  routes: string[]; stops: string[]; periods: { start: number; end: number | null }[]; updated: number;
};
const parseAlerts = (j: JsonApi): Alert[] => {
  const names = new Map<string, { name: string; parent: string }>();
  for (const i of j.included ?? []) if (i.type === "stop") names.set(i.id, { name: i.attributes?.name ?? i.id, parent: i.relationships?.parent_station?.data?.id ?? i.id });
  return j.data.map((a) => {
    const t = a.attributes;
    const ents = (t.informed_entity ?? []) as { route?: string; stop?: string }[];
    const stopNames = new Map<string, string>();
    for (const e of ents) if (e.stop) { const s = names.get(e.stop); stopNames.set(s?.parent ?? e.stop, s?.name ?? e.stop); }
    return {
      id: a.id, effect: t.effect, severity: t.severity ?? 0, header: (t.header ?? "").trim(), description: (t.description ?? "").trim(), cause: t.cause,
      lifecycle: t.lifecycle, timeframe: t.timeframe ?? null, serviceEffect: t.service_effect ?? null, url: t.url ?? null,
      routes: [...new Set(ents.map((e) => e.route).filter(Boolean) as string[])],
      stops: [...new Set(stopNames.values())],
      periods: (t.active_period ?? []).map((p: { start: string; end: string | null }) => ({ start: new Date(p.start).getTime(), end: p.end ? new Date(p.end).getTime() : null })),
      updated: new Date(t.updated_at).getTime(),
    };
  });
};
/** Alerts on the Blue Line and Revere's buses: what's happening now, plus anything planned. */
export function useRouteAlerts() {
  return usePoll<Alert[]>(
    enc(`${MBTA}/alerts?filter[route]=${ALERT_ROUTES.join(",")}&include=stops&fields[stop]=name,parent_station`),
    60_000, parseAlerts,
  );
}
/** Elevator and escalator outages at the four Revere stations (these alerts carry no route). */
export function useAccessAlerts() {
  return usePoll<Alert[]>(
    enc(`${MBTA}/alerts?filter[stop]=${REVERE_STATIONS.map((s) => s.id).join(",")}&filter[activity]=USING_WHEELCHAIR,USING_ESCALATOR&filter[datetime]=NOW&include=stops&fields[stop]=name,parent_station`),
    120_000, parseAlerts,
  );
}

const VALID = Date.UTC(2000, 0, 1);
/** "now" if a period covers this moment (or the alert has no usable period but says it's live), "soon" if it starts later. */
export function alertWhen(a: Alert, now: number): "now" | "soon" | "past" {
  const real = a.periods.filter((p) => p.start > VALID);
  if (!real.length) return ["NEW", "ONGOING", "ONGOING_UPCOMING"].includes(a.lifecycle) ? "now" : "soon";
  if (real.some((p) => p.start <= now && (p.end == null || p.end > now))) return "now";
  if (real.some((p) => p.start > now)) return "soon";
  return "past";
}

/* ---------- Formatting ---------- */
export const clock = (t: number | Date) => new Date(t).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
export const minsUntil = (t: number, now: number) => Math.max(1, Math.round((t - now) / 60_000));
export const sameDay = (a: number, b: number) => new Date(a).toDateString() === new Date(b).toDateString();
export const dayAndTime = (t: number, now: number) => {
  const d = new Date(t);
  if (sameDay(t, now)) return `${clock(d)} today`;
  if (sameDay(t, now + 864e5)) return `${clock(d)} tomorrow`;
  if (sameDay(t, now - 864e5)) return `${clock(d)} yesterday`;
  return `${d.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" })}, ${clock(d)}`;
};
