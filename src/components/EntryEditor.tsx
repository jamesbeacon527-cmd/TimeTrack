import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { Trash2, Plus } from "lucide-react";
import type { DayEntry, DayType, Expense } from "@/lib/calc";
import { DAY_TYPES, DAY_TYPE_LABELS } from "@/lib/calc";

type Props = {
  entry: DayEntry;
  onSave: (patch: Partial<DayEntry>) => void;
  onCancel: () => void;
  allEntries?: DayEntry[];
  recentLocations?: string[];
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

export const EntryEditor = ({ entry, onSave, onCancel, allEntries = [], recentLocations = [], basicHours = 10 }: Props) => {
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
  const [expenses, setExpenses] = useState<Expense[]>(entry.expenses ?? []);

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
    setExpenses(entry.expenses ?? []);
  }, [entry.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check for date conflicts with other entries
    if (allEntries.some(ent => ent.date === date && ent.id !== entry.id)) {
      toast({ title: "Duplicate Date", description: `Another entry for ${date} already exists.`, variant: "destructive" });
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

    // Simple Order Check
    const startVal = actualStart || call;
    const endVal = actualWrap || wrap;
    if (startVal === endVal) {
      toast({ title: "Zero Duration", description: "Call and Wrap times cannot be identical.", variant: "destructive" });
      return;
    }

    const patch: Partial<DayEntry> = { 
      date, 
      dayType, 
      location: location.trim(), 
      call, 
      wrap, 
      mealMinutes: basicHours === 10 ? 0 : Math.max(0, mealMinutes), 
      travelMinutes: Math.max(0, travelMinutes), 
      isNight, 
      perDiem, 
      shootingOT, 
      consecutiveDay,
      expenses: expenses.filter(e => e.description.trim() || e.amount > 0)
    };
    if (actualStart) patch.actualStart = actualStart;
    else patch.actualStart = "";
    if (actualWrap) patch.actualWrap = actualWrap;
    else patch.actualWrap = "";
    if (shootingOT) patch.shootingOTMinutes = Math.max(0, shootingOTMinutes);

    onSave(patch);
    
    toast({ title: "Changes Saved", description: `Time for ${date} updated.` });
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
        <div className="space-y-1">
          <input 
            value={location} 
            maxLength={80} 
            onChange={(e) => setLocation(e.target.value)} 
            list="editor-locations"
            className={input} 
          />
          <datalist id="editor-locations">
            {recentLocations.map(loc => (
              <option key={loc} value={loc} />
            ))}
          </datalist>
        </div>
      </Field>

      <Field label="Call (sheet)">
        <input value={call} onChange={(e) => {
          const fmt = formatTimeInput(e.target.value);
          setCall(fmt);
          if (/^\d{2}:\d{2}$/.test(fmt)) setWrap(addHoursToTime(fmt, basicHours));
        }} placeholder="07:30" className={input + " font-mono tabular-nums"} />
      </Field>
      <Field label="Actual start">
        <input value={actualStart} onChange={(e) => setActualStart(formatTimeInput(e.target.value))} placeholder="06:45" className={input + " font-mono tabular-nums"} />
      </Field>
      <Field label="Wrap (sheet)">
        <input value={wrap} onChange={(e) => setWrap(formatTimeInput(e.target.value))} placeholder="20:00" className={input + " font-mono tabular-nums"} />
      </Field>
      <Field label="Actual wrap">
        <input value={actualWrap} onChange={(e) => setActualWrap(formatTimeInput(e.target.value))} placeholder="21:30" className={input + " font-mono tabular-nums"} />
      </Field>

      <Field label="Meal (mins)">
        <input type="number" min={0} max={240} value={basicHours === 10 ? 0 : mealMinutes}
          disabled={basicHours === 10}
          onChange={(e) => setMeal(Number(e.target.value) || 0)}
          className={input + " font-mono tabular-nums disabled:opacity-40"} />
        {basicHours === 10 && <p className="text-[8px] uppercase tracking-widest text-primary font-mono mt-1">Running Lunch (10h Day)</p>}
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

      <Field label="Day in week" className="col-span-2">
        <div className="flex gap-1.5">
          {[
            { value: 1, label: "Std" },
            { value: 6, label: "6th" },
            { value: 7, label: "7th" }
          ].map((opt) => {
            const active = opt.value === consecutiveDay;
            const tone = opt.value === 7 ? "ruby" : opt.value === 6 ? "orange" : "primary";
            return (
              <button key={opt.value} type="button" onClick={() => setConsecutiveDay(opt.value)} aria-pressed={active}
                className={`flex-1 py-1.5 rounded-md text-xs font-semibold uppercase tracking-widest border transition-colors ${
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

      <div className="col-span-2 space-y-3 pt-2">
        <div className="flex items-center justify-between border-b border-border/60 pb-1.5">
          <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold px-0.5">Expenses</label>
          <Button type="button" variant="outlineGlass" size="sm" onClick={addExpense} className="h-6 text-[9px] px-2 gap-1 py-0">
            <Plus className="size-2.5" /> Add
          </Button>
        </div>
        {expenses.length > 0 ? (
          <div className="space-y-2">
            {expenses.map((exp, i) => (
              <div key={exp.id} className="flex items-center gap-2 bg-obsidian/50 p-2 rounded-md border border-border">
                <input
                  value={exp.description}
                  onChange={e => updateExpense(exp.id, "description", e.target.value)}
                  placeholder="Desc"
                  className="w-full bg-transparent text-xs text-foreground focus:outline-none placeholder:text-muted-foreground flex-1 min-w-[50px]"
                />
                <div className="w-20 relative shrink-0">
                  <span className="absolute left-2 top-1/2 -translate-y-1/2 text-muted-foreground text-xs">£</span>
                  <input
                    type="number"
                    min={0}
                    step={0.01}
                    value={exp.amount || ""}
                    onChange={e => updateExpense(exp.id, "amount", parseFloat(e.target.value) || 0)}
                    className="w-full bg-carbon border border-border rounded-sm py-1 pr-1 pl-5 text-xs text-foreground font-mono tabular-nums focus:outline-none focus:border-primary/60 text-right"
                  />
                </div>
                <Button type="button" variant="ghost" size="icon" onClick={() => removeExpense(exp.id)} className="size-6 text-muted-foreground hover:text-red-500 shrink-0">
                  <Trash2 className="size-3" />
                </Button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-[9px] text-muted-foreground px-0.5 italic">No expenses.</p>
        )}
      </div>

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
  <div className={`space-y-1.5 ${className}`}>
    <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold px-0.5">{label}</label>
    {children}
  </div>
);
