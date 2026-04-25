import { Button } from "@/components/ui/button";
import type { DayEntry, RateConfig } from "@/lib/calc";
import { totals, fmtGBP, fmtHours, fmtDate } from "@/lib/calc";
import { toast } from "@/hooks/use-toast";
import { cn } from "@/lib/utils";

type Props = { entries: DayEntry[]; rates: RateConfig; project: string };

const exportInvoiceCSV = (entries: DayEntry[], rates: RateConfig, project: string) => {
  const t = totals(entries, rates);
  const combinedOTHours = t.ot15Hours + t.preCallHours;

  const rows = [
    ["TimeTrack Invoice", project],
    ["Generated", new Date().toLocaleString("en-GB")],
    [],
    ["Date", "Day Type", "Location", "Call", "Actual Start", "Wrap", "Meal (m)", "Travel (m)", "Day#", "Night", "Per Diem", "Expenses"],
    ...entries.map((e) => {
      const expensesList = e.expenses?.map(x => `${x.description}: ${x.amount}`).join(" | ") || "";
      return [e.date, e.dayType ?? "shoot", e.location ?? "", e.call, e.actualStart ?? "", e.wrap, e.mealMinutes, e.travelMinutes, e.consecutiveDay ?? 1, e.isNight ? "Y" : "", e.perDiem ? "Y" : "", expensesList];
    }),
    [],
    ["Basic hrs", t.basicHours.toFixed(2)],
    ["Overtime (OT) hrs", combinedOTHours.toFixed(2)],
    ["OT 2x hrs", t.ot2Hours.toFixed(2)],
    ["Travel hrs", t.travelHours.toFixed(2)],
    [`Per diems (${t.perDiems})`, t.perDiemTotal.toFixed(2)],
    ["Expenses Total", t.expensesTotal.toFixed(2)],
    ["Subtotal", t.subtotal.toFixed(2)],
    [`VAT (${(rates.vatRate * 100).toFixed(0)}%)`, t.vat.toFixed(2)],
    ["Grand total (GBP)", t.grand.toFixed(2)],
  ];
  const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `timetrack-${project.replace(/\s+/g, "_")}-${fmtDate(new Date())}.csv`;
  a.click();
  URL.revokeObjectURL(url);
  toast({ title: "Invoice exported", description: a.download });
};

export const Summary = ({ entries, rates, project }: Props) => {
  const t = totals(entries, rates);
  const combinedOTHours = t.ot15Hours + t.preCallHours;

  return (
    <div className="bg-slate-glass/40 p-1 rounded-2xl border border-border backdrop-blur-sm">
      <div className="bg-obsidian rounded-xl p-8 space-y-10">
        <div className={cn("grid grid-cols-2 gap-8", t.ot2Hours > 0 ? "lg:grid-cols-4" : "lg:grid-cols-3")}>
          <Stat label="Standard Hours" value={fmtHours(t.basicHours)} />
          <Stat label="Overtime (OT)" value={fmtHours(combinedOTHours)} tone="amber" />
          {t.ot2Hours > 0 && <Stat label="Shooting OT @ 2x" value={fmtHours(t.ot2Hours)} tone="ruby" />}
          <Stat label="Travel Hours" value={fmtHours(t.travelHours)} />
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
                + VAT {fmtGBP(t.vat)} = <span className="text-primary font-bold">{fmtGBP(t.grand)}</span>
              </p>
              {t.perDiems > 0 && (
                <p className="text-xs text-muted-foreground mt-1 font-mono">
                  Includes {t.perDiems} per-diem{t.perDiems === 1 ? "" : "s"} ({fmtGBP(t.perDiemTotal)})
                </p>
              )}
              {t.expensesTotal > 0 && (
                <p className="text-xs text-muted-foreground mt-1 font-mono">
                  Includes Expenses ({fmtGBP(t.expensesTotal)})
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

const Stat = ({ label, value, tone }: { label: string; value: string; tone?: "primary" | "ruby" | "amber" | "orange" }) => (
  <div className="space-y-1">
    <span className="text-[11px] uppercase tracking-wider text-muted-foreground font-bold">{label}</span>
    <p className={`text-3xl font-mono tracking-tighter ${
      tone === "primary" ? "text-primary" : 
      tone === "ruby" ? "text-ruby" : 
      tone === "amber" ? "text-amber" :
      tone === "orange" ? "text-orange-500" :
      "text-foreground"
    }`}>{value}</p>
  </div>
);
