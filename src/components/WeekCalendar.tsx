import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DayEntry, RateConfig } from "@/lib/calc";
import { DAY_TYPE_LABELS, breakdown, fmtGBP } from "@/lib/calc";
import { DayTimeline } from "@/components/DayTimeline";

type Props = {
  entries: DayEntry[];
  rates: RateConfig;
};

const startOfWeek = (d: Date) => {
  const date = new Date(d);
  date.setHours(0, 0, 0, 0);
  // ISO week — Monday start
  const day = date.getDay();
  const diff = (day + 6) % 7;
  date.setDate(date.getDate() - diff);
  return date;
};

const fmtDate = (d: Date) => d.toISOString().slice(0, 10);
const fmtDay = (d: Date) => d.toLocaleDateString("en-GB", { weekday: "short" }).toUpperCase();
const fmtDayNum = (d: Date) => d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
const fmtRange = (a: Date, b: Date) =>
  `${a.toLocaleDateString("en-GB", { day: "2-digit", month: "short" })} – ${b.toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })}`;

export const WeekCalendar = ({ entries, rates }: Props) => {
  const [anchor, setAnchor] = useState<Date>(() => startOfWeek(new Date()));

  const days = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(anchor);
      d.setDate(anchor.getDate() + i);
      return d;
    });
  }, [anchor]);

  const weekEnd = days[6];

  const byDate = useMemo(() => {
    const map = new Map<string, DayEntry[]>();
    for (const e of entries) {
      const arr = map.get(e.date) || [];
      arr.push(e);
      map.set(e.date, arr);
    }
    return map;
  }, [entries]);

  const weekTotal = useMemo(() => {
    let total = 0;
    let hours = 0;
    for (const d of days) {
      const list = byDate.get(fmtDate(d)) || [];
      for (const e of list) {
        const b = breakdown(e, rates);
        total += b.total;
        hours += b.worked;
      }
    }
    return { total, hours };
  }, [days, byDate, rates]);

  const shift = (delta: number) => {
    const next = new Date(anchor);
    next.setDate(anchor.getDate() + delta * 7);
    setAnchor(startOfWeek(next));
  };

  const todayKey = fmtDate(new Date());

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Week of</p>
          <h3 className="text-base font-medium text-foreground">{fmtRange(anchor, weekEnd)}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground hidden sm:inline">
            {weekTotal.hours.toFixed(1)}h · {fmtGBP(weekTotal.total)}
          </span>
          <button onClick={() => shift(-1)} aria-label="Previous week"
            className="p-2 rounded-lg border border-border bg-obsidian hover:border-primary/40 transition-colors">
            <ChevronLeft className="size-4 text-muted-foreground" />
          </button>
          <button onClick={() => setAnchor(startOfWeek(new Date()))}
            className="px-3 py-2 rounded-lg border border-border bg-obsidian text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
            Today
          </button>
          <button onClick={() => shift(1)} aria-label="Next week"
            className="p-2 rounded-lg border border-border bg-obsidian hover:border-primary/40 transition-colors">
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="space-y-2">
        {days.map((d) => {
          const key = fmtDate(d);
          const list = byDate.get(key) || [];
          const isToday = key === todayKey;
          return (
            <div key={key}
              className={`flex flex-col sm:flex-row gap-3 bg-carbon/50 border rounded-xl p-3 ${
                isToday ? "border-primary/40" : "border-border"
              }`}>
              <div className="sm:w-28 shrink-0 flex sm:flex-col sm:justify-center items-baseline sm:items-start gap-2 sm:gap-0.5">
                <span className={`text-[10px] font-mono uppercase tracking-widest ${isToday ? "text-primary" : "text-muted-foreground"}`}>
                  {fmtDay(d)}
                </span>
                <span className="text-sm text-foreground font-mono tabular-nums">{fmtDayNum(d)}</span>
              </div>

              <div className="flex-1 min-w-0 space-y-2">
                {list.length === 0 && (
                  <div className="text-[11px] font-mono uppercase tracking-widest text-muted-foreground/60 py-3">
                    — no entry
                  </div>
                )}
                {list.map((e) => {
                  const b = breakdown(e, rates);
                  return (
                    <div key={e.id} className="space-y-2">
                      <div className="flex items-center justify-between gap-2 text-[10px] font-mono uppercase tracking-widest">
                        <span className="flex items-center gap-2 min-w-0">
                          <span className="px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">
                            {DAY_TYPE_LABELS[e.dayType ?? "shoot"]}
                          </span>
                          <span className="text-muted-foreground truncate">
                            {e.actualStart && e.actualStart !== e.call ? `${e.actualStart}→` : ""}{e.call}–{e.wrap}
                          </span>
                          {e.location && <span className="text-foreground/70 truncate normal-case tracking-normal">· {e.location}</span>}
                        </span>
                        <span className="text-accent shrink-0 normal-case tracking-normal">{fmtGBP(b.total)}</span>
                      </div>
                      <DayTimeline entry={e} rates={rates} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
