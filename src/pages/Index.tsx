import { useMemo, useState } from "react";
import { EntryForm } from "@/components/EntryForm";
import { RecentLog } from "@/components/RecentLog";
import { Summary } from "@/components/Summary";
import { RatesPanel } from "@/components/RatesPanel";
import { WeekCalendar } from "@/components/WeekCalendar";
import { MonthCalendar } from "@/components/MonthCalendar";
import { Invoice } from "@/components/Invoice";
import { ProjectSwitcher } from "@/components/ProjectSwitcher";
import { ProjectDashboard } from "@/components/ProjectDashboard";
import { ProjectSetup } from "@/components/ProjectSetup";
import { ThemeToggle } from "@/components/ThemeToggle";
import { useProjects } from "@/hooks/useProjects";
import { Button } from "@/components/ui/button";
import { CalendarRange, ClipboardList, FileText, Settings2, X, LayoutGrid } from "lucide-react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

type View = "home" | "setup" | "capture" | "calendar" | "invoice";
type CalView = "week" | "month";

const Index = () => {
  const {
    projects, active, setActive, createProject, renameProject, deleteProject, duplicateProject,
    entries, addEntry, updateEntry, removeEntry, rates, setRates, project, setProject,
  } = useProjects();
  const [showRates, setShowRates] = useState(false);
  const [view, setView] = useState<View>("home");
  const [calView, setCalView] = useState<CalView>("week");

  const recentLocations = useMemo(() => {
    // Show most recent locations first
    const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
    const locs = sorted
      .map(e => e.location?.trim())
      .filter((loc): loc is string => !!loc && loc.length > 0);
    
    return Array.from(new Set(locs));
  }, [entries]);

  return (
    <div className="min-h-dvh bg-background text-foreground antialiased flex flex-col p-6 lg:p-10 lg:pb-0 lg:pt-12 transition-colors duration-300">
      <div className="max-w-screen-2xl mx-auto w-full flex-1 flex flex-col space-y-12">
        <header className="flex flex-col md:flex-row md:justify-between md:items-end gap-8 border-b border-border/60 pb-12 shrink-0">
          <div className="flex justify-between items-start w-full md:w-auto">
            <button onClick={() => setView("home")} className="text-left group transition-opacity hover:opacity-80">
              <span className="text-[10px] tracking-[0.3em] uppercase text-muted-foreground font-medium block mb-2">Production Interface v1.0</span>
              <h1 className="text-2xl font-light tracking-tight text-foreground flex items-center gap-3">
                <span className="size-3 bg-primary rounded-full animate-pulse shadow-[0_0_12px_hsl(var(--primary)/0.5)]" aria-hidden />
                TIME<span className="font-semibold italic text-foreground tracking-tighter">TRACK</span>
              </h1>
            </button>
            <div className="md:hidden">
              <ThemeToggle />
            </div>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="hidden md:block">
              <ThemeToggle />
            </div>
            
            {view !== "home" && (
              <ProjectSwitcher
                projects={projects}
                activeId={active.id}
                onSelect={setActive}
                onCreate={createProject}
                onRename={renameProject}
                onDuplicate={duplicateProject}
                onDelete={deleteProject}
              />
            )}

            <div className="flex bg-carbon border border-border rounded-lg p-1 gap-1">
              <button
                type="button"
                onClick={() => setView("home")}
                aria-pressed={view === "home"}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-widest transition-colors ${
                  view === "home" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}>
                <LayoutGrid className="size-3.5" /> Dashboard
              </button>
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
              <button
                type="button"
                onClick={() => setView("invoice")}
                aria-pressed={view === "invoice"}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-[10px] font-semibold uppercase tracking-widest transition-colors ${
                  view === "invoice" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}>
                <FileText className="size-3.5" /> Invoice
              </button>
            </div>
            {view !== "home" && (
              <Button variant="outlineGlass" size="default" onClick={() => setShowRates((v) => !v)} aria-label="Toggle settings">
                {showRates ? <X className="size-4" /> : <Settings2 className="size-4" />}
              </Button>
            )}
          </div>
        </header>

        <main className="flex-1 min-h-0">
          {view === "home" ? (
            <ProjectDashboard 
              projects={projects}
              onSelect={(id) => {
                setActive(id);
                setView("capture");
              }}
              onCreate={() => setView("setup")}
              onDelete={deleteProject}
              onDuplicate={duplicateProject}
              onRename={renameProject}
            />
          ) : view === "setup" ? (
            <ProjectSetup 
              onCancel={() => setView("home")}
              onSave={(name, rates) => {
                createProject(name, rates);
                setView("capture");
              }}
            />
          ) : (
            <PanelGroup direction="horizontal" className="h-full" key={view}>
              {view === "capture" ? (
              <>
                <Panel id="log-pane" order={1} defaultSize={30} minSize={20}>
                  <div className="h-full pr-10 overflow-y-auto space-y-6 custom-scrollbar">
                    <div className="flex items-center justify-between sticky top-0 bg-background py-3 z-10">
                      <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground font-bold">Recent Captured Time</h3>
                      <span className="text-[10px] font-mono text-muted-foreground bg-carbon px-2 py-0.5 rounded-full border border-border">
                        {entries.length} {entries.length === 1 ? "DAY" : "DAYS"}
                      </span>
                    </div>
                    <RecentLog entries={entries} rates={rates} onRemove={removeEntry} onUpdate={updateEntry} recentLocations={recentLocations} />
                  </div>
                </Panel>
                
                <PanelResizeHandle className="w-2 group relative transition-all active:w-3">
                  <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-border group-hover:bg-primary/40 group-active:bg-primary rounded-full h-full" />
                </PanelResizeHandle>
                
                <Panel id="capture-pane" order={2} defaultSize={40} minSize={30}>
                  <div className="h-full px-10 overflow-y-auto space-y-8 custom-scrollbar">
                    <div className="flex items-center justify-between sticky top-0 bg-background py-3 z-10">
                      <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground font-bold">Session Capture</h3>
                    </div>
                    <div className="bg-carbon/40 rounded-3xl p-8 border border-border shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 right-0 w-32 h-32 bg-primary/5 blur-3xl -mr-16 -mt-16 rounded-full" aria-hidden />
                      <EntryForm
                        onSubmit={addEntry}
                        existingEntries={entries}
                        recentLocations={recentLocations}
                        defaultShootingOT={!!rates.shootingOTDefault}
                        defaultShootingOTMinutes={rates.shootingOTMinutes}
                        basicHours={rates.basicHours}
                      />
                    </div>
                  </div>
                </Panel>
              </>
            ) : (
              <Panel id="content-pane" order={1} defaultSize={70} minSize={40}>
                <div className="h-full pr-8 overflow-y-auto custom-scrollbar">
                  {view === "calendar" ? (
                    <div className="space-y-8">
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
                    </div>
                  ) : (
                    <Invoice entries={entries} rates={rates} projectName={project} />
                  )}
                </div>
              </Panel>
            )}

            <PanelResizeHandle className="w-2 group relative transition-all active:w-3">
              <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-border group-hover:bg-primary/40 group-active:bg-primary rounded-full h-full" />
            </PanelResizeHandle>

            <Panel id="side-pane" order={3} defaultSize={30} minSize={25}>
              <div className="h-full pl-6 overflow-y-auto space-y-6 custom-scrollbar">
                <div className="flex items-center justify-between sticky top-0 bg-background py-3 z-10">
                  <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground font-bold">
                    {showRates ? "Project Settings" : "Production Summary"}
                  </h3>
                </div>
                {showRates ? (
                  <RatesPanel rates={rates} onChange={setRates} project={project} onProject={setProject} />
                ) : (
                  <Summary entries={entries} rates={rates} project={project} />
                )}
              </div>
            </Panel>
          </PanelGroup>
        )}
      </main>

        <footer className="py-12 flex flex-col sm:flex-row justify-between items-center gap-6 text-[11px] font-mono uppercase tracking-[0.3em] text-muted-foreground border-t border-border/80 shrink-0">
          <div className="font-medium">© TimeTrack — {new Date().getFullYear()} UK Crew Hours</div>
          <div className="font-medium">Local-first · No account required</div>
        </footer>
      </div>
    </div>
  );
};

export default Index;
