import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import type { DayEntry, DayType } from "@/lib/calc";
import { DAY_TYPES, DAY_TYPE_LABELS } from "@/lib/calc";

type Props = { 
  onSubmit: (entry: Omit<DayEntry, "id">) => void; 
  existingEntries?: DayEntry[];
  recentLocations?: string[];
  defaultShootingOT?: boolean; 
  defaultShootingOTMinutes?: number; 
  basicHours?: number 
};

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

/** Corrects "2000" to "20:00" and ensures valid format during typing */
const formatTimeInput = (val: string): string => {
  const cleaned = val.replace(/[^\d]/g, "");
  if (cleaned.length === 4) {
    const hh = cleaned.slice(0, 2);
    const mm = cleaned.slice(2, 4);
    if (Number(hh) < 24 && Number(mm) < 60) {
      return `${hh}:${mm}`;
    }
  }
  return val;
};

export const EntryForm = ({ onSubmit, existingEntries = [], recentLocations = [], defaultShootingOT = false, defaultShootingOTMinutes = 60, basicHours = 10 }: Props) => {
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
    const fmt = formatTimeInput(next);
    setCall(fmt);
    if (/^\d{2}:\d{2}$/.test(fmt)) setWrap(addHoursToTime(fmt, basicHours));
  };
  const [mealMinutes, setMeal] = useState(basicHours === 10 ? 0 : 60);
  const [travelMinutes, setTravel] = useState(0);
  const [isNight, setNight] = useState(false);
  const [perDiem, setPerDiem] = useState(false);
  const [shootingOT, setShootingOT] = useState(defaultShootingOT);
  const [shootingOTMinutes, setShootingOTMinutes] = useState<number>(defaultShootingOTMinutes);

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Prevent duplicate entries for the same day
    if (existingEntries.some(ent => ent.date === date)) {
      toast({ title: "Duplicate Entry", description: `You already have an entry for ${date}.`, variant: "destructive" });
      return;
    }

    // Validate Required Fields
    if (!location.trim()) {
      toast({ title: "Missing Information", description: "Please provide a unit location.", variant: "destructive" });
      return;
    }

    // Validate Time Formats
    const timeRegex = /^([01]\d|2[0-3]):([0-5]\d)$/;
    if (!timeRegex.test(call) || !timeRegex.test(wrap)) {
      toast({ title: "Invalid time", description: "Use HH:MM format (24h).", variant: "destructive" });
      return;
    }

    if (actualStart && !timeRegex.test(actualStart)) {
      toast({ title: "Invalid actual start", description: "Use HH:MM format or leave blank.", variant: "destructive" });
      return;
    }
    if (actualWrap && !timeRegex.test(actualWrap)) {
      toast({ title: "Invalid actual wrap", description: "Use HH:MM format or leave blank.", variant: "destructive" });
      return;
    }

    // "Time Travel" check: Ensure wrap is not logically before call
    // (Accounting for shoots that cross midnight - a wrap can be numerically less than call)
    // However, if actualStart/Wrap are present, use those.
    const startVal = actualStart || call;
    const endVal = actualWrap || wrap;
    const startMins = startVal.split(":").map(Number).reduce((h, m) => h * 60 + m);
    const endMins = endVal.split(":").map(Number).reduce((h, m) => h * 60 + m);
    
    // Heuristic: If difference is negative and > 4 hours, it's probably an error rather than a late wrap.
    // If it's negative but small (e.g. wrap at 02:00 when call was 07:00), it's a long day.
    // If wrap is 06:00 and call is 07:00, that's 23 hours later.
    // A simple warning if wrap is exactly call.
    if (startMins === endMins) {
      toast({ title: "Zero Duration", description: "Call and Wrap times cannot be identical.", variant: "destructive" });
      return;
    }

    onSubmit({ 
      date, 
      dayType, 
      location: location.trim(), 
      call, 
      actualStart: actualStart || undefined, 
      wrap, 
      actualWrap: actualWrap || undefined, 
      mealMinutes: basicHours === 10 ? 0 : Math.max(0, mealMinutes), 
      travelMinutes: Math.max(0, travelMinutes), 
      isNight, 
      perDiem, 
      shootingOT, 
      shootingOTMinutes: shootingOT ? Math.max(0, shootingOTMinutes) : undefined 
    });
    
    toast({ title: "Entry captured", description: `${DAY_TYPE_LABELS[dayType]} · ${date} · ${call}–${wrap}` });
  };

  const isRest = dayType === "rest";
  const isTravel = dayType === "travel";

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-y-6 md:grid-cols-2 md:gap-x-6 relative z-10">
      <Field label="Day Type" className="md:col-span-2">
        <div className="flex flex-wrap gap-2">
          {DAY_TYPES.map((t) => {
            const active = t === dayType;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setDayType(t)}
                aria-pressed={active}
                className={`px-3 py-2 rounded-lg text-[10px] md:text-xs font-semibold uppercase tracking-widest border transition-colors ${
                  active
                    ? "bg-primary text-primary-foreground border-primary shadow-[0_0_12px_hsl(var(--primary)/0.25)]"
                    : "bg-obsidian text-muted-foreground border-border hover:text-foreground hover:border-primary/40"
                }`}
              >
                {DAY_TYPE_LABELS[t]}
              </button>
            );
          })}
        </div>
      </Field>

      <Field label="Date of Session">
        <input type="date" value={date} onChange={(e) => setDate(e.target.value)}
          className="w-full bg-obsidian border border-border rounded-lg px-4 py-3 text-foreground font-mono focus:outline-none focus:border-primary/60 transition-colors" />
      </Field>
      <Field label="Unit Location">
        <div className="space-y-1">
          <input 
            value={location} 
            onChange={(e) => setLocation(e.target.value)} 
            maxLength={80}
            list="recent-locations"
            placeholder="Shepperton Studios, Stage 4"
            className="w-full bg-obsidian border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-primary/60 transition-colors" 
          />
          <datalist id="recent-locations">
            {recentLocations.map(loc => (
              <option key={loc} value={loc} />
            ))}
          </datalist>
        </div>
      </Field>

      {!isRest && !isTravel && (
        <>
          <Field label="Call Time">
            <input value={call} onChange={(e) => handleCallChange(e.target.value)} placeholder="07:30"
              className="w-full bg-obsidian border border-border rounded-lg px-4 py-3 md:py-4 text-xl md:text-2xl text-foreground font-mono tabular-nums focus:outline-none focus:border-accent/60" />
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground/70 font-mono">From call sheet</p>
          </Field>
          <Field label="Actual Start">
            <input value={actualStart} onChange={(e) => setActualStart(formatTimeInput(e.target.value))} placeholder="06:45"
              className="w-full bg-obsidian border border-border rounded-lg px-4 py-3 md:py-4 text-xl md:text-2xl text-foreground font-mono tabular-nums focus:outline-none focus:border-primary/60" />
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground/70 font-mono italic">If pre-call</p>
          </Field>
          <Field label="Wrap Time">
            <input value={wrap} onChange={(e) => setWrap(formatTimeInput(e.target.value))} placeholder="20:45"
              className="w-full bg-obsidian border border-border rounded-lg px-4 py-3 md:py-4 text-xl md:text-2xl text-foreground font-mono tabular-nums focus:outline-none focus:border-ruby/60" />
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground/70 font-mono">Scheduled wrap</p>
          </Field>
          <Field label="Actual Wrap">
            <input value={actualWrap} onChange={(e) => setActualWrap(formatTimeInput(e.target.value))} placeholder="21:30"
              className="w-full bg-obsidian border border-border rounded-lg px-4 py-3 md:py-4 text-xl md:text-2xl text-foreground font-mono tabular-nums focus:outline-none focus:border-ruby/60" />
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground/70 font-mono italic">If ran late</p>
          </Field>

          <Field label="Meal (mins)">
            <input type="number" min={0} max={240} value={basicHours === 10 ? 0 : mealMinutes}
              disabled={basicHours === 10}
              onChange={(e) => setMeal(Number(e.target.value) || 0)}
              className="w-full bg-obsidian/50 border border-border rounded-lg px-4 py-3 text-lg text-foreground font-mono tabular-nums focus:outline-none focus:border-primary/60 disabled:opacity-40" />
            {basicHours === 10 && <p className="text-[9px] uppercase tracking-widest text-primary font-mono mt-1 font-bold italic">Running Lunch</p>}
          </Field>
          <Field label="Travel (mins)">
            <input type="number" min={0} max={600} value={travelMinutes}
              onChange={(e) => setTravel(Number(e.target.value) || 0)}
              className="w-full bg-obsidian/50 border border-border rounded-lg px-4 py-3 text-lg text-foreground font-mono tabular-nums focus:outline-none focus:border-primary/60" />
          </Field>
        </>
      )}

      <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-3">
        {!isRest && !isTravel && (
          <label className="flex items-center gap-3 cursor-pointer select-none bg-obsidian/60 border border-border rounded-lg px-4 py-3 hover:border-primary/40 transition-colors">
            <input type="checkbox" checked={isNight} onChange={(e) => setNight(e.target.checked)}
              className="size-4 accent-[hsl(var(--accent))]" />
            <span className="text-xs text-foreground font-medium">Night shoot</span>
          </label>
        )}
        <label className="flex items-center gap-3 cursor-pointer select-none bg-obsidian/60 border border-border rounded-lg px-4 py-3 hover:border-primary/40 transition-colors">
          <input type="checkbox" checked={perDiem} onChange={(e) => setPerDiem(e.target.checked)}
            className="size-4 accent-[hsl(var(--primary))]" />
          <span className="text-xs text-foreground font-medium">Per diem</span>
        </label>
        {!isRest && !isTravel && (
          <label className="sm:col-span-2 flex flex-col md:flex-row md:items-center gap-3 cursor-pointer select-none bg-obsidian/60 border border-border rounded-lg px-4 py-3 hover:border-ruby/40 transition-colors">
            <div className="flex items-center gap-3 flex-1">
              <input type="checkbox" checked={shootingOT} onChange={(e) => setShootingOT(e.target.checked)}
                className="size-4 accent-[hsl(var(--ruby))]" />
              <span className="text-xs text-foreground font-medium">Shooting OT <span className="text-muted-foreground md:inline hidden">— at 2×</span></span>
            </div>
            {shootingOT && (
              <div className="flex items-center gap-2" onClick={(e) => e.preventDefault()}>
                <input
                  type="number"
                  min={0}
                  max={480}
                  step={15}
                  value={shootingOTMinutes}
                  onChange={(e) => setShootingOTMinutes(Math.max(0, Number(e.target.value) || 0))}
                  onClick={(e) => e.stopPropagation()}
                  className="w-20 bg-obsidian border border-border rounded-md px-2 py-1 text-sm text-foreground font-mono tabular-nums text-right focus:outline-none focus:border-ruby/60"
                />
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">mins</span>
              </div>
            )}
          </label>
        )}
      </div>

      <div className="md:col-span-2 flex flex-col md:flex-row gap-3 pt-2">
        <Button type="submit" variant="volt" className="flex-[2] h-12 md:h-14 text-[10px] md:text-sm uppercase tracking-widest">CAPTURE ENTRY</Button>
        <Button type="reset" variant="outlineGlass" className="flex-1 h-12 md:h-14 text-[10px] md:text-xs uppercase tracking-widest"
          onClick={() => { setLocation(""); setCall("07:30"); setActualStart(""); setWrap(addHoursToTime("07:30", basicHours)); setActualWrap(""); setMeal(basicHours === 10 ? 0 : 60); setTravel(0); setNight(false); setPerDiem(false); setShootingOT(defaultShootingOT); setShootingOTMinutes(defaultShootingOTMinutes); }}>
          Reset Form
        </Button>
      </div>
    </form>
  );
};

const Field = ({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) => (
  <div className={`space-y-2.5 ${className}`}>
    <label className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold px-1">{label}</label>
    {children}
  </div>
);
