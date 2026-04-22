import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import type { DayEntry, DayType } from "@/lib/calc";
import { DAY_TYPES, DAY_TYPE_LABELS } from "@/lib/calc";

type Props = { onSubmit: (entry: Omit<DayEntry, "id">) => void; defaultShootingOT?: boolean; defaultShootingOTMinutes?: number; basicHours?: number };

const today = () => new Date().toISOString().slice(0, 10);

// Add hours (decimal) to a HH:MM time string, wrapping at 24h.
const addHoursToTime = (hhmm: string, hours: number): string => {
  if (!/^\d{2}:\d{2}$/.test(hhmm)) return hhmm;
  const [h, m] = hhmm.split(":").map(Number);
  const total = h * 60 + m + Math.round(hours * 60);
  const norm = ((total % (24 * 60)) + 24 * 60) % (24 * 60);
  const hh = String(Math.floor(norm / 60)).padStart(2, "0");
  const mm = String(norm % 60).padStart(2, "0");
  return `${hh}:${mm}`;
};

export const EntryForm = ({ onSubmit, defaultShootingOT = false, defaultShootingOTMinutes = 60, basicHours = 10 }: Props) => {
  const [date, setDate] = useState(today());
  const [dayType, setDayType] = useState<DayType>("shoot");
  const [location, setLocation] = useState("");
  const [call, setCall] = useState("07:30");
  const [actualStart, setActualStart] = useState("");
  const [wrap, setWrap] = useState(() => addHoursToTime("07:30", basicHours));
  const [actualWrap, setActualWrap] = useState("");

  // When the call time changes, auto-shift wrap to call + basicHours so the
  // session defaults to a standard working day. Users can still edit wrap after.
  const handleCallChange = (next: string) => {
    setCall(next);
    if (/^\d{2}:\d{2}$/.test(next)) setWrap(addHoursToTime(next, basicHours));
  };
  const [mealMinutes, setMeal] = useState(60);
  const [travelMinutes, setTravel] = useState(0);
  const [isNight, setNight] = useState(false);
  const [perDiem, setPerDiem] = useState(false);
  const [shootingOT, setShootingOT] = useState(defaultShootingOT);
  const [shootingOTMinutes, setShootingOTMinutes] = useState<number>(defaultShootingOTMinutes);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!/^\d{2}:\d{2}$/.test(call) || !/^\d{2}:\d{2}$/.test(wrap)) {
      toast({ title: "Invalid time", description: "Use HH:MM format." });
      return;
    }
    if (actualStart && !/^\d{2}:\d{2}$/.test(actualStart)) {
      toast({ title: "Invalid actual start", description: "Use HH:MM format or leave blank." });
      return;
    }
    if (actualWrap && !/^\d{2}:\d{2}$/.test(actualWrap)) {
      toast({ title: "Invalid actual wrap", description: "Use HH:MM format or leave blank." });
      return;
    }
    onSubmit({ date, dayType, location: location.trim(), call, actualStart: actualStart || undefined, wrap, actualWrap: actualWrap || undefined, mealMinutes, travelMinutes, isNight, perDiem, shootingOT, shootingOTMinutes: shootingOT ? shootingOTMinutes : undefined });
    toast({ title: "Entry captured", description: `${DAY_TYPE_LABELS[dayType]} · ${date} · ${call}–${wrap}` });
  };

  return (
    <form onSubmit={submit} className="grid grid-cols-2 gap-x-6 gap-y-6 relative z-10">
      <Field label="Day Type" className="col-span-2">
        <div className="flex flex-wrap gap-2">
          {DAY_TYPES.map((t) => {
            const active = t === dayType;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setDayType(t)}
                aria-pressed={active}
                className={`px-3 py-2 rounded-lg text-xs font-semibold uppercase tracking-widest border transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground border-primary shadow-[0_0_16px_hsl(var(--primary)/0.35)]"
                    : "bg-obsidian text-muted-foreground border-border hover:text-foreground hover:border-primary/40"
                }`}
              >
                {DAY_TYPE_LABELS[t]}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Date of Session" className="col-span-2 md:col-span-1">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="w-full bg-obsidian border border-border rounded-lg px-4 py-3 text-foreground font-mono focus:outline-none focus:border-primary/60 transition-colors" />
      </Field>
      <Field label="Unit Location" className="col-span-2 md:col-span-1">
        <input value={location} onChange={(e) => setLocation(e.target.value)} maxLength={80}
          placeholder="Shepperton Studios, Stage 4"
          className="w-full bg-obsidian border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-primary/60 transition-colors" />
      </Field>

      <Field label="Call Time" className="col-span-2 md:col-span-1">
        <input value={call} onChange={(e) => handleCallChange(e.target.value)} placeholder="07:30"
          className="w-full bg-obsidian border border-border rounded-lg px-4 py-4 text-2xl text-foreground font-mono tabular-nums focus:outline-none focus:border-accent/60" />
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground/70 font-mono">From call sheet · auto-sets wrap +{basicHours}h</p>
      </Field>
      <Field label="Actual Start" className="col-span-2 md:col-span-1">
        <input value={actualStart} onChange={(e) => setActualStart(e.target.value)} placeholder="06:45"
          className="w-full bg-obsidian border border-border rounded-lg px-4 py-4 text-2xl text-foreground font-mono tabular-nums focus:outline-none focus:border-primary/60" />
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground/70 font-mono">If pre-call (else blank)</p>
      </Field>
      <Field label="Wrap Time" className="col-span-2 md:col-span-1">
        <input value={wrap} onChange={(e) => setWrap(e.target.value)} placeholder="20:45"
          className="w-full bg-obsidian border border-border rounded-lg px-4 py-4 text-2xl text-foreground font-mono tabular-nums focus:outline-none focus:border-ruby/60" />
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground/70 font-mono">Scheduled wrap from call sheet</p>
      </Field>
      <Field label="Actual Wrap" className="col-span-2 md:col-span-1">
        <input value={actualWrap} onChange={(e) => setActualWrap(e.target.value)} placeholder="21:30"
          className="w-full bg-obsidian border border-border rounded-lg px-4 py-4 text-2xl text-foreground font-mono tabular-nums focus:outline-none focus:border-ruby/60" />
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground/70 font-mono">If ran late (else blank) — drives OT</p>
      </Field>

      <Field label="Meal Break (mins)">
        <input type="number" min={0} max={240} value={mealMinutes}
          onChange={(e) => setMeal(Number(e.target.value) || 0)}
          className="w-full bg-obsidian/50 border border-border rounded-lg px-4 py-3 text-lg text-foreground font-mono tabular-nums focus:outline-none focus:border-primary/60" />
      </Field>
      <Field label="Travel (mins)">
        <input type="number" min={0} max={600} value={travelMinutes}
          onChange={(e) => setTravel(Number(e.target.value) || 0)}
          className="w-full bg-obsidian/50 border border-border rounded-lg px-4 py-3 text-lg text-foreground font-mono tabular-nums focus:outline-none focus:border-primary/60" />
      </Field>

      <div className="col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex items-center gap-3 cursor-pointer select-none bg-obsidian/60 border border-border rounded-lg px-4 py-3 hover:border-primary/40 transition-colors">
          <input type="checkbox" checked={isNight} onChange={(e) => setNight(e.target.checked)}
            className="size-4 accent-[hsl(var(--accent))]" />
          <span className="text-sm text-foreground">Night shoot <span className="text-muted-foreground">— premium</span></span>
        </label>
        <label className="flex items-center gap-3 cursor-pointer select-none bg-obsidian/60 border border-border rounded-lg px-4 py-3 hover:border-primary/40 transition-colors">
          <input type="checkbox" checked={perDiem} onChange={(e) => setPerDiem(e.target.checked)}
            className="size-4 accent-[hsl(var(--primary))]" />
          <span className="text-sm text-foreground">Per diem <span className="text-muted-foreground">— claim daily allowance</span></span>
        </label>
        <label className="sm:col-span-2 flex flex-wrap items-center gap-3 cursor-pointer select-none bg-obsidian/60 border border-border rounded-lg px-4 py-3 hover:border-ruby/40 transition-colors">
          <input type="checkbox" checked={shootingOT} onChange={(e) => setShootingOT(e.target.checked)}
            className="size-4 accent-[hsl(var(--ruby))]" />
          <span className="text-sm text-foreground flex-1 min-w-[10rem]">Shooting OT <span className="text-muted-foreground">— window after basic at 2×</span></span>
          <span className="flex items-center gap-2" onClick={(e) => e.preventDefault()}>
            <input
              type="number"
              min={0}
              max={480}
              step={15}
              value={shootingOTMinutes}
              disabled={!shootingOT}
              onChange={(e) => setShootingOTMinutes(Math.max(0, Number(e.target.value) || 0))}
              onClick={(e) => e.stopPropagation()}
              className="w-20 bg-obsidian border border-border rounded-md px-2 py-1.5 text-sm text-foreground font-mono tabular-nums text-right focus:outline-none focus:border-ruby/60 disabled:opacity-40"
            />
            <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">mins @ 2×</span>
          </span>
        </label>
      </div>

      <div className="col-span-2 flex gap-3 pt-2">
        <Button type="submit" variant="volt" size="xl" className="flex-1">CAPTURE ENTRY</Button>
        <Button type="reset" variant="outlineGlass" size="xl"
          onClick={() => { setLocation(""); setCall("07:30"); setActualStart(""); setWrap(addHoursToTime("07:30", basicHours)); setActualWrap(""); setMeal(60); setTravel(0); setNight(false); setPerDiem(false); setShootingOT(defaultShootingOT); setShootingOTMinutes(defaultShootingOTMinutes); }}>
          Reset
        </Button>
      </div>
    </form>
  );
};

const Field = ({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) => (
  <div className={`space-y-2 ${className}`}>
    <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</label>
    {children}
  </div>
);
