import { useState, useEffect } from "react";
import { ArrowLeft, Check, Info } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { RateConfig } from "@/lib/calc";
import { DEFAULT_RATES } from "@/lib/calc";
import { CATEGORY_LABELS, BAND_LABELS, CATEGORY_BANDS, ROLES, getRateForRole, AgreementCategory, Band } from "@/lib/agreements";

type Props = {
  onCancel: () => void;
  onSave: (name: string, role: string, rates: RateConfig) => void;
};

export const ProjectSetup = ({ onCancel, onSave }: Props) => {
  const [name, setName] = useState("");
  
  const [category, setCategory] = useState<AgreementCategory | "CUSTOM">("TV_DRAMA");
  const [band, setBand] = useState<Band | "">("BAND_1");
  const [roleMode, setRoleMode] = useState<"PRESET" | "CUSTOM">("PRESET");
  const [presetRole, setPresetRole] = useState(ROLES[0].name);
  const [customRole, setCustomRole] = useState("");
  
  const [rates, setRates] = useState<RateConfig>(DEFAULT_RATES);

  // Auto-update rates when preset selection changes
  useEffect(() => {
    if (category !== "CUSTOM" && roleMode === "PRESET" && presetRole && band) {
      const definedRates = getRateForRole(presetRole, category, band as Band);
      if (definedRates) {
        setRates(prev => ({
          ...prev,
          ...definedRates
        }));
      }
    }
  }, [category, band, roleMode, presetRole]);

  // When category changes, reset band
  useEffect(() => {
    if (category !== "CUSTOM") {
      const defaultBand = CATEGORY_BANDS[category][0];
      setBand(defaultBand);
    } else {
      setBand("");
      setRoleMode("CUSTOM");
    }
  }, [category]);

  const updateRate = <K extends keyof RateConfig>(k: K, v: RateConfig[K]) => 
    setRates(prev => ({ ...prev, [k]: v }));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    
    const finalRole = roleMode === "PRESET" ? presetRole : customRole.trim();
    if (!finalRole) return;

    onSave(name.trim(), finalRole, rates);
  };

  const getOt1RateDisplay = () => {
    if (rates.otFlatRate !== undefined) return rates.otFlatRate.toFixed(2);
    return (rates.hourlyRate * (rates.otMultiplier ?? 1.5)).toFixed(2);
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
          <div className="space-y-6">
            <div className="space-y-4">
              <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground font-bold px-1">Production Details</label>
              <input 
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Project Nightfall"
                required
                className="w-full bg-obsidian border border-border rounded-xl px-6 py-4 text-xl text-foreground focus:outline-none focus:border-primary/60 transition-colors placeholder:text-muted-foreground/30"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <label className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold px-1">Production Type</label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value as AgreementCategory | "CUSTOM")}
                  className="w-full bg-obsidian border border-border rounded-xl px-4 py-3 text-foreground transition-colors focus:border-primary/60 outline-none"
                >
                  <option value="CUSTOM">Custom / Other</option>
                  {(Object.keys(CATEGORY_LABELS) as AgreementCategory[]).map(cat => (
                    <option key={cat} value={cat}>{CATEGORY_LABELS[cat]}</option>
                  ))}
                </select>
              </div>

              {category !== "CUSTOM" && (
                <div className="space-y-3 animate-in fade-in slide-in-from-right-2">
                  <label className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold px-1">Budget Band</label>
                  <select
                    value={band}
                    onChange={(e) => setBand(e.target.value as Band)}
                    className="w-full bg-obsidian border border-border rounded-xl px-4 py-3 text-foreground transition-colors focus:border-primary/60 outline-none"
                  >
                    {CATEGORY_BANDS[category].map(b => (
                      <option key={b} value={b}>{BAND_LABELS[b]}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>

            <div className="space-y-3">
              <label className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold px-1">Your Role / Department</label>
              {category !== "CUSTOM" ? (
                <div className="flex flex-col gap-3">
                  <select
                    value={roleMode === "PRESET" ? presetRole : "CUSTOM"}
                    onChange={(e) => {
                      if (e.target.value === "CUSTOM") {
                        setRoleMode("CUSTOM");
                      } else {
                        setRoleMode("PRESET");
                        setPresetRole(e.target.value);
                      }
                    }}
                    className="w-full bg-obsidian border border-border rounded-xl px-4 py-3 text-foreground transition-colors focus:border-primary/60 outline-none"
                  >
                    {ROLES.map(r => (
                      <option key={r.name} value={r.name} disabled={!r.rates[band as Band]}>
                        {r.name} {!r.rates[band as Band] && "(N/A for this band)"}
                      </option>
                    ))}
                    <option value="CUSTOM">+ Custom Role...</option>
                  </select>
                  {roleMode === "CUSTOM" && (
                    <input 
                      value={customRole}
                      onChange={(e) => setCustomRole(e.target.value)}
                      placeholder="e.g. Gaffer, Sound Mixer, DOP..."
                      className="w-full bg-background border border-border rounded-xl px-4 py-3 text-foreground transition-colors focus:border-primary/60 outline-none animate-in fade-in"
                      required
                    />
                  )}
                </div>
              ) : (
                <input 
                  value={customRole}
                  onChange={(e) => setCustomRole(e.target.value)}
                  placeholder="e.g. Gaffer, Sound Mixer, DOP..."
                  className="w-full bg-obsidian border border-border rounded-xl px-4 py-3 text-foreground transition-colors focus:border-primary/60 outline-none"
                  required
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold px-1">Basic Day Rate (£)</label>
              <input 
                type="number"
                value={rates.dayRate > 0 ? rates.dayRate : rates.hourlyRate * rates.basicHours}
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
                  } else if (newDayRate === 0) {
                    newDayRate = rates.hourlyRate * basicHours;
                  }
                  
                  const h = newDayRate > 0 ? newDayRate / basicHours : rates.hourlyRate;
                  setRates({ ...rates, basicHours, isRunningLunch, hourlyRate: Number(h.toFixed(2)), dayRate: newDayRate });
                }}
                className="w-full bg-obsidian border border-border rounded-xl px-4 py-3 text-foreground font-mono transition-colors focus:border-primary/60 outline-none"
              >
                <option value="10-running">10h day (Running Lunch)</option>
                <option value="10-standard">10h day (10+1h lunch)</option>
                <option value="11-standard">11h day (11+1h lunch)</option>
                {![10, 11].includes(rates.basicHours) && <option value="custom">{rates.basicHours}h (Custom)</option>}
              </select>
            </div>
          </div>
        </section>

        <section className="bg-carbon/40 rounded-3xl border border-border p-8 space-y-6">
          <label className="text-xs font-mono uppercase tracking-widest text-muted-foreground font-bold px-1">Overtime, Fees & Allowances</label>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold px-1">Hourly Overtime</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">£</span>
                <input 
                  type="number"
                  value={getOt1RateDisplay()}
                  onChange={(e) => updateRate("otFlatRate", Number(e.target.value))}
                  className="w-full bg-obsidian border border-border/40 rounded-xl px-10 py-3 text-foreground font-mono transition-colors focus:border-primary/60"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold px-1">Night Premium (£/hr flat or total limit)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">£</span>
                <input 
                  type="number"
                  value={rates.nightPremium}
                  onChange={(e) => updateRate("nightPremium", Number(e.target.value))}
                  className="w-full bg-obsidian border border-border rounded-xl px-10 py-3 text-foreground font-mono transition-colors focus:border-primary/60 outline-none"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold px-1">Kit Rental (£/day)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">£</span>
                <input 
                  type="number"
                  value={rates.kitRentalPerDay || 0}
                  onChange={(e) => updateRate("kitRentalPerDay", Number(e.target.value))}
                  className="w-full bg-obsidian border border-border rounded-xl px-10 py-3 text-foreground font-mono transition-colors focus:border-primary/60 outline-none"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold px-1">Per Diem (£/day)</label>
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground">£</span>
                <input 
                  type="number"
                  value={rates.perDiem || 0}
                  onChange={(e) => updateRate("perDiem", Number(e.target.value))}
                  className="w-full bg-obsidian border border-border rounded-xl px-10 py-3 text-foreground font-mono transition-colors focus:border-primary/60 outline-none"
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-[11px] uppercase tracking-widest text-muted-foreground font-bold px-1">VAT Rate (%)</label>
              <div className="relative">
                <input 
                  type="number"
                  value={(rates.vatRate || 0) * 100}
                  onChange={(e) => updateRate("vatRate", Number(e.target.value) / 100)}
                  className="w-full bg-obsidian border border-border rounded-xl px-4 py-3 text-foreground font-mono transition-colors focus:border-primary/60 outline-none"
                />
                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">%</span>
              </div>
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

