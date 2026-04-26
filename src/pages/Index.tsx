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
import { UserMenu } from "@/components/UserMenu";
import { CalendarRange, ClipboardList, FileText, Settings2, X, LayoutGrid } from "lucide-react";
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels";

type View = "home" | "setup" | "capture" | "calendar" | "invoice";
type CalView = "week" | "month";

const Index = () => {
  const {
    projects, active, setActive, createProject, renameProject, setCrewRole, toggleArchive, deleteProject, duplicateProject,
    entries, addEntry, updateEntry, removeEntry, rates, setRates, project, setProject, crewRole, setRole, isLoading,
  } = useProjects();

  const [showRates, setShowRates] = useState(false);
  const [view, setView] = useState<View>("home");
  const [calView, setCalView] = useState<CalView>("week");

  const recentLocations = useMemo(() => {
    if (isLoading) return [];
    // Show most recent locations first
    const sorted = [...entries].sort((a, b) => b.date.localeCompare(a.date));
    const locs = sorted
      .map(e => e.location?.trim())
      .filter((loc): loc is string => !!loc && loc.length > 0);
    
    return Array.from(new Set(locs));
  }, [entries, isLoading]);

  if (isLoading) {
    return (
      <div className="min-h-dvh bg-background text-foreground flex items-center justify-center font-mono uppercase tracking-[0.3em] text-xs">
        <div className="flex flex-col items-center gap-4">
          <div className="size-4 bg-primary rounded-full animate-pulse shadow-[0_0_12px_hsl(var(--primary)/0.5)]" />
          Loading...
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-background text-foreground antialiased flex flex-col p-4 md:p-6 lg:p-10 lg:pb-0 lg:pt-12 transition-colors duration-300 overflow-x-hidden">
      <div className="max-w-screen-2xl mx-auto w-full flex-1 flex flex-col space-y-8 md:space-y-12">
        <header className="flex flex-col lg:flex-row lg:justify-between lg:items-end gap-6 lg:gap-8 border-b border-border/60 pb-8 md:pb-12 shrink-0 print:hidden">
          <div className="flex flex-wrap justify-between items-center w-full lg:w-auto gap-4">
            <button onClick={() => setView("home")} className="text-left group transition-opacity hover:opacity-80">
              <h1 className="text-xl md:text-2xl font-light tracking-tight text-foreground flex items-center gap-2 md:gap-3">
                <img src="/logo.svg" alt="TimeTrack Logo" className="size-6 md:size-8" />
                TIME<span className="font-semibold italic text-foreground tracking-tighter">TRACK</span>
              </h1>
            </button>
            <div className="flex items-center gap-2 lg:hidden">
              <UserMenu />
              <ThemeToggle />
              {view !== "home" && (
                <Button variant="outlineGlass" size="icon" onClick={() => setShowRates((v) => !v)} aria-label="Toggle settings" className="h-8 w-8">
                  {showRates ? <X className="size-4" /> : <Settings2 className="size-4" />}
                </Button>
              )}
            </div>
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 sm:gap-3 w-full lg:w-auto max-w-full overflow-x-auto pb-1 sm:pb-0">
            <div className="hidden lg:flex items-center gap-2">
              <UserMenu />
              <ThemeToggle />
            </div>
            
            {view !== "home" && (
              <div className="w-full sm:w-auto">
                <ProjectSwitcher
                  projects={projects}
                  activeId={active.id}
                  onSelect={setActive}
                  onCreate={createProject}
                  onRename={renameProject}
                  onDuplicate={duplicateProject}
                  onToggleArchive={toggleArchive}
                  onDelete={deleteProject}
                />
              </div>
            )}

            <div className="flex bg-carbon border border-border rounded-lg p-1 gap-1 overflow-x-auto no-scrollbar">
              {[
                { id: "home", icon: LayoutGrid, label: "Dash", full: "Dashboard" },
                { id: "capture", icon: ClipboardList, label: "Log", full: "Capture Log" },
                { id: "calendar", icon: CalendarRange, label: "Cal", full: "Calendar" },
                { id: "invoice", icon: FileText, label: "Report", full: "Reports" },
              ].map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => setView(item.id as View)}
                  aria-pressed={view === item.id}
                  className={`flex items-center justify-center gap-1.5 px-2 md:px-4 py-1.5 rounded-md text-[9px] md:text-[10px] font-semibold uppercase tracking-widest transition-all flex-1 min-w-[65px] md:min-w-[100px] ${
                    view === item.id ? "bg-primary text-primary-foreground shadow-sm" : "text-muted-foreground hover:text-foreground hover:bg-carbon-light/50"
                  }`}>
                  <item.icon className="size-3 md:size-3.5 shrink-0" />
                  <span className="whitespace-nowrap md:hidden">{item.label}</span>
                  <span className="whitespace-nowrap hidden md:inline">{item.full}</span>
                </button>
              ))}
            </div>
            {view !== "home" && (
              <div className="hidden lg:block">
                <Button variant="outlineGlass" size="default" onClick={() => setShowRates((v) => !v)} aria-label="Toggle settings">
                  {showRates ? <X className="size-4" /> : <Settings2 className="size-4" />}
                </Button>
              </div>
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
              onToggleArchive={toggleArchive}
            />
          ) : view === "setup" ? (
            <ProjectSetup 
              onCancel={() => setView("home")}
              onSave={(name, role, rates) => {
                createProject(name, role, rates);
                setView("capture");
              }}
            />
          ) : (
            <>
              {/* Desktop Resizable View */}
              <div className="hidden lg:block h-full">
                <PanelGroup direction="horizontal" className="h-full" key={view}>
                  {view === "capture" ? (
                    <>
                      <Panel id="log-pane" order={1} defaultSize={30} minSize={20}>
                        <div className="h-full pr-10 overflow-y-auto space-y-6 custom-scrollbar">
                          <div className="flex items-center justify-between sticky top-0 bg-background py-3 z-10">
                            <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground font-bold italic underline underline-offset-4 decoration-primary/40">Recent Captured Time</h3>
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
                            <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground font-bold italic underline underline-offset-4 decoration-primary/40">Session Capture</h3>
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

                  <PanelResizeHandle className="w-2 group relative transition-all active:w-3 print:hidden">
                    <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-border group-hover:bg-primary/40 group-active:bg-primary rounded-full h-full" />
                  </PanelResizeHandle>

                  <Panel id="side-pane" order={3} defaultSize={30} minSize={25} className="print:hidden">
                    <div className="h-full pl-6 overflow-y-auto space-y-6 custom-scrollbar print:hidden">
                      <div className="flex items-center justify-between sticky top-0 bg-background py-3 z-10">
                        <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground font-bold italic underline underline-offset-4 decoration-primary/40">
                          {showRates ? "Project Settings" : "Production Summary"}
                        </h3>
                      </div>
                      {showRates ? (
                        <RatesPanel rates={rates} onChange={setRates} project={project} onProject={setProject} role={crewRole} onRole={setRole} />
                      ) : (
                        <Summary entries={entries} rates={rates} project={project} />
                      )}
                    </div>
                  </Panel>
                </PanelGroup>
              </div>

              {/* Mobile Scrolling View */}
              <div className="lg:hidden flex flex-col space-y-12">
                {view === "capture" && (
                  <>
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground font-bold italic underline underline-offset-4 decoration-primary/40">Session Capture</h3>
                      </div>
                      <div className="bg-carbon/40 rounded-3xl p-6 border border-border shadow-xl relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-24 h-24 bg-primary/5 blur-2xl -mr-12 -mt-12 rounded-full" aria-hidden />
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

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground font-bold italic underline underline-offset-4 decoration-primary/40">Recent History</h3>
                        <span className="text-[10px] font-mono text-muted-foreground bg-carbon px-2 py-0.5 rounded-full border border-border">
                          {entries.length} {entries.length === 1 ? "DAY" : "DAYS"}
                        </span>
                      </div>
                      <RecentLog entries={entries} rates={rates} onRemove={removeEntry} onUpdate={updateEntry} recentLocations={recentLocations} />
                    </div>
                  </>
                )}

                {view === "calendar" && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between gap-3">
                      <h2 className="text-lg font-medium text-foreground">Calendar</h2>
                      <div className="flex bg-carbon border border-border rounded-lg p-1 gap-1">
                        <button type="button" onClick={() => setCalView("week")} className={`px-2 py-1 rounded text-[9px] font-semibold uppercase tracking-widest ${calView === "week" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Wk</button>
                        <button type="button" onClick={() => setCalView("month")} className={`px-2 py-1 rounded text-[9px] font-semibold uppercase tracking-widest ${calView === "month" ? "bg-primary text-primary-foreground" : "text-muted-foreground"}`}>Mo</button>
                      </div>
                    </div>
                    {calView === "week" ? <WeekCalendar entries={entries} rates={rates} /> : <MonthCalendar entries={entries} rates={rates} />}
                  </div>
                )}

                {view === "invoice" && (
                  <div className="space-y-6">
                    <h2 className="text-lg font-medium text-foreground">Invoice Report</h2>
                    <Invoice entries={entries} rates={rates} projectName={project} />
                  </div>
                )}

                {/* Always show summary on mobile at bottom of view unless rates is open */}
                <div className="space-y-4 pb-12 print:hidden">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-mono uppercase tracking-[0.2em] text-muted-foreground font-bold italic underline underline-offset-4 decoration-primary/40">
                      {showRates ? "Project Settings" : "Performance Summary"}
                    </h3>
                  </div>
                  {showRates ? (
                    <RatesPanel rates={rates} onChange={setRates} project={project} onProject={setProject} role={crewRole} onRole={setRole} />
                  ) : (
                    <Summary entries={entries} rates={rates} project={project} />
                  )}
                </div>
              </div>
            </>
          )}
        </main>

        <footer className="py-12 flex flex-col sm:flex-row justify-between items-center gap-6 text-[11px] font-mono uppercase tracking-[0.3em] text-muted-foreground border-t border-border/80 shrink-0 print:hidden">
          <div className="font-medium">© TimeTrack — {new Date().getFullYear()} UK Crew Hours</div>
        </footer>
      </div>
    </div>
  );
};

export default Index;
