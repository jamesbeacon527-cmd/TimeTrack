import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import type { DayEntry, DayType } from "@/lib/calc";
import { DAY_TYPES, DAY_TYPE_LABELS } from "@/lib/calc";

type Props = {
  entry: DayEntry;
  onSave: (patch: Partial<DayEntry>) => void;
  onCancel: () => void;
  basicHours?: number;
};

const addHoursToTime = (hhmm: string, hours: number): string => {
  if (!/^\d{2}:\d{2}$/.test(hhmm)) return hhmm;
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + Math.round(hours * 60);
  const norm = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const hh = String(Math.floor(norm / 60)).padStart(2, "0");
  const mm = String(norm % 60).padStart(2, "0");
  return `${hh}:${mm}`;
};

export const EntryEditor = ({ entry, onSave, onCancel, basicHours = 10 }: Props) => {
  const [date, setDate] = useState(entry.date);
  const [dayType, setDayType] = useState<DayType>(entry.dayType ?? "shoot");
  const [location, setLocation] = useState(entry.location ?? "");
  const [call, setCall] = useState(entry.call);
  const [actualStart, setActualStart] = useState(entry.actualStart ?? "");
  const [wrap, setWrap] = useState(entry.wrap);
  const [actualWrap, setActualWrap] = useState(entry.actualWrap ?? "");
  const [mealMinutes, setMeal] = useState(entry.mealMinutes);
  const [travelMinutes, setTravel] = useState(entry.travelMinutes);
  const [isNight, setNight] = useState(!!entry.isNight);
  const [perDiem, setPerDiem] = useState(!!entry.perDiem);
  const [shootingOT, setShootingOT] = useState(!!entry.shootingOT);
  const [shootingOTMinutes, setShootingOTMinutes] = useState<number>(entry.shootingOTMinutes ?? 60);
  const [consecutiveDay, setConsecutiveDay] = useState<number>(entry.consecutiveDay ?? 1);

  // Reset state if a different entry becomes active.
  useEffect(() => {
    setDate(entry.date);
    setDayType(entry.dayType ?? "shoot");
    setLocation(entry.location ?? "");
    setCall(entry.call);
    setActualStart(entry.actualStart ?? "");
    setWrap(entry.wrap);
    setActualWrap(entry.actualWrap ?? "");
    setMeal(entry.mealMinutes);
    setTravel(entry.travelMinutes);
    setNight(!!entry.isNight);
    setPerDiem(!!entry.perDiem);
    setShootingOT(!!entry.shootingOT);
    setShootingOTMinutes(entry.shootingOTMinutes ?? 60);
    setConsecutiveDay(entry.consecutiveDay ?? 1);
  }, [entry.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{2}:\d{2}$/.test(call) || !/^\d{2}:\d{2}$/.test(wrap)) return;
    if (actualStart && !/^\d{2}:\d{2}$/.test(actualStart)) return;
    if (actualWrap && !/^\d{2}:\d{2}$/.test(actualWrap)) return;
    onSave({ date, dayType, location: location.trim(), call, actualStart: actualStart || undefined, wrap, actualWrap: actualWrap || undefined, mealMinutes, travelMinutes, isNight, perDiem, shootingOT, shootingOTMinutes: shootingOT ? shootingOTMinutes : undefined, consecutiveDay });
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-3 pt-4 border-t border-border">
      <Field label="Day Type" className="col-span-2">
        <div className="flex flex-wrap gap-1.5">
          {DAY_TYPES.map((t) => {
            const active = t === dayType;
            return (
              <button key={t} type="button" onClick={() => setDayType(t)} aria-pressed={active}
                className={`px-2.5 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-widest border transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-obsidian text-muted-foreground border-border hover:text-foreground"
                }`}>
                {DAY_TYPE_LABELS[t]}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Date">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className={input} />
      </Field>
      <Field label="Location">
        <input value={location} maxLength={80} onChange={(e) => setLocation(e.target.value)} className={input} />
      </Field>

      <Field label="Call (sheet)">
        <input value={call} onChange={(e) => {
          const next = e.target.value;
          setCall(next);
          if (/^\d{2}:\d{2}$/.test(next)) setWrap(addHoursToTime(next, basicHours));
        }} placeholder="07:30" className={input + " font-mono tabular-nums"} />
      </Field>
      <Field label="Actual start">
        <input value={actualStart} onChange={(e) => setActualStart(e.target.value)} placeholder="06:45" className={input + " font-mono tabular-nums"} />
      </Field>
      <Field label="Wrap (sheet)">
        <input value={wrap} onChange={(e) => setWrap(e.target.value)} placeholder="20:00" className={input + " font-mono tabular-nums"} />
      </Field>
      <Field label="Actual wrap">
        <input value={actualWrap} onChange={(e) => setActualWrap(e.target.value)} placeholder="21:30" className={input + " font-mono tabular-nums"} />
      </Field>

      <Field label="Meal (mins)">
        <input type="number" min={0} max={240} value={mealMinutes} onChange={(e) => setMeal(Number(e.target.value) || 0)} className={input + " font-mono tabular-nums"} />
      </Field>
      <Field label="Travel (mins)">
        <input type="number" min={0} max={600} value={travelMinutes} onChange={(e) => setTravel(Number(e.target.value) || 0)} className={input + " font-mono tabular-nums"} />
      </Field>

      <label className="col-span-1 flex items-center gap-2 cursor-pointer select-none bg-obsidian/60 border border-border rounded-md px-3 py-2">
        <input type="checkbox" checked={isNight} onChange={(e) => setNight(e.target.checked)} className="size-4 accent-[hsl(var(--accent))]" />
        <span className="text-xs text-foreground">Night shoot</span>
      </label>
      <label className="col-span-1 flex items-center gap-2 cursor-pointer select-none bg-obsidian/60 border border-border rounded-md px-3 py-2">
        <input type="checkbox" checked={perDiem} onChange={(e) => setPerDiem(e.target.checked)} className="size-4 accent-[hsl(var(--primary))]" />
        <span className="text-xs text-foreground">Per diem</span>
      </label>
      <label className="col-span-2 flex flex-wrap items-center gap-2 cursor-pointer select-none bg-obsidian/60 border border-border rounded-md px-3 py-2">
        <input type="checkbox" checked={shootingOT} onChange={(e) => setShootingOT(e.target.checked)} className="size-4 accent-[hsl(var(--ruby))]" />
        <span className="text-xs text-foreground flex-1 min-w-[8rem]">Shooting OT (window @ 2×)</span>
        <span className="flex items-center gap-1.5" onClick={(e) => e.preventDefault()}>
          <input
            type="number" min={0} max={480} step={15}
            value={shootingOTMinutes} disabled={!shootingOT}
            onChange={(e) => setShootingOTMinutes(Math.max(0, Number(e.target.value) || 0))}
            onClick={(e) => e.stopPropagation()}
            className="w-16 bg-obsidian border border-border rounded px-2 py-1 text-xs text-foreground font-mono tabular-nums text-right focus:outline-none focus:border-ruby/60 disabled:opacity-40"
          />
          <span className="text-[9px] uppercase tracking-widest text-muted-foreground font-mono">mins</span>
        </span>
      </label>

      <Field label="Day in week (1–7)" className="col-span-2">
        <div className="flex gap-1">
          {[1,2,3,4,5,6,7].map((n) => {
            const active = n === consecutiveDay;
            const tone = n >= 7 ? "ruby" : n === 6 ? "accent" : "primary";
            return (
              <button key={n} type="button" onClick={() => setConsecutiveDay(n)} aria-pressed={active}
                className={`flex-1 py-1.5 rounded-md text-xs font-mono border transition-colors ${
                  active
                    ? tone === "ruby"
                      ? "bg-ruby text-background border-ruby"
                      : tone === "accent"
                      ? "bg-accent text-background border-accent"
                      : "bg-primary text-primary-foreground border-primary"
                    : "bg-obsidian text-muted-foreground border-border hover:text-foreground"
                }`}>
                {n}
              </button>
            );
          })}
        </div>
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground/70 font-mono mt-1">6th day = 1.5×, 7th day = 2× (BECTU)</p>
      </Field>

      <div className="col-span-2 flex gap-2 pt-1">
        <Button type="submit" variant="volt" size="sm" className="flex-1">Save changes</Button>
        <Button type="button" variant="outlineGlass" size="sm" onClick={onCancel}>Cancel</Button>
      </div>
    </form>
  );
};

const input =
  "w-full bg-obsidian border border-border rounded-md px-3 py-2 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors";

const Field = ({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) => (
  <div className={`space-y-1 ${className}`}>
    <label className="text-[9px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</label>
    {children}
  </div>
);
