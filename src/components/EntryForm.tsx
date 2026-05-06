import { useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Trash2, Plus } from "lucide-react";
import type { DayEntry, DayType, Expense } from "@/lib/calc";
import { DAY_TYPES, DAY_TYPE_LABELS, fmtDate } from "@/lib/calc";

type Props = { 
  onSubmit: (entry: Omit<DayEntry, "id">) => void; 
  existingEntries?: DayEntry[];
  recentLocations?: string[];
  defaultShootingOT?: boolean; 
  defaultShootingOTMinutes?: number; 
  basicHours?: number;
  isRunningLunch?: boolean;
};

const today = () => fmtDate(new Date());

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

const formatMinsToTime = (mins: number) => {
  if (isNaN(mins)) return "00:00";
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}`;
};

const parseTimeToMins = (val: string) => {
  if (!val) return 0;
  const [h, m] = val.split(':').map(Number);
  if (isNaN(h) || isNaN(m)) return 0;
  return (h * 60) + m;
};

export const EntryForm = ({ onSubmit, existingEntries = [], recentLocations = [], defaultShootingOT = false, defaultShootingOTMinutes = 60, basicHours = 10, isRunningLunch = false }: Props) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [date, setDate] = useState(today());
  const [dayType, setDayType] = useState<DayType>("shoot");
  const [location, setLocation] = useState("");
  const [call, setCall] = useState(() => {
    if (existingEntries.length > 0) {
      const latest = [...existingEntries].sort((a, b) => b.date.localeCompare(a.date))[0];
      return latest.call || "08:00";
    }
    return "08:00";
  });
  const [actualStart, setActualStart] = useState("");
  const [wrap, setWrap] = useState(() => {
    const initialCall = (existingEntries.length > 0 
      ? [...existingEntries].sort((a, b) => b.date.localeCompare(a.date))[0].call 
      : "08:00") || "08:00";
    return addHoursToTime(initialCall, basicHours);
  });
  const [actualWrap, setActualWrap] = useState("");

  // When the call time changes, auto-shift wrap to call + basicHours so the
  // session defaults to a standard working day. Users can still edit wrap after.
  const handleCallChange = (next: string) => {
    const fmt = formatTimeInput(next);
    setCall(fmt);
    if (/^\d{2}:\d{2}$/.test(fmt)) setWrap(addHoursToTime(fmt, basicHours));
  };
  const [mealMinutes, setMeal] = useState(isRunningLunch ? 0 : 60);
  const [travelMinutes, setTravel] = useState(0);
  const [isNight, setNight] = useState(false);
  const [perDiem, setPerDiem] = useState(false);
  const [shootingOT, setShootingOT] = useState(defaultShootingOT);
  const [shootingOTMinutes, setShootingOTMinutes] = useState<number>(defaultShootingOTMinutes);
  const [consecutiveDay, setConsecutiveDay] = useState<number>(1);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [isTypingLocation, setIsTypingLocation] = useState(false);

  const addExpense = () => {
    const id = typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15);
    setExpenses(prev => [...prev, { id, description: "", amount: 0 }]);
  };
  const updateExpense = (id: string, field: keyof Expense, value: string | number) => {
    setExpenses(prev => prev.map(e => e.id === id ? { ...e, [field]: value } : e));
  };
  const removeExpense = (id: string) => {
    setExpenses(prev => prev.filter(e => e.id !== id));
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    
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

    setIsSubmitting(true);
    try {
      const payload: Omit<DayEntry, "id"> = { 
        date, 
        dayType, 
        location: location.trim(), 
        call, 
        wrap, 
        mealMinutes: isRunningLunch ? 0 : Math.max(0, mealMinutes), 
        travelMinutes: Math.max(0, travelMinutes), 
        isNight, 
        perDiem, 
        shootingOT, 
        consecutiveDay,
        expenses: expenses.filter(e => e.description.trim() || e.amount > 0)
      };
      if (actualStart) payload.actualStart = actualStart;
      if (actualWrap) payload.actualWrap = actualWrap;
      if (shootingOT) payload.shootingOTMinutes = Math.max(0, shootingOTMinutes);

      await onSubmit(payload);
      
      toast({ title: "Entry captured", description: `${DAY_TYPE_LABELS[dayType]} · ${date} · ${call}–${wrap}` });
      
      // Roll date forward to next day
      const nextDay = new Date(date);
      nextDay.setDate(nextDay.getDate() + 1);
      setDate(fmtDate(nextDay));

      // Reset specific fields after successful capture
      setActualStart("");
      setActualWrap("");
      setNight(false);
      setPerDiem(false);
      setShootingOT(defaultShootingOT);
      setShootingOTMinutes(defaultShootingOTMinutes);
      setConsecutiveDay(1);
      setExpenses([]);
      setIsTypingLocation(false);
    } catch (err) {
      // Hook handles logging/toast
    } finally {
      setIsSubmitting(false);
    }
  };

  const isRest = dayType === "rest";
  const isTravel = dayType === "travel";

  return (
    <form onSubmit={submit} className="grid grid-cols-1 gap-y-6 md:grid-cols-2 md:gap-x-6 relative z-10 w-full min-w-0">
      <Field label="Day Type" className="md:col-span-2 min-w-0">
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
          className="w-full min-w-0 block bg-obsidian border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-primary/60 transition-colors [color-scheme:dark]" />
      </Field>
      <Field label="Unit Location">
        <div className="space-y-1 relative">
          {recentLocations.length > 0 && !isTypingLocation && (location === "" || recentLocations.includes(location)) ? (
            <div className="relative">
              <select
                value={location || ""}
                onChange={(e) => {
                  if (e.target.value === "OTHER_CUSTOM") {
                    setIsTypingLocation(true);
                    setLocation(""); // Focus text input
                  } else {
                    setLocation(e.target.value);
                  }
                }}
                className="w-full bg-obsidian border rounded-lg border-border px-4 py-3 text-foreground appearance-none focus:outline-none focus:border-primary/60 transition-colors cursor-pointer"
              >
                <option value="" disabled>Select a location...</option>
                {recentLocations.map(loc => (
                  <option key={loc} value={loc}>{loc}</option>
                ))}
                <option value="OTHER_CUSTOM">+ Type a new location</option>
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-muted-foreground">
                <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          ) : (
            <div className="relative">
              <input 
                value={location} 
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    e.currentTarget.blur();
                  }
                }}
                onChange={(e) => {
                  setLocation(e.target.value);
                }} 
                maxLength={80}
                placeholder="e.g. Shepperton Studios, Stage 4"
                className="w-full min-w-0 bg-obsidian/80 border border-border rounded-lg px-4 py-3 pr-10 text-foreground focus:outline-none focus:border-primary/60 transition-colors"
                autoFocus={isTypingLocation}
              />
              {recentLocations.length > 0 && (
                <button
                  type="button"
                  onClick={() => {
                    setIsTypingLocation(false);
                    setLocation("");
                  }}
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground transition-colors"
                >
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                </button>
              )}
            </div>
          )}
        </div>
      </Field>

      {!isRest && !isTravel && (
        <>
          <Field label="Call Time">
            <input type="time" value={call} onChange={(e) => handleCallChange(e.target.value)}
              className="w-full min-w-0 block bg-obsidian border border-border rounded-lg px-4 py-3 text-foreground font-mono tabular-nums focus:outline-none focus:border-accent/60 transition-colors [color-scheme:dark]" />
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground/70 font-mono">From call sheet</p>
          </Field>
          <Field label="Actual Start">
            <input type="time" value={actualStart} onChange={(e) => setActualStart(e.target.value)}
              className="w-full min-w-0 block bg-obsidian border border-border rounded-lg px-4 py-3 text-foreground font-mono tabular-nums focus:outline-none focus:border-primary/60 transition-colors [color-scheme:dark]" />
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground/70 font-mono italic">If pre-call</p>
          </Field>
          <Field label="Wrap Time">
            <input type="time" value={wrap} onChange={(e) => setWrap(e.target.value)}
              className="w-full min-w-0 block bg-obsidian border border-border rounded-lg px-4 py-3 text-foreground font-mono tabular-nums focus:outline-none focus:border-ruby/60 transition-colors [color-scheme:dark]" />
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground/70 font-mono">Scheduled wrap</p>
          </Field>
          <Field label="Actual Wrap">
            <input type="time" value={actualWrap} onChange={(e) => setActualWrap(e.target.value)}
              className="w-full min-w-0 block bg-obsidian border border-border rounded-lg px-4 py-3 text-foreground font-mono tabular-nums focus:outline-none focus:border-ruby/60 transition-colors [color-scheme:dark]" />
            <p className="text-[9px] uppercase tracking-widest text-muted-foreground/70 font-mono italic">If ran late</p>
          </Field>

          <Field label="Meal (mins)">
            <div className="relative">
              <select 
                value={isRunningLunch ? 0 : mealMinutes}
                disabled={isRunningLunch}
                onChange={(e) => setMeal(Number(e.target.value))}
                className="w-full bg-obsidian border border-border rounded-lg px-4 py-3 md:py-4 text-xl md:text-2xl text-foreground font-mono tabular-nums appearance-none focus:outline-none focus:border-primary/60 disabled:opacity-40 cursor-pointer"
              >
                {[0, 15, 30, 45, 60, 75, 90, 105, 120].map(mins => (
                  <option key={mins} value={mins}>{mins} mins</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 md:px-6 text-muted-foreground">
                <svg className="size-5 md:size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
            {isRunningLunch && <p className="text-[9px] uppercase tracking-widest text-primary font-mono mt-1 font-bold italic">Running Lunch</p>}
          </Field>
          <Field label="Travel (mins)">
            <div className="relative">
              <select
                value={travelMinutes}
                onChange={(e) => setTravel(Number(e.target.value))}
                className="w-full bg-obsidian border border-border rounded-lg px-4 py-3 md:py-4 text-xl md:text-2xl text-foreground font-mono tabular-nums appearance-none focus:outline-none focus:border-primary/60 cursor-pointer"
              >
                {Array.from({ length: 25 }, (_, i) => i * 15).map(mins => (
                  <option key={mins} value={mins}>{mins} mins</option>
                ))}
              </select>
              <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 md:px-6 text-muted-foreground">
                <svg className="size-5 md:size-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
              </div>
            </div>
          </Field>
        </>
      )}

      <Field label="Day in week" className="md:col-span-2">
        <div className="flex gap-2">
          {[
            { value: 1, label: "Standard" },
            { value: 6, label: "6th Day" },
            { value: 7, label: "7th Day" }
          ].map((opt) => {
            const active = opt.value === consecutiveDay;
            const tone = opt.value === 7 ? "ruby" : opt.value === 6 ? "orange" : "primary";
            return (
              <button key={opt.value} type="button" onClick={() => setConsecutiveDay(opt.value)} aria-pressed={active}
                className={`flex-1 py-3 rounded-lg text-xs font-semibold uppercase tracking-widest border transition-colors ${
                  active
                    ? tone === "ruby"
                      ? "bg-ruby text-background border-ruby"
                      : tone === "orange"
                      ? "bg-orange-500 text-white border-orange-500"
                      : "bg-primary text-primary-foreground border-primary"
                    : "bg-obsidian text-muted-foreground border-border hover:text-foreground"
                }`}>
                {opt.label}
              </button>
            );
          })}
        </div>
        <p className="text-[9px] uppercase tracking-widest text-muted-foreground/70 font-mono mt-1">6th day = 1.5×, 7th day = 2× (BECTU)</p>
      </Field>

      <div className="md:col-span-2 space-y-4 pt-2">
        <div className="flex items-center justify-between border-b border-border/60 pb-2">
          <label className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold px-1">Expenses</label>
          <Button type="button" variant="outlineGlass" size="sm" onClick={addExpense} className="h-7 text-[10px] px-2 gap-1">
            <Plus className="size-3" /> Add Expense
          </Button>
        </div>
        {expenses.length > 0 ? (
          <div className="space-y-3">
            {expenses.map((exp, i) => (
              <div key={exp.id} className="flex items-center gap-3 bg-obsidian/50 p-3 rounded-lg border border-border">
                <div className="flex-1 space-y-1">
                  <input
                    value={exp.description}
                    onChange={e => updateExpense(exp.id, "description", e.target.value)}
                    placeholder="e.g., Taxi, Lunch"
                    className="w-full bg-transparent text-sm text-foreground focus:outline-none placeholder:text-muted-foreground"
                  />
                </div>
                <div className="w-24 relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">£</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={exp.amount || ""}
                    onChange={e => updateExpense(exp.id, "amount", parseFloat(e.target.value) || 0)}
                    className="w-full bg-carbon border border-border rounded-md pl-6 pr-3 py-2 text-sm text-foreground font-mono tabular-nums focus:outline-none focus:border-primary/60"
                  />
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeExpense(exp.id)} className="size-8 text-muted-foreground hover:text-red-500">
                  <Trash2 className="size-4" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[10px] text-muted-foreground px-1 italic">No expenses recorded.</p>
        )}
      </div>

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
              <div className="flex items-center gap-2 relative mt-2 md:mt-0" onClick={(e) => e.preventDefault()}>
                <select
                  value={shootingOTMinutes}
                  onChange={(e) => setShootingOTMinutes(Number(e.target.value))}
                  onClick={(e) => e.stopPropagation()}
                  className="w-32 bg-obsidian border border-border rounded-md pl-3 pr-8 py-2 text-sm text-foreground font-mono tabular-nums text-left appearance-none focus:outline-none focus:border-ruby/60 cursor-pointer"
                >
                  {Array.from({ length: 32 }, (_, i) => i * 15).map(mins => (
                    <option key={mins} value={mins}>{mins}</option>
                  ))}
                </select>
                <div className="pointer-events-none absolute right-2 inset-y-0 flex items-center text-muted-foreground">
                  <svg className="size-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                </div>
                <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono ml-1">mins</span>
              </div>
            )}
          </label>
        )}
      </div>

      <div className="md:col-span-2 flex flex-col md:flex-row gap-3 pt-2">
        <Button type="submit" variant="volt" disabled={isSubmitting} className="flex-[2] h-12 md:h-14 text-[10px] md:text-sm uppercase tracking-widest">
          {isSubmitting ? "Capturing..." : "CAPTURE ENTRY"}
        </Button>
        <Button type="reset" variant="outlineGlass" disabled={isSubmitting} className="flex-1 h-12 md:h-14 text-[10px] md:text-xs uppercase tracking-widest"
          onClick={() => { setLocation(""); setCall("08:00"); setActualStart(""); setWrap(addHoursToTime("08:00", basicHours)); setActualWrap(""); setMeal(isRunningLunch ? 0 : 60); setTravel(0); setNight(false); setPerDiem(false); setShootingOT(defaultShootingOT); setShootingOTMinutes(defaultShootingOTMinutes); setConsecutiveDay(1); setExpenses([]); setIsTypingLocation(false); }}>
          Reset Form
        </Button>
      </div>
    </form>
  );
};

const Field = ({ label, children, className = "" }: { label: string; children: React.ReactNode; className?: string }) => (
  <div className={`space-y-2.5 min-w-0 flex flex-col w-full max-w-full ${className}`}>
    <label className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold px-1">{label}</label>
    <div className="w-full min-w-0 flex flex-col relative">
      {children}
    </div>
  </div>
);
