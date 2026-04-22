import { useMemo, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { DayEntry, RateConfig } from "@/lib/calc";
import { DAY_TYPE_LABELS, breakdown, fmtGBP, fmtHours } from "@/lib/calc";

type Props = {
  entries: DayEntry[];
  rates: RateConfig;
  onSelectDay?: (date: string) => void;
};

const startOfMonth = (d: Date) => {
  const x = new Date(d.getFullYear(), d.getMonth(), 1);
  x.setHours(0, 0, 0, 0);
  return x;
};

const startOfMonthGrid = (d: Date) => {
  const first = startOfMonth(d);
  const day = first.getDay();
  const diff = (day + 6) % 7; // Monday-start
  const x = new Date(first);
  x.setDate(first.getDate() - diff);
  return x;
};

const fmtKey = (d: Date) => d.toISOString().slice(0, 10);

const DAY_TYPE_TONE: Record<string, string> = {
  shoot: "bg-primary",
  travel: "bg-accent",
  prep: "bg-foreground/60",
  rig: "bg-foreground/40",
  rehearsal: "bg-accent/60",
  hold: "bg-muted-foreground/40",
};

export const MonthCalendar = ({ entries, rates, onSelectDay }: Props) => {
  const [anchor, setAnchor] = useState(() => startOfMonth(new Date()));

  const cells = useMemo(() => {
    const start = startOfMonthGrid(anchor);
    return Array.from({ length: 42 }, (_, i) => {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      return d;
    });
  }, [anchor]);

  const byDate = useMemo(() => {
    const map = new Map<string, DayEntry[]>();
    for (const e of entries) {
      const arr = map.get(e.date) || [];
      arr.push(e);
      map.set(e.date, arr);
    }
    return map;
  }, [entries]);

  const monthTotal = useMemo(() => {
    let total = 0;
    let hours = 0;
    let days = 0;
    for (const e of entries) {
      const d = new Date(e.date);
      if (d.getMonth() === anchor.getMonth() && d.getFullYear() === anchor.getFullYear()) {
        const b = breakdown(e, rates);
        total += b.total;
        hours += b.worked;
        days += 1;
      }
    }
    return { total, hours, days };
  }, [entries, rates, anchor]);

  const shift = (delta: number) => {
    const next = new Date(anchor.getFullYear(), anchor.getMonth() + delta, 1);
    setAnchor(next);
  };

  const todayKey = fmtKey(new Date());
  const monthLabel = anchor.toLocaleDateString("en-GB", { month: "long", year: "numeric" });
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground">Month</p>
          <h3 className="text-base font-medium text-foreground">{monthLabel}</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground hidden sm:inline">
            {monthTotal.days}d · {monthTotal.hours.toFixed(1)}h · {fmtGBP(monthTotal.total)}
          </span>
          <button onClick={() => shift(-1)} aria-label="Previous month"
            className="p-2 rounded-lg border border-border bg-obsidian hover:border-primary/40 transition-colors">
            <ChevronLeft className="size-4 text-muted-foreground" />
          </button>
          <button onClick={() => setAnchor(startOfMonth(new Date()))}
            className="px-3 py-2 rounded-lg border border-border bg-obsidian text-[10px] font-mono uppercase tracking-widest text-muted-foreground hover:text-foreground hover:border-primary/40 transition-colors">
            Today
          </button>
          <button onClick={() => shift(1)} aria-label="Next month"
            className="p-2 rounded-lg border border-border bg-obsidian hover:border-primary/40 transition-colors">
            <ChevronRight className="size-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-1 text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
        {weekdays.map((w) => (
          <div key={w} className="px-2 py-1">{w}</div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((d) => {
          const key = fmtKey(d);
          const inMonth = d.getMonth() === anchor.getMonth();
          const list = byDate.get(key) || [];
          const isToday = key === todayKey;
          const dayTotal = list.reduce((s, e) => s + breakdown(e, rates).total, 0);
          const dayHours = list.reduce((s, e) => s + breakdown(e, rates).worked, 0);

          return (
            <button
              key={key}
              type="button"
              onClick={() => onSelectDay?.(key)}
              className={`relative min-h-[5.5rem] text-left p-2 rounded-lg border transition-colors ${
                inMonth ? "bg-carbon/50" : "bg-obsidian/40 opacity-50"
              } ${
                isToday ? "border-primary/60" : "border-border hover:border-primary/30"
              }`}
            >
              <div className="flex items-center justify-between">
                <span className={`text-xs font-mono tabular-nums ${isToday ? "text-primary" : "text-foreground"}`}>
                  {d.getDate()}
                </span>
                {list.length > 0 && (
                  <span className="text-[9px] font-mono text-accent tabular-nums">{fmtGBP(dayTotal).replace(".00", "")}</span>
                )}
              </div>

              {list.length > 0 && (
                <div className="mt-1 space-y-1">
                  {list.slice(0, 2).map((e) => (
                    <div key={e.id} className="flex items-center gap-1.5 min-w-0">
                      <span className={`size-1.5 rounded-full shrink-0 ${DAY_TYPE_TONE[e.dayType ?? "shoot"] || "bg-primary"}`} aria-hidden />
                      <span className="text-[10px] text-foreground/80 truncate">
                        {DAY_TYPE_LABELS[e.dayType ?? "shoot"]}
                      </span>
                    </div>
                  ))}
                  {list.length > 2 && (
                    <div className="text-[9px] font-mono text-muted-foreground">+{list.length - 2} more</div>
                  )}
                  <div className="text-[9px] font-mono text-muted-foreground tabular-nums">{fmtHours(dayHours)}h</div>
                </div>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
};
