import { Button } from "@/components/ui/button";
import type { DayEntry, RateConfig } from "@/lib/calc";
import { totals, fmtGBP, fmtHours } from "@/lib/calc";
import { toast } from "@/hooks/use-toast";

type Props = { entries: DayEntry[]; rates: RateConfig; project: string };

const exportInvoiceCSV = (entries: DayEntry[], rates: RateConfig, project: string) => {
  const t = totals(entries, rates);
  const rows = [
    ["SlateTrack Invoice", project],
    ["Generated", new Date().toLocaleString("en-GB")],
    [],
    ["Date", "Day Type", "Location", "Call", "Actual Start", "Wrap", "Meal (m)", "Travel (m)", "Day#", "Night", "Per Diem"],
    ...entries.map((e) => [e.date, e.dayType ?? "shoot", e.location ?? "", e.call, e.actualStart ?? "", e.wrap, e.mealMinutes, e.travelMinutes, e.consecutiveDay ?? 1, e.isNight ? "Y" : "", e.perDiem ? "Y" : ""]),
    [],
    ["Basic hrs", t.basicHours.toFixed(2)],
    ["OT 1.5x hrs", t.ot15Hours.toFixed(2)],
    ["OT 2x hrs", t.ot2Hours.toFixed(2)],
    ["Travel hrs", t.travelHours.toFixed(2)],
    [`Per diems (${t.perDiems})`, t.perDiemTotal.toFixed(2)],
    ["Subtotal", t.subtotal.toFixed(2)],
    [`VAT (${(rates.vatRate * 100).toFixed(0)}%)`, t.vat.toFixed(2)],
    ["Grand total (GBP)", t.grand.toFixed(2)],
  ];
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `slatetrack-${project.replace(/\s+/g, "_")}-${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast({ title: "Invoice exported", description: a.download });
};

export const Summary = ({ entries, rates, project }: Props) => {
  const t = totals(entries, rates);
  return (
    <div className="bg-slate-glass/40 p-1 rounded-2xl border border-border backdrop-blur-sm">
      <div className="bg-obsidian rounded-xl p-8 space-y-10">
        <div>
          <h3 className="text-xs font-mono uppercase tracking-widest text-muted-foreground mb-6">Production Summary</h3>
          <div className="grid grid-cols-2 gap-8">
            <Stat label="Standard Hours" value={fmtHours(t.basicHours)} />
            <Stat label="Shooting OT @ 2x" value={fmtHours(t.ot2Hours)} tone="ruby" />
            <Stat label="Overtime @ 1.5x" value={fmtHours(t.ot15Hours)} tone="primary" />
            <Stat label="Travel Hours" value={fmtHours(t.travelHours)} />
          </div>
        </div>

        <div className="border-t border-border pt-8">
          <div className="flex justify-between items-end mb-8">
            <div>
              <span className="text-[10px] uppercase text-muted-foreground block mb-1">Accrued Charge ({t.days} days)</span>
              <div className="text-5xl font-mono tracking-tighter text-foreground">
                {fmtGBP(t.subtotal).split(".")[0]}
                <span className="text-lg text-muted-foreground">.{(t.subtotal.toFixed(2).split(".")[1] || "00")}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-2 font-mono">
                + VAT {fmtGBP(t.vat)} = <span className="text-accent">{fmtGBP(t.grand)}</span>
              </p>
              {t.perDiems > 0 && (
                <p className="text-xs text-muted-foreground mt-1 font-mono">
                  Includes {t.perDiems} per-diem{t.perDiems === 1 ? "" : "s"} ({fmtGBP(t.perDiemTotal)})
                </p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <Button variant="cyan" size="xl"
              disabled={entries.length === 0}
              onClick={() => exportInvoiceCSV(entries, rates, project)}>
              Generate Invoice
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

const Stat = ({ label, value, tone }: { label: string; value: string; tone?: "primary" | "ruby" }) => (
  <div className="space-y-1">
    <span className="text-[10px] uppercase text-muted-foreground">{label}</span>
    <p className={`text-2xl font-mono tracking-tighter ${
      tone === "primary" ? "text-primary" : tone === "ruby" ? "text-ruby" : "text-foreground"
    }`}>{value}</p>
  </div>
);
