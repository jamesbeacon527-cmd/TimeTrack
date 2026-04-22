import { useState } from "react";
import { EntryForm } from "@/components/EntryForm";
import { RecentLog } from "@/components/RecentLog";
import { Summary } from "@/components/Summary";
import { RatesPanel } from "@/components/RatesPanel";
import { WeekCalendar } from "@/components/WeekCalendar";
import { MonthCalendar } from "@/components/MonthCalendar";
import { ProjectSwitcher } from "@/components/ProjectSwitcher";
import { useProjects } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { CalendarRange, ClipboardList, Settings2, X } from "lucide-react";

type View = "capture" | "calendar";
type CalView = "week" | "month";

const Index = () => {
  const {
    projects, active, setActive, createProject, renameProject, deleteProject, duplicateProject,
    entries, addEntry, updateEntry, removeEntry, rates, setRates, project, setProject,
  } = useProjects();
  const [showRates, setShowRates] = useState(false);
  const [view, setView] = useState<View>("capture");
  const [calView, setCalView] = useState<CalView>("week");

  return (
    <div className="min-h-dvh bg-obsidian text-muted-foreground antialiased p-6 lg:p-12">
      <div className="max-w-7xl mx-auto space-y-12">
        <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-6 border-b border-border/60 pb-8">
          <div>
            <span className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-medium block mb-2">Production Interface v1.0</span>
            <h1 className="text-2xl font-light tracking-tight text-foreground flex items-center gap-3">
              <span className="size-3 bg-primary rounded-full animate-pulse shadow-[0_0_12px_hsl(var(--primary)/0.5)]" aria-hidden />
              SLATE<span className="font-semibold italic">TRACK</span>
            </h1>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <ProjectSwitcher
              projects={projects}
              activeId={active.id}
              onSelect={setActive}
              onCreate={createProject}
              onRename={renameProject}
              onDuplicate={duplicateProject}
              onDelete={deleteProject}
            />
            <div className="flex bg-carbon border border-border rounded-lg p-1 gap-1">
              <button
                type="button"
                onClick={() => setView("capture")}
                aria-pressed={view === "capture"}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-widest transition-colors ${
                  view === "capture" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}>
                <ClipboardList className="size-3.5" /> Capture
              </button>
              <button
                type="button"
                onClick={() => setView("calendar")}
                aria-pressed={view === "calendar"}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-widest transition-colors ${
                  view === "calendar" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}>
                <CalendarRange className="size-3.5" /> Calendar
              </button>
            </div>
            <Button variant="outlineGlass" size="default" onClick={() => setShowRates((v) => !v)} aria-label="Toggle settings">
              {showRates ? <X className="size-4" /> : <Settings2 className="size-4" />}
            </Button>
          </div>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-12 gap-10">
          <section className="lg:col-span-9 space-y-8">
            {view === "capture" ? (
              <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
                <div className="space-y-4 order-1">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground">Recent Captured Slates</h3>
                    <span className="text-[10px] font-mono text-muted-foreground bg-carbon px-2 py-0.5 rounded-full border border-border">
                      {entries.length} {entries.length === 1 ? "DAY" : "DAYS"}
                    </span>
                  </div>
                  <RecentLog entries={entries} rates={rates} onRemove={removeEntry} onUpdate={updateEntry} />
                </div>

                <div className="space-y-4 order-2">
                  <h2 className="text-lg font-medium text-foreground">Session Capture</h2>
                  <div className="bg-carbon rounded-2xl p-6 border border-border shadow-2xl relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16 rounded-full" aria-hidden />
                    <EntryForm
                      onSubmit={addEntry}
                      defaultShootingOT={!!rates.shootingOTDefault}
                      defaultShootingOTMinutes={rates.shootingOTMinutes}
                      basicHours={rates.basicHours}
                    />
                  </div>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <h2 className="text-lg font-medium text-foreground">Production Calendar</h2>
                  <div className="flex bg-carbon border border-border rounded-lg p-1 gap-1">
                    <button type="button" onClick={() => setCalView("week")} aria-pressed={calView === "week"}
                      className={`px-3 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-widest transition-colors ${
                        calView === "week" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}>Week</button>
                    <button type="button" onClick={() => setCalView("month")} aria-pressed={calView === "month"}
                      className={`px-3 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-widest transition-colors ${
                        calView === "month" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                      }`}>Month</button>
                  </div>
                </div>
                {calView === "week"
                  ? <WeekCalendar entries={entries} rates={rates} />
                  : <MonthCalendar entries={entries} rates={rates} />}
              </>
            )}
          </section>

          <aside className="lg:col-span-3 space-y-6">
            {showRates ? (
              <RatesPanel rates={rates} onChange={setRates} project={project} onProject={setProject} />
            ) : (
              <Summary entries={entries} rates={rates} project={project} />
            )}
          </aside>
        </main>

        <footer className="pt-8 flex flex-col sm:flex-row justify-between items-center gap-3 text-[10px] font-mono uppercase tracking-[0.3em] text-muted-foreground border-t border-border/60">
          <div className="pt-6">© SlateTrack — UK Crew Hours</div>
          <div className="pt-6">Local-first · No account required</div>
        </footer>
      </div>
    </div>
  );
};

export default Index;
