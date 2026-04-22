import { useState } from "react";
import { ArrowLeft, Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RateConfig } from "@/lib/calc";
import { DEFAULT_RATES } from "@/lib/calc";

type Props = {
  onCancel: () => void;
  onSave: (name: string, rates: RateConfig) => void;
};

export const ProjectSetup = ({ onCancel, onSave }: Props) => {
  const [name, setName] = useState("");
  const [rates, setRates] = useState<RateConfig>(DEFAULT_RATES);

  const updateRate = <K extends keyof RateConfig>(k: K, v: RateConfig[K]) => 
    setRates(prev => ({ ...prev, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onSave(name.trim(), rates);
  };

  return (
    <div className="max-w-3xl mx-auto space-y-10 pb-20">
      <div className="flex items-center gap-4">
        <Button variant="ghost" size="icon" onClick={onCancel} className="rounded-full">
          <ArrowLeft className="size-5" />
        </Button>
        <div>
          <h2 className="text-3xl font-light tracking-tight text-foreground">Initial Setup</h2>
          <p className="text-sm text-muted-foreground">Define the production parameters for your new project.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <section className="bg-carbon/40 rounded-3xl border border-border p-8 space-y-6">
          <div className="space-y-4">
            <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground font-bold px-1">Production Details</label>
            <input 
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Project Nightfall"
              required
              className="w-full bg-obsidian border border-border rounded-xl px-6 py-4 text-xl text-foreground focus:outline-none focus:border-primary/60 transition-colors"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold px-1">Basic Day Rate (£)</label>
              <input 
                type="number"
                value={rates.dayRate}
                onChange={(e) => {
                  const cleaned = Math.max(0, Number(e.target.value));
                  const h = rates.basicHours > 0 ? cleaned / rates.basicHours : cleaned / 10;
                  setRates({ ...rates, dayRate: cleaned, hourlyRate: Number(h.toFixed(2)) });
                }}
                className="w-full bg-obsidian border border-border rounded-xl px-4 py-3 text-foreground font-mono transition-colors focus:border-primary/60 outline-none"
              />
            </div>
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold px-1">Basic Hours/Day</label>
              <select 
                value={rates.basicHours}
                onChange={(e) => {
                  const val = Number(e.target.value);
                  const h = rates.dayRate / val;
                  setRates({ ...rates, basicHours: val, hourlyRate: rates.dayRate > 0 ? Number(h.toFixed(2)) : rates.hourlyRate });
                }}
                className="w-full bg-obsidian border border-border rounded-xl px-4 py-3 text-foreground font-mono transition-colors focus:border-primary/60 outline-none"
              >
                <option value={10}>10h (Running Lunch)</option>
                <option value={11}>11+1 (Standard)</option>
                <option value={8}>8h (Custom)</option>
                <option value={12}>12h (Technical)</option>
              </select>
            </div>
          </div>
        </section>

        <section className="bg-carbon/40 rounded-3xl border border-border p-8 space-y-6">
          <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground font-bold px-1">Core Overtime Agreement</label>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold px-1">Hourly Overtime (1.5x)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">£</span>
                <input 
                  type="number"
                  readOnly
                  disabled
                  value={(rates.hourlyRate * 1.5).toFixed(2)}
                  className="w-full bg-obsidian/40 border border-border/40 rounded-xl px-10 py-3 text-muted-foreground font-mono cursor-not-allowed"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold px-1">Night Premium (£/hr)</label>
              <input 
                type="number"
                value={rates.nightPremium}
                onChange={(e) => updateRate("nightPremium", Number(e.target.value))}
                className="w-full bg-obsidian border border-border rounded-xl px-4 py-3 text-foreground font-mono transition-colors focus:border-primary/60 outline-none"
              />
            </div>
          </div>

          <div className="flex gap-3 items-start bg-primary/5 border border-primary/20 rounded-2xl p-4">
            <Info className="size-5 text-primary shrink-0 mt-0.5" />
            <p className="text-xs text-muted-foreground leading-relaxed">
              These values can be fully customized for specific days (Night shoots, Weekend premiums) once the project is started in the <span className="text-primary font-bold">Project Settings</span> tab.
            </p>
          </div>
        </section>

        <div className="flex gap-4">
          <Button type="button" variant="outlineGlass" size="xl" onClick={onCancel} className="flex-1 h-14">
            Cancel
          </Button>
          <Button type="submit" variant="volt" size="xl" className="flex-2 h-14">
            <Check className="size-5 mr-3" /> Initialize Production
          </Button>
        </div>
      </form>
    </div>
  );
};
