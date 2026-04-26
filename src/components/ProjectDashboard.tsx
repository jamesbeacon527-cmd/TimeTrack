import { useState } from "react";
import { Plus, Clock, FileText, MoreVertical, Trash2, Copy, Edit3, ExternalLink, Archive, ArchiveRestore } from "lucide-react";
import type { Project } from "@/hooks/useProjects";
import { totals, fmtGBP } from "@/lib/calc";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type Props = {
  projects: Project[];
  onSelect: (id: string) => void;
  onCreate: () => void;
  onDelete: (id: string) => void;
  onDuplicate: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onToggleArchive: (id: string, archive: boolean) => void;
};

export const ProjectDashboard = ({ projects, onSelect, onCreate, onDelete, onDuplicate, onRename, onToggleArchive }: Props) => {
  const [showArchived, setShowArchived] = useState(false);
  const filteredProjects = projects.filter(p => showArchived ? p.archived : !p.archived);

  return (
    <div className="space-y-12 pb-20 px-1 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h2 className="text-3xl font-light tracking-tight text-foreground">{showArchived ? 'Archived' : 'Productions'}</h2>
          <p className="text-sm text-muted-foreground mt-1">Manage your {showArchived ? 'past' : 'active'} production timecards and summaries.</p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outlineGlass"
            onClick={() => setShowArchived(!showArchived)}
            className="rounded-xl px-4 font-mono text-[11px] uppercase tracking-wider text-muted-foreground transition-colors hover:text-foreground"
          >
            {showArchived ? "Show Active" : "Show Archive"}
          </Button>
          {!showArchived && (
            <Button 
              onClick={onCreate}
              className="bg-primary text-primary-foreground hover:bg-primary/90 px-6 py-5 rounded-xl text-sm font-medium transition-all shadow-lg shadow-primary/20 hover:shadow-primary/40 hover:-translate-y-0.5"
            >
              <Plus className="size-4 mr-2" />
              New Production
            </Button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredProjects.map((p) => {
          const t = totals(p.entries, p.rates);
          const lastEntry = p.entries[0]?.date;
          
          return (
            <div 
              key={p.id}
              className="group relative bg-carbon/40 rounded-3xl border border-border/60 p-6 transition-all hover:bg-carbon/60 hover:border-primary/40 hover:shadow-2xl hover:shadow-primary/5 flex flex-col"
            >
              <div className="flex justify-between items-start mb-6">
                <div className="space-y-1 flex-1 min-w-0">
                  <div className="flex flex-col gap-0.5">
                    {p.crewRole && (
                      <span className="text-[9px] font-bold text-primary uppercase tracking-[0.15em] leading-none mb-1">
                        {p.crewRole}
                      </span>
                    )}
                    <h3 className="text-xl font-medium text-foreground truncate pr-4">{p.name}</h3>
                  </div>
                  <p className="text-[10px] font-mono uppercase tracking-[0.2em] text-muted-foreground">
                    Created {new Date(p.createdAt).toLocaleDateString("en-GB")}
                  </p>
                </div>
                
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button 
                      type="button"
                      className="p-2 -mr-2 text-muted-foreground hover:text-foreground transition-colors outline-none focus:ring-0"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                    >
                      <MoreVertical className="size-5 md:size-4" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 bg-obsidian border-border z-[100]">
                    <DropdownMenuItem 
                      className="cursor-pointer"
                      onSelect={() => {
                        const currentName = p.name;
                        const projectId = p.id;
                        // Use a short delay so the menu closes before the prompt blocks the thread
                        setTimeout(() => {
                          const name = prompt("Rename production:", currentName);
                          if (name !== null && name.trim()) onRename(projectId, name.trim());
                        }, 100);
                      }}
                    >
                      <Edit3 className="size-4 mr-2" /> Rename
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="cursor-pointer"
                      onSelect={() => onDuplicate(p.id)}
                    >
                      <Copy className="size-4 mr-2" /> Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuItem 
                      className="cursor-pointer"
                      onSelect={() => onToggleArchive(p.id, !p.archived)}
                    >
                      {p.archived ? <ArchiveRestore className="size-4 mr-2" /> : <Archive className="size-4 mr-2" />}
                      {p.archived ? "Restore" : "Archive"}
                    </DropdownMenuItem>
                    <div className="h-px bg-border my-1" />
                    <DropdownMenuItem 
                      className="text-ruby focus:text-ruby cursor-pointer"
                      onSelect={() => {
                        const currentName = p.name;
                        const projectId = p.id;
                        setTimeout(() => {
                          if (confirm(`Delete "${currentName}"? This cannot be undone.`)) onDelete(projectId);
                        }, 100);
                      }}
                    >
                      <Trash2 className="size-4 mr-2" /> Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="grid grid-cols-2 gap-4 mb-8">
                <div className="space-y-1">
                  <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground block">Accrued</span>
                  <p className="text-xl font-mono text-primary font-bold">{fmtGBP(t.grand)}</p>
                </div>
                <div className="space-y-1">
                  <span className="text-[9px] font-mono uppercase tracking-widest text-muted-foreground block">Session Count</span>
                  <p className="text-xl font-mono text-foreground">{p.entries.length} <span className="text-xs text-muted-foreground">Days</span></p>
                </div>
              </div>

              <div className="mt-auto pt-6 border-t border-border/40 flex items-center justify-between">
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Clock className="size-3.5" />
                  <span className="text-[10px] font-mono uppercase tracking-wider">
                    {lastEntry ? `Last: ${new Date(lastEntry).toLocaleDateString("en-GB")}` : "No entries yet"}
                  </span>
                </div>
                
                <Button 
                  variant="outlineGlass" 
                  size="sm" 
                  onClick={() => onSelect(p.id)}
                  className="rounded-full px-4 group-hover:bg-primary group-hover:text-primary-foreground transition-colors"
                >
                  Open <ExternalLink className="size-3 ml-2" />
                </Button>
              </div>
            </div>
          );
        })}

        {!showArchived && (
          <button 
            onClick={onCreate}
            className="rounded-3xl border-2 border-dashed border-border/40 p-6 flex flex-col items-center justify-center gap-4 text-muted-foreground hover:border-primary/40 hover:text-primary transition-all bg-transparent hover:bg-primary/5 min-h-[260px]"
          >
            <div className="size-12 rounded-full bg-carbon flex items-center justify-center border border-border">
              <Plus className="size-6" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">Add Production</p>
              <p className="text-[10px] uppercase tracking-widest mt-1">Start tracking another set</p>
            </div>
          </button>
        )}
      </div>

      {filteredProjects.length === 0 && showArchived && (
        <div className="flex flex-col items-center justify-center p-12 text-center text-muted-foreground bg-carbon/20 rounded-3xl border border-dashed border-border/40">
          <Archive className="size-12 mb-4 opacity-20" />
          <p className="text-sm">No archived productions found.</p>
        </div>
      )}
    </div>
  );
};
