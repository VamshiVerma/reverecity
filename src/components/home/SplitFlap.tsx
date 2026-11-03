import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// A split-flap departure board, like the old station boards: each character sits on its own flap,
// and when it changes the top half falls forward to reveal the new one.

function Flap({ ch, tone }: { ch: string; tone: "boston" | "revere" }) {
  const [cur, setCur] = useState(ch);
  const [prev, setPrev] = useState(ch);
  const [flip, setFlip] = useState(0);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) { first.current = false; return; }
    if (ch === cur) return;
    setPrev(cur);
    setCur(ch);
    setFlip((n) => n + 1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ch]);

  const sep = ch === ":" || ch === " ";
  if (sep) return <span className={cn("flap-sep", ch === " " && "w-[0.22em]")}>{ch === ":" ? ":" : ""}</span>;

  return (
    <span className={cn("flap", tone === "boston" ? "flap-boston" : "flap-revere")} aria-hidden>
      {/* resting halves: new top, old bottom until the falling flap covers it */}
      <span className="flap-half flap-top"><span>{cur}</span></span>
      <span className="flap-half flap-bottom"><span>{flip ? prev : cur}</span></span>
      {flip > 0 && (
        <span key={flip} className="contents">
          <span className="flap-half flap-top flap-fall"><span>{prev}</span></span>
          <span className="flap-half flap-bottom flap-rise"><span>{cur}</span></span>
        </span>
      )}
      <span className="flap-hinge" />
    </span>
  );
}

/** Renders `text` (e.g. "12", "2:41", "NOW") on flaps. `label` is what screen readers hear. */
export default function SplitFlap({ text, tone, label, className }: { text: string; tone: "boston" | "revere"; label: string; className?: string }) {
  return (
    <span role="img" aria-label={label} className={cn("inline-flex items-center gap-[0.06em]", className)}>
      {text.split("").map((ch, i) => <Flap key={`${text.length}-${i}`} ch={ch} tone={tone} />)}
    </span>
  );
}
