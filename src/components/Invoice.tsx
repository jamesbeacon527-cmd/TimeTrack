import { useMemo } from "react";
import type { DayEntry, RateConfig } from "@/lib/calc";
import { DAY_TYPE_LABELS, breakdown, fmtGBP, totals } from "@/lib/calc";
import { DayTimeline } from "@/components/DayTimeline";

type Props = {
  entries: DayEntry[];
  rates: RateConfig;
  projectName: string;
};

export const Invoice = ({ entries, rates, projectName }: Props) => {
  const sorted = useMemo(() => {
    return [...entries].sort((a, b) => a.date.localeCompare(b.date));
  }, [entries]);

  const summary = useMemo(() => totals(entries, rates), [entries, rates]);

  return (
    <div className="space-y-12">
      <div className="flex flex-col md:flex-row justify-between gap-6 md:gap-8 border-b border-border pb-8 md:pb-10">
        <div className="space-y-4">
          <h2 className="text-2xl md:text-3xl font-light tracking-tight text-foreground uppercase">
            Production <span className="font-semibold">{projectName || "Untitled"}</span>
          </h2>
          <div className="flex flex-col gap-1 text-[10px] md:text-sm font-mono text-muted-foreground uppercase tracking-widest">
            <span>Summary of Worked Hours</span>
            <span>{sorted.length > 0 ? `${sorted[0].date} – ${sorted[sorted.length - 1].date}` : "No entries"}</span>
          </div>
        </div>
        <div className="bg-carbon/50 border border-border rounded-2xl p-4 md:p-6 min-w-[12rem] flex flex-col justify-center items-stretch md:items-end text-center md:text-right">
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-[0.2em] mb-1">Total Due</span>
          <span className="text-3xl md:text-4xl font-light text-volt tabular-nums">{fmtGBP(summary.grand)}</span>
          <span className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mt-2 px-2 py-0.5 bg-background/40 rounded-full md:bg-transparent">Incl. {rates.vatRate * 100}% VAT</span>
        </div>
      </div>

      <div className="space-y-8">
        {sorted.map((e) => {
          const b = breakdown(e, rates);
          return (
            <div key={e.id} className="group relative bg-carbon/20 border border-border/40 rounded-2xl p-4 md:p-6 transition-colors hover:bg-carbon/40">
              <div className="grid grid-cols-1 md:grid-cols-6 lg:grid-cols-12 gap-4 md:gap-6">
                <div className="md:col-span-1 lg:col-span-2 space-y-1">
                  <p className="text-[9px] md:text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                    {new Date(e.date).toLocaleDateString("en-GB", { weekday: "long" })}
                  </p>
                  <p className="text-base md:text-lg font-medium text-foreground font-mono">{e.date}</p>
                </div>
                
                <div className="md:col-span-5 lg:col-span-10 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                    <div className="flex flex-wrap items-center gap-2 md:gap-3">
                      <span className="px-2 py-0.5 rounded text-[9px] md:text-[10px] font-mono uppercase tracking-widest bg-primary/10 text-primary border border-primary/20">
                        {DAY_TYPE_LABELS[e.dayType]}
                      </span>
                      <span className="text-xs md:text-sm text-foreground/80 font-mono tracking-tight">
                        {e.call} – {e.wrap} 
                      </span>
                    </div>
                    <div className="flex items-center gap-4 md:gap-6 text-[10px] md:text-[11px] font-mono uppercase tracking-widest bg-background/20 px-3 py-1.5 rounded-lg border border-border/10 sm:bg-transparent sm:p-0 sm:border-0 justify-between sm:justify-end">
                       <div className="flex flex-col items-end">
                         <span className="text-muted-foreground text-[8px] md:text-[9px]">Hrs</span>
                         <span className="text-foreground">{b.worked.toFixed(1)}</span>
                       </div>
                       <div className="flex flex-col items-end">
                         <span className="text-muted-foreground text-[8px] md:text-[9px]">OT</span>
                         <span className="text-ruby">{(b.preCall + b.ot15 + b.ot2).toFixed(1)}</span>
                       </div>
                       <div className="flex flex-col items-end min-w-[3.5rem]">
                         <span className="text-primary">{fmtGBP(b.total)}</span>
                       </div>
                    </div>
                  </div>

                  {(e.actualStart || e.actualWrap) && (
                    <div className="flex gap-4 text-[10px] font-mono text-muted-foreground italic">
                      {e.actualStart && e.actualStart !== e.call && <span>Start: {e.actualStart}</span>}
                      {e.actualWrap && e.actualWrap !== e.wrap && <span>Wrap: {e.actualWrap}</span>}
                    </div>
                  )}
                  
                  <div className="bg-obsidian/40 rounded-xl p-3 md:p-4 border border-border/20 overflow-x-auto no-scrollbar">
                    <div className="min-w-[400px] md:min-w-0">
                      <DayTimeline entry={e} rates={rates} />
                    </div>
                  </div>
                  
                  {e.notes && (
                    <p className="text-xs text-muted-foreground italic border-l-2 border-primary/30 pl-3">"{e.notes}"</p>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
      
      <div className="pt-12 grid grid-cols-1 md:grid-cols-3 gap-8">
        <div className="space-y-4">
          <h4 className="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground">Breakdown</h4>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between border-b border-border/40 pb-1">
              <span className="text-muted-foreground">Basic Hours ({summary.basicHours.toFixed(1)}h)</span>
              <span className="text-foreground font-mono">{fmtGBP(summary.basicHours * rates.hourlyRate)}</span>
            </div>
            <div className="flex justify-between border-b border-border/40 pb-1 font-mono">
              <span className="text-muted-foreground uppercase text-[10px]">Overtime</span>
              <span className="text-foreground">{fmtGBP(summary.subtotal - (summary.basicHours * rates.hourlyRate + summary.perDiemTotal))}</span>
            </div>
            <div className="flex justify-between border-b border-border/40 pb-1 font-mono">
              <span className="text-muted-foreground uppercase text-[10px]">Per Diems ({summary.perDiems})</span>
              <span className="text-foreground">{fmtGBP(summary.perDiemTotal)}</span>
            </div>
          </dl>
        </div>
        
        <div className="md:col-start-3 space-y-4">
          <h4 className="text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground text-right">Final Total</h4>
          <dl className="space-y-3 text-right">
            <div className="flex justify-between text-lg">
              <span className="text-muted-foreground">Subtotal</span>
              <span className="text-foreground font-mono">{fmtGBP(summary.subtotal)}</span>
            </div>
            <div className="flex justify-between text-muted-foreground">
              <span>VAT ({rates.vatRate * 100}%)</span>
              <span className="font-mono">{fmtGBP(summary.vat)}</span>
            </div>
            <div className="flex justify-between text-2xl pt-2 border-t border-border border-dashed font-light">
              <span className="text-foreground">Total</span>
              <span className="text-volt font-mono">{fmtGBP(summary.grand)}</span>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
};
