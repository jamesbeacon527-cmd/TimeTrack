import type { DayEntry, RateConfig } from "@/lib/calc";
import { breakdown, fmtHours, workedHours } from "@/lib/calc";

type Props = { entry: DayEntry; rates: RateConfig };

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return (h || 0) * 60 + (m || 0);
};

type Segment = {
  key: string;
  label: string;
  startMin: number; // minutes from call
  endMin: number;
  className: string;
  swatch: string;
};

/**
 * Build linear segments across the day timeline (call → wrap), in minutes.
 * Order of layout: pre-meal worked → meal break (unpaid) → post-meal worked.
 * Worked time is split into Basic → OT 1.5x → OT 2x in sequence.
 */
function buildSegments(entry: DayEntry, rates: RateConfig): { segments: Segment[]; totalMin: number; startMin: number } {
  if (!entry.call || !entry.wrap) return { segments: [], totalMin: 0, startMin: 0 };

  const callMin = toMinutes(entry.call);
  let wrapMin = toMinutes(entry.wrap);
  if (wrapMin <= callMin) wrapMin += 24 * 60;

  let actualStartMins = entry.actualStart && /^\d{2}:\d{2}$/.test(entry.actualStart) ? toMinutes(entry.actualStart) : callMin;
  if (actualStartMins > callMin && actualStartMins > 12 * 60 && callMin < 12 * 60) {
    actualStartMins -= 24 * 60;
  }
  
  let actualWrapMins = entry.actualWrap && /^\d{2}:\d{2}$/.test(entry.actualWrap) ? toMinutes(entry.actualWrap) : wrapMin;
  if (actualWrapMins < actualStartMins && actualWrapMins < 12 * 60 && actualStartMins >= 12 * 60) {
    actualWrapMins += 24 * 60; 
  } else if (actualWrapMins <= actualStartMins && actualStartMins - actualWrapMins < 12 * 60) {
    actualWrapMins += 24 * 60; 
  }

  const startMin = Math.min(actualStartMins, callMin);
  const endMin = Math.max(actualWrapMins, wrapMin);
  const totalMin = Math.max(0, endMin - startMin);

  const preCallMin = Math.max(0, callMin - actualStartMins);
  
  const isRunningLunch = rates?.isRunningLunch ?? false;
  const meal = isRunningLunch ? 0 : Math.min(entry.mealMinutes || 0, totalMin - preCallMin);
  const postCallTotal = totalMin - preCallMin;
  const workedTotal = Math.max(0, postCallTotal - meal);
  const mealStart = preCallMin + Math.max(0, Math.round((postCallTotal - meal) / 2));
  const mealEnd = mealStart + meal;

  // Split worked minutes into basic / shooting-OT (2×) / standard-OT (1.5×) in order.
  const basicCap = Math.round(rates.basicHours * 60);
  const shootingOTCap = entry.shootingOT ? Math.round(entry.shootingOTMinutes ?? rates.shootingOTMinutes ?? 0) : 0;

  const basicMin = Math.min(workedTotal, basicCap);
  const ot2Min = Math.min(Math.max(0, workedTotal - basicCap), shootingOTCap);
  const ot15Min = Math.max(0, workedTotal - basicCap - shootingOTCap);

  const workedBuckets = [
    { name: "Basic", remaining: basicMin, className: "bg-primary/80", swatch: "bg-primary" },
    { name: "Shooting OT (2×)", remaining: ot2Min, className: "bg-ruby/80", swatch: "bg-ruby" },
    { name: "Overtime (1.5×)", remaining: ot15Min, className: "bg-amber/90", swatch: "bg-amber" },
  ];

  const segments: Segment[] = [];
  let cursor = 0;
  let bIdx = 0;

  // Pre-call segment first (rendered as a striped/highlighted block).
  if (preCallMin > 0) {
    segments.push({
      key: `precall-0`,
      label: "Pre-call",
      startMin: 0,
      endMin: preCallMin,
      className: "bg-orange-500/70",
      swatch: "bg-orange-500",
    });
    cursor = preCallMin;
  }

  const consumeWorked = (untilMin: number) => {
    while (cursor < untilMin && bIdx < workedBuckets.length) {
      const bucket = workedBuckets[bIdx];
      if (bucket.remaining <= 0) { bIdx++; continue; }
      const room = untilMin - cursor;
      const take = Math.min(room, bucket.remaining);
      if (take > 0) {
        segments.push({
          key: `${bucket.name}-${cursor}`,
          label: bucket.name,
          startMin: cursor,
          endMin: cursor + take,
          className: bucket.className,
          swatch: bucket.swatch,
        });
        cursor += take;
        bucket.remaining -= take;
      }
      if (bucket.remaining <= 0) bIdx++;
    }
    cursor = Math.max(cursor, untilMin);
  };

  consumeWorked(mealStart);
  if (meal > 0) {
    segments.push({
      key: `meal-${mealStart}`,
      label: "Meal",
      startMin: mealStart,
      endMin: mealEnd,
      className: "bg-muted/60",
      swatch: "bg-muted",
    });
    cursor = mealEnd;
  }
  consumeWorked(totalMin);

  return { segments, totalMin, startMin };
}

const fmtClock = (startMins: number, offsetMin: number) => {
  const total = (startMins + offsetMin) % (24 * 60);
  const h = Math.floor(total / 60);
  const m = total % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
};

export const DayTimeline = ({ entry, rates }: Props) => {
  const { segments, totalMin, startMin } = buildSegments(entry, rates);
  const b = breakdown(entry, rates);

  if (totalMin <= 0) {
    return <p className="text-xs text-muted-foreground font-mono">Set call and wrap times to see the timeline.</p>;
  }

  const mealSeg = segments.find(s => s.label === "Meal");
  const tickList: {pct: number, label: string, isEdge?: boolean}[] = [];
  tickList.push({ pct: 0, label: fmtClock(startMin, 0), isEdge: true });
  if (mealSeg && mealSeg.startMin > 0 && mealSeg.endMin < totalMin) {
    tickList.push({ pct: (mealSeg.startMin / totalMin) * 100, label: fmtClock(startMin, mealSeg.startMin) });
    tickList.push({ pct: (mealSeg.endMin / totalMin) * 100, label: fmtClock(startMin, mealSeg.endMin) });
  }
  tickList.push({ pct: 100, label: fmtClock(startMin, totalMin), isEdge: true });

  const startLabel = entry.actualStart && entry.actualStart !== entry.call
    ? `${entry.actualStart} start (call ${entry.call})`
    : `${entry.call} call`;
  const wrapLabel = entry.actualWrap && entry.actualWrap !== entry.wrap
    ? `${entry.actualWrap} wrap (sched ${entry.wrap})`
    : `${entry.wrap} wrap`;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-[9px] md:text-[10px] uppercase tracking-widest text-muted-foreground font-mono">
        <span>{startLabel}</span>
        <span>{fmtHours(workedHours(entry))} h worked · {(totalMin / 60).toFixed(2)} h elapsed</span>
        <span>{wrapLabel}</span>
      </div>

      <div
        className="relative h-9 w-full rounded-md overflow-hidden border border-border bg-obsidian"
        role="img"
        aria-label={`Timeline from ${entry.actualStart || entry.call} to ${entry.actualWrap || entry.wrap}`}
      >
        {segments.map((s) => {
          const left = (s.startMin / totalMin) * 100;
          const width = ((s.endMin - s.startMin) / totalMin) * 100;
          return (
            <div
              key={s.key}
              className={`absolute top-0 bottom-0 ${s.className} transition-colors`}
              style={{ left: `${left}%`, width: `${width}%` }}
              title={`${s.label} · ${fmtClock(startMin, s.startMin)}–${fmtClock(startMin, s.endMin)}`}
            />
          );
        })}
        {entry.isNight && (
          <div className="absolute inset-0 ring-1 ring-inset ring-accent/40 pointer-events-none" />
        )}
      </div>

      <div className="relative h-3">
        {tickList.map((t, idx) => {
          const alignClass = t.pct === 0 ? "translate-x-0" : t.pct === 100 ? "-translate-x-full" : "-translate-x-1/2";
          return (
            <div key={`${t.pct}-${idx}`} className={`absolute text-[9px] font-mono text-muted-foreground ${alignClass} ${t.isEdge ? '' : 'hidden md:block'}`} style={{ left: `${t.pct}%` }}>
              {t.label}
            </div>
          );
        })}
      </div>

      <div className="flex flex-wrap gap-x-4 gap-y-2 text-[10px] uppercase tracking-widest text-muted-foreground font-mono pt-2">
        <Legend swatch="bg-primary" label={`Basic ${fmtHours(b.basic)}h`} />
        {b.ot15 > 0 && (
          <span className="flex items-center gap-1.5">
            <span className="flex -space-x-1">
              {b.preCall > 0 && <span className="size-2.5 rounded-sm bg-orange-500 border border-obsidian" aria-hidden />}
              {(b.ot15 - b.preCall) > 0 && <span className="size-2.5 rounded-sm bg-amber border border-obsidian" aria-hidden />}
            </span>
            Overtime {fmtHours(b.ot15)}h
          </span>
        )}
        {b.ot2 > 0 && <Legend swatch="bg-ruby" label={`OT 2× ${fmtHours(b.ot2)}h`} />}
        {entry.mealMinutes > 0 && <Legend swatch="bg-muted" label={`Meal ${entry.mealMinutes}m`} />}
        {entry.isNight && <Legend swatch="bg-accent" label="Night premium" />}
      </div>
    </div>
  );
};

const Legend = ({ swatch, label }: { swatch: string; label: string }) => (
  <span className="flex items-center gap-2">
    <span className={`size-2.5 rounded-sm ${swatch}`} aria-hidden />
    {label}
  </span>
);
