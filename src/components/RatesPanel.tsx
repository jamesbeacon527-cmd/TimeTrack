import { useState } from "react";
import type { RateConfig, DayType } from "@/lib/calc";
import { DAY_TYPES, DAY_TYPE_LABELS } from "@/lib/calc";

type Props = { 
  rates: RateConfig; 
  onChange: (r: RateConfig) => void; 
  project: string; 
  onProject: (s: string) => void;
  role: string;
  onRole: (s: string) => void;
};

type Tab = "rates" | "dayTypes" | "bectu";

export const RatesPanel = ({ rates, onChange, project, onProject, role, onRole }: Props) => {
  const [tab, setTab] = useState<Tab>("rates");

  const set = <K extends keyof RateConfig>(k: K, v: RateConfig[K]) => {
    // Basic clamping and sanitization
    let val = v;
    if (typeof val === "number") {
      val = Math.max(0, val) as RateConfig[K];
    }
    onChange({ ...rates, [k]: val });
  };

  const handleTimeChange = (k: "nightStart" | "nightEnd", v: string) => {
    // Basic format filter and correction
    let cleaned = v.replace(/[^\d:]/g, "").slice(0, 5);
    // Correct "2000" to "20:00"
    if (cleaned.length === 4 && !cleaned.includes(":")) {
      const hh = cleaned.slice(0, 2);
      const mm = cleaned.slice(2, 4);
      if (Number(hh) < 24 && Number(mm) < 60) {
        cleaned = `${hh}:${mm}`;
      }
    }
    set(k, cleaned);
  };

  const setDayTypeRate = (t: DayType, v: number) =>
    onChange({ ...rates, dayTypeRates: { ...rates.dayTypeRates, [t]: Math.min(5, Math.max(0, v)) } });

  return (
    <div className="bg-carbon border border-border rounded-2xl p-6 space-y-5">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <label className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold px-1">Production Title</label>
          <input value={project} onChange={(e) => onProject(e.target.value.slice(0, 80))}
            placeholder="Enter production title..."
            className="w-full bg-obsidian border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-primary/60 transition-colors" />
        </div>
        <div className="space-y-2">
          <label className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold px-1">Your Role</label>
          <input value={role} onChange={(e) => onRole(e.target.value.slice(0, 50))}
            placeholder="e.g. Gaffer, Sound Mixer..."
            className="w-full bg-obsidian border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-primary/60 transition-colors" />
        </div>
      </div>

      <div className="flex gap-1 bg-obsidian border border-border rounded-lg p-1">
        <TabButton active={tab === "rates"} onClick={() => setTab("rates")}>Rates</TabButton>
        <TabButton active={tab === "dayTypes"} onClick={() => setTab("dayTypes")}>Day Types</TabButton>
        <TabButton active={tab === "bectu"} onClick={() => setTab("bectu")}>BECTU</TabButton>
      </div>

      {tab === "rates" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <NumField label="Day rate £" value={rates.dayRate} onChange={(v) => {
              const cleaned = Math.max(0, v);
              const h = rates.basicHours > 0 ? cleaned / rates.basicHours : rates.hourlyRate;
              onChange({ ...rates, dayRate: cleaned, hourlyRate: Number(h.toFixed(2)) });
            }} step={5} />
            <NumField label="Hourly £" value={rates.hourlyRate} onChange={(v) => set("hourlyRate", v)} step={0.5} />
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-bold px-1">Basic hrs/day</label>
              <select 
                value={
                  rates.basicHours === 10 && rates.isRunningLunch ? "10-running" :
                  rates.basicHours === 10 && !rates.isRunningLunch ? "10-standard" :
                  rates.basicHours === 11 ? "11-standard" :
                  "custom"
                }
                onChange={(e) => {
                  const val = e.target.value;
                  let basicHours = rates.basicHours;
                  let isRunningLunch = rates.isRunningLunch;
                  
                  if (val === "10-running") {
                    basicHours = 10;
                    isRunningLunch = true;
                  } else if (val === "10-standard") {
                    basicHours = 10;
                    isRunningLunch = false;
                  } else if (val === "11-standard") {
                    basicHours = 11;
                    isRunningLunch = false;
                  }
                  
                  let newDayRate = rates.dayRate;
                  if (rates.dayRates && rates.dayRates[basicHours]) {
                    newDayRate = rates.dayRates[basicHours];
                  }
                  
                  const h = newDayRate > 0 ? newDayRate / basicHours : rates.hourlyRate;
                  onChange({ ...rates, basicHours, isRunningLunch, dayRate: newDayRate, hourlyRate: newDayRate > 0 ? Number(h.toFixed(2)) : rates.hourlyRate });
                }}
                className="w-full bg-obsidian border border-border rounded-lg px-3 py-2.5 text-sm text-foreground focus:outline-none focus:border-primary/60 transition-colors"
              >
                <option value="10-running">10h (Running Lunch)</option>
                <option value="10-standard">10h (10+1h lunch)</option>
                <option value="11-standard">11h (11+1h lunch)</option>
                {![10, 11].includes(rates.basicHours) && <option value="custom">{rates.basicHours}h (Custom)</option>}
              </select>
            </div>
            <NumField label="Pre-call ×" value={rates.preCallRate} onChange={(v) => set("preCallRate", v)} step={0.1} />
            <NumField label="Night premium £" value={rates.nightPremium} onChange={(v) => set("nightPremium", v)} />
            <NumField label="Per diem £" value={rates.perDiem} onChange={(v) => set("perDiem", v)} step={1} />
            <NumField label="VAT rate %" value={rates.vatRate * 100} onChange={(v) => set("vatRate", Math.min(1, v / 100))} step={1} />
            <NumField label="Kit £/day" value={rates.kitRentalPerDay || 0} onChange={(v) => set("kitRentalPerDay", v)} />
          </div>
          <p className="text-[10px] text-muted-foreground font-mono leading-relaxed">
            Shooting OT is set per entry in the Session Capture. When ticked, those minutes after basic are paid at 2×; further OT reverts to 1.5×.
          </p>
        </>
      )}

      {tab === "dayTypes" && (
        <>
          <div className="space-y-2">
            {DAY_TYPES.map((t) => {
              const v = rates.dayTypeRates?.[t] ?? 1;
              return (
                <div key={t} className="grid grid-cols-[1fr_auto_5rem] items-center gap-3 bg-obsidian/60 border border-border rounded-lg px-3 py-2">
                  <span className="text-sm text-foreground">{DAY_TYPE_LABELS[t]}</span>
                  <span className="text-[10px] uppercase tracking-widest text-muted-foreground font-mono">× rate</span>
                  <input type="number" min={0} max={3} step={0.05} value={v}
                    onChange={(e) => setDayTypeRate(t, Number(e.target.value) || 0)}
                    className="w-full bg-obsidian border border-border rounded px-2 py-1.5 text-foreground font-mono tabular-nums text-right focus:outline-none focus:border-primary/60" />
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground font-mono leading-relaxed">
            Multiplier applied to basic + OT + travel pay for each day type. 1.00 = full rate, 0.50 = half, 0 = unpaid. Per-diem and night premium are unaffected.
          </p>
        </>
      )}

      {tab === "bectu" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <NumField label="Turnaround hrs" value={rates.turnaroundHours} onChange={(v) => set("turnaroundHours", v)} step={0.5} />
            <NumField label="Broken T/A fee £" value={rates.brokenTurnaroundFee} onChange={(v) => set("brokenTurnaroundFee", v)} step={10} />
            <NumField label="6th day ×" value={rates.sixthDayMultiplier} onChange={(v) => set("sixthDayMultiplier", v)} step={0.05} />
            <NumField label="7th day ×" value={rates.seventhDayMultiplier} onChange={(v) => set("seventhDayMultiplier", v)} step={0.05} />
            <NumField label="Weekly hrs cap" value={rates.weeklyHoursCap} onChange={(v) => set("weeklyHoursCap", v)} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Night window start</label>
              <input value={rates.nightStart} onChange={(e) => handleTimeChange("nightStart", e.target.value)} placeholder="20:00"
                className="w-full bg-obsidian border border-border rounded-lg px-3 py-2 text-foreground font-mono tabular-nums focus:outline-none focus:border-primary/60" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Night window end</label>
              <input value={rates.nightEnd} onChange={(e) => handleTimeChange("nightEnd", e.target.value)} placeholder="07:00"
                className="w-full bg-obsidian border border-border rounded-lg px-3 py-2 text-foreground font-mono tabular-nums focus:outline-none focus:border-primary/60" />
            </div>
          </div>
          <p className="text-[10px] text-muted-foreground font-mono leading-relaxed">
            Based on the PACT/BECTU agreement (2023): 11h minimum turnaround, 6th day at 1.5× and 7th day at 2× of the basic. All values editable per production.
          </p>
        </>
      )}
    </div>
  );
};

const TabButton = ({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) => (
  <button type="button" onClick={onClick}
    className={`flex-1 text-xs font-semibold uppercase tracking-widest py-2 rounded-md transition-colors ${
      active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
    }`}>
    {children}
  </button>
);

const NumField = ({ label, value, onChange, step = 1 }: { label: string; value: number; onChange: (v: number) => void; step?: number }) => (
  <div className="space-y-2">
    <label className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold px-1">{label}</label>
    <input type="number" min={0} step={step} value={value}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      className="w-full bg-obsidian border border-border rounded-lg px-4 py-2.5 text-foreground font-mono tabular-nums focus:outline-none focus:border-primary/60 transition-colors" />
  </div>
);
