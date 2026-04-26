import { useState } from "react";
import { Check, ChevronsUpDown, Copy, FolderPlus, Pencil, Trash2, Archive, ArchiveRestore } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import type { Project } from "@/hooks/useProjects";

type Props = {
  projects: Project[];
  activeId: string;
  onSelect: (id: string) => void;
  onCreate: (name: string) => void;
  onRename: (id: string, name: string) => void;
  onDuplicate: (id: string) => void;
  onToggleArchive: (id: string, archive: boolean) => void;
  onDelete: (id: string) => void;
};

export const ProjectSwitcher = ({ projects, activeId, onSelect, onCreate, onRename, onDuplicate, onToggleArchive, onDelete }: Props) => {
  const [open, setOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const active = projects.find((p) => p.id === activeId);

  const handleNew = () => {
    const name = window.prompt("New production name (max 50 chars)", "");
    if (!name) return;
    const trimmed = name.trim().slice(0, 50);
    if (!trimmed) {
      alert("Project name cannot be empty.");
      return;
    }
    onCreate(trimmed);
  };
  const handleRename = (p: Project) => {
    const name = window.prompt("Rename production", p.name);
    if (!name) return;
    const trimmed = name.trim().slice(0, 50);
    if (!trimmed) {
      alert("Project name cannot be empty.");
      return;
    }
    onRename(p.id, trimmed);
  };
  const handleDelete = (p: Project) => {
    if (confirm(`Delete "${p.name}" and all its entries? This cannot be undone.`)) onDelete(p.id);
  };

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="outlineGlass" size="default" className="min-w-[14rem] justify-between">
          <span className="truncate text-left">
            <span className="block text-[9px] font-mono uppercase tracking-widest text-muted-foreground">
              {active?.crewRole || "Project"}
            </span>
            <span className="block text-foreground font-medium tracking-tight uppercase truncate">{active?.name}</span>
          </span>
          <ChevronsUpDown className="size-4 text-muted-foreground shrink-0 ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 bg-carbon border-border overflow-y-auto max-h-[85vh]">
        <div className="flex items-center justify-between px-2 pt-2 pb-1">
          <DropdownMenuLabel className="text-[10px] font-mono uppercase tracking-widest text-muted-foreground p-0">
            {showArchived ? "Archived Productions" : "Active Productions"}
          </DropdownMenuLabel>
          <button
            onClick={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setShowArchived(!showArchived);
            }}
            className="text-[10px] font-mono uppercase tracking-widest text-primary hover:text-primary/80 transition-colors"
          >
            {showArchived ? "Show Active" : "Show Archive"}
          </button>
        </div>
        
        {projects
          .filter(p => showArchived ? p.archived : !p.archived)
          .map((p) => {
          const isActive = p.id === activeId;
          return (
            <DropdownMenuItem
              key={p.id}
              className={`flex items-center justify-between gap-2 cursor-pointer group/item ${p.archived ? 'opacity-60 hover:opacity-100 transition-opacity' : ''}`}
              onSelect={() => {
                if (!open) return; // Guard against accidental triggers
                onSelect(p.id);
              }}
            >
              <span className="flex items-center gap-2 min-w-0 pointer-events-none w-full pr-2">
                <Check className={`size-3.5 shrink-0 ${isActive ? "text-primary" : "opacity-0"}`} />
                <span className="truncate flex-1 min-w-0">
                  <span className="block text-sm text-foreground truncate">{p.name}</span>
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {p.crewRole && <span className="text-[9px] uppercase tracking-widest text-primary font-bold">{p.crewRole}</span>}
                    <span className="text-[10px] font-mono text-muted-foreground whitespace-nowrap">{p.entries.length} day{p.entries.length === 1 ? "" : "s"}</span>
                  </div>
                </span>
              </span>
              <span className="flex items-center gap-1 shrink-0 opacity-0 group-hover/item:opacity-100 transition-opacity">
                {!p.archived && (
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { 
                      e.preventDefault();
                      e.stopPropagation(); 
                      handleRename(p); 
                    }}
                    className="p-1.5 rounded hover:bg-secondary/80 text-muted-foreground hover:text-foreground relative z-50"
                    aria-label="Rename project"
                  ><Pencil className="size-3" /></button>
                )}
                {!p.archived && (
                  <button
                    type="button"
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => { 
                      e.preventDefault();
                      e.stopPropagation(); 
                      onDuplicate(p.id); 
                    }}
                    className="p-1.5 rounded hover:bg-secondary/80 text-muted-foreground hover:text-foreground relative z-50"
                    aria-label="Duplicate project"
                  ><Copy className="size-3" /></button>
                )}
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { 
                    e.preventDefault();
                    e.stopPropagation(); 
                    onToggleArchive(p.id, !p.archived);
                  }}
                  className="p-1.5 rounded hover:bg-secondary/80 text-muted-foreground hover:text-foreground relative z-50"
                  aria-label={p.archived ? "Restore project" : "Archive project"}
                >
                  {p.archived ? <ArchiveRestore className="size-3" /> : <Archive className="size-3" />}
                </button>
                <button
                  type="button"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => { 
                    e.preventDefault();
                    e.stopPropagation(); 
                    handleDelete(p); 
                  }}
                  className="p-1.5 rounded hover:bg-ruby/20 text-muted-foreground hover:text-ruby relative z-50"
                  aria-label="Delete project"
                ><Trash2 className="size-3" /></button>
              </span>
            </DropdownMenuItem>
          );
        })}
        {projects.filter(p => showArchived ? p.archived : !p.archived).length === 0 && (
          <div className="px-2 py-4 text-center text-sm text-muted-foreground">
            No {showArchived ? "archived" : "active"} productions.
          </div>
        )}
        <DropdownMenuSeparator />
        <DropdownMenuItem onSelect={(e) => { e.preventDefault(); handleNew(); setOpen(false); }} className="cursor-pointer">
          <FolderPlus className="size-4 mr-2 text-primary" />
          <span className="text-sm">New production…</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
