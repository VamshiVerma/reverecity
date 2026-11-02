import { useEffect, useState } from "react";
import { getCityPulse, type PulseItem } from "@/lib/cityApi";

// One shared poller for the live feed (ticker, breaking takeover and toasts all read from it).
let items: PulseItem[] = [];
let loaded = false;
const subs = new Set<(i: PulseItem[]) => void>();
let timer: ReturnType<typeof setInterval> | null = null;

function demoItems(): PulseItem[] {
  if (typeof window === "undefined") return [];
  const p = new URLSearchParams(window.location.search);
  const out: PulseItem[] = [];
  if (p.get("breaking") === "demo") {
    out.push({ id: "demo-breaking", kind: "mbta", level: "breaking", tag: "Blue Line · Demo",
      text: "Shuttle buses replace Blue Line trains between Airport and Wonderland. Allow 20+ extra minutes.", at: new Date().toISOString(), href: "/mbta" });
  }
  if (p.get("toast") === "demo") {
    out.push({ id: "demo-toast", kind: "weather", level: "alert", tag: "Weather · Demo",
      text: "Wind Advisory for Suffolk County until 8 PM. Gusts up to 50 mph.", at: new Date().toISOString(), href: "/weather" });
  }
  return out;
}

async function load() {
  try {
    const live = await getCityPulse();
    items = [...demoItems().filter((d) => !items.some((i) => i.id === d.id)), ...items.filter((i) => i.id.startsWith("demo")), ...live]
      .filter((v, i, a) => a.findIndex((x) => x.id === v.id) === i);
  } catch {
    if (!items.length) items = demoItems();
  }
  loaded = true;
  subs.forEach((f) => f(items));
}

export function usePulse() {
  const [state, setState] = useState<PulseItem[]>(items);
  useEffect(() => {
    subs.add(setState);
    if (!timer) {
      load();
      timer = setInterval(load, 90_000);
    } else if (loaded) setState(items);
    return () => {
      subs.delete(setState);
      if (!subs.size && timer) { clearInterval(timer); timer = null; }
    };
  }, []);
  return state;
}
