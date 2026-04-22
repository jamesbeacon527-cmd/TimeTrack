import { useState } from "react";
import { ChevronDown, Pencil, Trash2 } from "lucide-react";
import type { DayEntry, RateConfig } from "@/lib/calc";
import { breakdown, fmtGBP, fmtHours, DAY_TYPE_LABELS } from "@/lib/calc";
import { DayTimeline } from "@/components/DayTimeline";
import { EntryEditor } from "@/components/EntryEditor";

type Props = {
  entries: DayEntry[];
  rates: RateConfig;
  onRemove: (id: string) => void;
  onUpdate: (id: string, patch: Partial<DayEntry>) => void;
  recentLocations?: string[];
};

export const RecentLog = ({ entries, rates, onRemove, onUpdate, recentLocations = [] }: Props) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  const sortedEntries = [...entries].sort((a, b) => b.date.localeCompare(a.date));

  if (sortedEntries.length === 0) {
    return (
      <div className="bg-carbon/50 border border-border p-12 rounded-2xl text-center text-muted-foreground text-sm font-medium">
        No entries yet — capture your first day above.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {sortedEntries.slice(0, 8).map((e) => {
        const b = breakdown(e, rates);
        const isOpen = openId === e.id;
        const isEditing = editId === e.id;
        return (
          <div key={e.id}
            className={`group bg-carbon/50 border rounded-xl transition-colors ${
              isOpen ? "border-primary/40 bg-carbon" : "border-border hover:bg-carbon"
            }`}>
            <button
              type="button"
              onClick={() => { setOpenId(isOpen ? null : e.id); if (isOpen) setEditId(null); }}
              aria-expanded={isOpen}
              className="w-full p-4 flex items-center justify-between gap-3 text-left"
            >
              <div className="flex items-center gap-4 min-w-0">
                <ChevronDown className={`size-4 text-muted-foreground transition-transform ${isOpen ? "rotate-180 text-primary" : ""}`} />
                <div className="text-[11px] font-mono font-bold py-1.5 px-3 bg-obsidian rounded-lg border border-border/80 whitespace-nowrap shadow-sm">
                  {new Date(e.date).toLocaleDateString("en-GB", { day: "2-digit", month: "short" }).toUpperCase()}
                </div>
                <div className="min-w-0">
                  <p className="text-sm text-foreground font-medium truncate flex items-center gap-2">
                    <span className="text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-primary/15 text-primary border border-primary/30">
                      {DAY_TYPE_LABELS[e.dayType ?? "shoot"]}
                    </span>
                    <span className="truncate">{e.location || "Unit base"}</span>
                    {e.isNight && <span className="text-accent text-[10px]">NIGHT</span>}
                  </p>
                  <p className="text-[11px] uppercase tracking-tight text-muted-foreground font-mono font-medium leading-relaxed mt-0.5">
                    {e.actualStart && e.actualStart !== e.call ? <span className="text-accent">{e.actualStart}→</span> : ""}
                    {e.call} — {e.actualWrap && e.actualWrap !== e.wrap ? <span className="text-ruby">{e.actualWrap}</span> : e.wrap}
                    {" · "}<span className="text-primary font-bold">{fmtHours(b.worked)}h</span>
                    {b.preCall > 0 && <span className="text-accent font-bold"> · PC</span>}
                    {b.ot15 > 0 && <span className="text-amber font-bold"> · 1.5×</span>}
                    {b.ot2 > 0 && <span className="text-ruby font-bold"> · 2×</span>}
                    {e.shootingOT && <span className="text-ruby font-bold"> · SOT</span>}
                    {e.perDiem && <span className="text-primary font-bold"> · PD</span>}
                    {e.consecutiveDay === 6 && <span className="text-amber font-bold"> · Day 6</span>}
                    {e.consecutiveDay && e.consecutiveDay >= 7 && <span className="text-ruby font-bold"> · Day 7</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <p className="text-sm text-primary font-mono font-bold tabular-nums">{fmtGBP(b.total)}</p>
              </div>
            </button>

            {isOpen && (
              <div className="px-4 pb-4 space-y-4">
                <DayTimeline entry={e} rates={rates} />

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono uppercase tracking-widest">
                  <Stat label="Basic" value={fmtGBP(b.basicPay)} tone="primary" />
                  <Stat label="OT 1.5x" value={fmtGBP(b.ot15Pay)} tone={b.ot15Pay ? "amber" : undefined} />
                  <Stat label="OT 2x" value={fmtGBP(b.ot2Pay)} tone={b.ot2Pay ? "ruby" : undefined} />
                  <Stat label="Travel" value={fmtGBP(b.travelPay)} />
                  {b.preCallPay > 0 && <Stat label="Pre-call" value={fmtGBP(b.preCallPay)} tone="accent" />}
                  {b.nightPay > 0 && <Stat label="Night" value={fmtGBP(b.nightPay)} tone="accent" />}
                  {b.perDiemPay > 0 && <Stat label="Per diem" value={fmtGBP(b.perDiemPay)} tone="primary" />}
                  {b.kitRental > 0 && <Stat label="Kit" value={fmtGBP(b.kitRental)} />}
                  {b.consecutiveMultiplier !== 1 && <Stat label={`Day ${e.consecutiveDay}× `} value={`${b.consecutiveMultiplier.toFixed(2)}×`} tone={e.consecutiveDay === 6 ? "amber" : "ruby"} />}
                  <Stat label="Day total" value={fmtGBP(b.total)} tone="primary" />
                </div>

                <div className="flex items-center justify-end gap-2">
                  {!isEditing && (
                    <>
                      <button onClick={() => setEditId(e.id)}
                        className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest px-3 py-1.5 rounded-md border border-border text-foreground hover:bg-secondary/60 transition-colors">
                        <Pencil className="size-3" /> Edit
                      </button>
                      <button onClick={() => onRemove(e.id)}
                        className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest px-3 py-1.5 rounded-md border border-border text-muted-foreground hover:text-ruby hover:border-ruby/40 transition-colors">
                        <Trash2 className="size-3" /> Delete
                      </button>
                    </>
                  )}
                </div>

                {isEditing && (
                  <EntryEditor
                    entry={e}
                    onSave={(patch) => { onUpdate(e.id, patch); setEditId(null); }}
                    onCancel={() => setEditId(null)}
                    allEntries={entries}
                    recentLocations={recentLocations}
                    basicHours={rates.basicHours}
                  />
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};

const Stat = ({ label, value, tone }: { label: string; value: string; tone?: "primary" | "ruby" | "accent" | "amber" }) => (
  <div className="bg-obsidian border border-border rounded-md px-3 py-2">
    <div className="text-muted-foreground">{label}</div>
    <div className={`text-sm font-mono tabular-nums normal-case tracking-normal ${
      tone === "primary" ? "text-primary" : 
      tone === "ruby" ? "text-ruby" : 
      tone === "accent" ? "text-accent" :
      tone === "amber" ? "text-amber" :
      "text-foreground"
    }`}>{value}</div>
  </div>
);
