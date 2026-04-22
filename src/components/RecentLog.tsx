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
};

export const RecentLog = ({ entries, rates, onRemove, onUpdate }: Props) => {
  const [openId, setOpenId] = useState<string | null>(null);
  const [editId, setEditId] = useState<string | null>(null);

  if (entries.length === 0) {
    return (
      <div className="bg-carbon/50 border border-border p-8 rounded-xl text-center text-muted-foreground text-sm">
        No entries yet — capture your first day above.
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.slice(0, 8).map((e) => {
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
                <div className="text-xs font-mono py-1 px-2 bg-obsidian rounded border border-border whitespace-nowrap">
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
                  <p className="text-[10px] uppercase tracking-tighter text-muted-foreground font-mono">
                    {e.actualStart && e.actualStart !== e.call ? <span className="text-accent">{e.actualStart}→</span> : ""}
                    {e.call} — {e.actualWrap && e.actualWrap !== e.wrap ? <span className="text-ruby">{e.actualWrap}</span> : e.wrap}
                    {" · "}<span className="text-primary">{fmtHours(b.worked)}h</span>
                    {b.preCall > 0 && <span className="text-accent"> · +{fmtHours(b.preCall)} PC</span>}
                    {b.ot15 > 0 && <span className="text-accent"> · +{fmtHours(b.ot15)} OT1.5×</span>}
                    {b.ot2 > 0 && <span className="text-ruby"> · +{fmtHours(b.ot2)} OT2×</span>}
                    {e.shootingOT && <span className="text-ruby"> · SOT</span>}
                    {e.perDiem && <span className="text-primary"> · PD</span>}
                    {e.consecutiveDay === 6 && <span className="text-accent"> · D6</span>}
                    {e.consecutiveDay && e.consecutiveDay >= 7 && <span className="text-ruby"> · D7</span>}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <p className="text-sm text-accent font-mono tabular-nums">{fmtGBP(b.total)}</p>
              </div>
            </button>

            {isOpen && (
              <div className="px-4 pb-4 space-y-4">
                <DayTimeline entry={e} rates={rates} />

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[10px] font-mono uppercase tracking-widest">
                  <Stat label="Basic" value={fmtGBP(b.basicPay)} />
                  <Stat label="OT 1.5x" value={fmtGBP(b.ot15Pay)} tone={b.ot15Pay ? "primary" : undefined} />
                  <Stat label="OT 2x" value={fmtGBP(b.ot2Pay)} tone={b.ot2Pay ? "ruby" : undefined} />
                  <Stat label="Travel" value={fmtGBP(b.travelPay)} />
                  {b.preCallPay > 0 && <Stat label="Pre-call" value={fmtGBP(b.preCallPay)} tone="primary" />}
                  {b.nightPay > 0 && <Stat label="Night" value={fmtGBP(b.nightPay)} tone="primary" />}
                  {b.perDiemPay > 0 && <Stat label="Per diem" value={fmtGBP(b.perDiemPay)} tone="primary" />}
                  {b.kitRental > 0 && <Stat label="Kit" value={fmtGBP(b.kitRental)} />}
                  {b.consecutiveMultiplier !== 1 && <Stat label={`Day ${e.consecutiveDay}× `} value={`${b.consecutiveMultiplier.toFixed(2)}×`} tone="ruby" />}
                  <Stat label="Day total" value={fmtGBP(b.total)} tone="primary" />
                </div>

                <div className="flex items-center justify-end gap-2">
                  {!isEditing && (
                    <>
                      <button onClick={() => setEditId(e.id)}
                        className="inline-flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-widest px-3 py-1.5 rounded-md border border-border text-foreground hover:bg-secondary/60 transition-colors">
                        <Pencil className="size-3" /> Edit
                      </button>
                      <button onClick={() => { if (confirm("Delete this entry?")) onRemove(e.id); }}
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

const Stat = ({ label, value, tone }: { label: string; value: string; tone?: "primary" | "ruby" }) => (
  <div className="bg-obsidian border border-border rounded-md px-3 py-2">
    <div className="text-muted-foreground">{label}</div>
    <div className={`text-sm font-mono tabular-nums normal-case tracking-normal ${
      tone === "primary" ? "text-primary" : tone === "ruby" ? "text-ruby" : "text-foreground"
    }`}>{value}</div>
  </div>
);
