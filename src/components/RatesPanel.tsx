import { useState } from "react";
import type { RateConfig, DayType } from "@/lib/calc";
import { DAY_TYPES, DAY_TYPE_LABELS } from "@/lib/calc";

type Props = { rates: RateConfig; onChange: (r: RateConfig) => void; project: string; onProject: (s: string) => void };

type Tab = "rates" | "dayTypes" | "bectu";

export const RatesPanel = ({ rates, onChange, project, onProject }: Props) => {
  const [tab, setTab] = useState<Tab>("rates");
  const set = <K extends keyof RateConfig>(k: K, v: RateConfig[K]) => onChange({ ...rates, [k]: v });
  const setDayTypeRate = (t: DayType, v: number) =>
    onChange({ ...rates, dayTypeRates: { ...rates.dayTypeRates, [t]: v } });

  return (
    <div className="bg-carbon border border-border rounded-2xl p-6 space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground">Project & Rates</h3>
      </div>

      <div className="space-y-2">
        <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Production Title</label>
        <input value={project} onChange={(e) => onProject(e.target.value.slice(0, 80))}
          className="w-full bg-obsidian border border-border rounded-lg px-4 py-3 text-foreground focus:outline-none focus:border-primary/60" />
      </div>

      <div className="flex gap-1 bg-obsidian border border-border rounded-lg p-1">
        <TabButton active={tab === "rates"} onClick={() => setTab("rates")}>Rates</TabButton>
        <TabButton active={tab === "dayTypes"} onClick={() => setTab("dayTypes")}>Day Types</TabButton>
        <TabButton active={tab === "bectu"} onClick={() => setTab("bectu")}>BECTU</TabButton>
      </div>

      {tab === "rates" && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <NumField label="Day rate £" value={rates.dayRate} onChange={(v) => set("dayRate", v)} step={5} />
            <NumField label="Hourly £" value={rates.hourlyRate} onChange={(v) => set("hourlyRate", v)} step={0.5} />
            <NumField label="Basic hrs/day" value={rates.basicHours} onChange={(v) => set("basicHours", v)} />
            <NumField label="Pre-call ×" value={rates.preCallRate} onChange={(v) => set("preCallRate", v)} step={0.1} />
            <NumField label="Night premium £" value={rates.nightPremium} onChange={(v) => set("nightPremium", v)} />
            <NumField label="Per diem £" value={rates.perDiem} onChange={(v) => set("perDiem", v)} step={1} />
            <NumField label="VAT rate" value={rates.vatRate} onChange={(v) => set("vatRate", v)} step={0.01} />
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
              <input value={rates.nightStart} onChange={(e) => set("nightStart", e.target.value)} placeholder="20:00"
                className="w-full bg-obsidian border border-border rounded-lg px-3 py-2 text-foreground font-mono tabular-nums focus:outline-none focus:border-primary/60" />
            </div>
            <div className="space-y-1.5">
              <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">Night window end</label>
              <input value={rates.nightEnd} onChange={(e) => set("nightEnd", e.target.value)} placeholder="07:00"
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
  <div className="space-y-1.5">
    <label className="text-[10px] uppercase tracking-widest text-muted-foreground font-semibold">{label}</label>
    <input type="number" min={0} step={step} value={value}
      onChange={(e) => onChange(Number(e.target.value) || 0)}
      className="w-full bg-obsidian border border-border rounded-lg px-3 py-2 text-foreground font-mono tabular-nums focus:outline-none focus:border-primary/60" />
  </div>
);
