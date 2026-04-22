import { useEffect, useMemo, useState } from "react";
import type { DayEntry, RateConfig } from "@/lib/calc";
import { DEFAULT_RATES } from "@/lib/calc";

const PROJECTS_KEY = "slatetrack.projects.v2";
const ACTIVE_KEY = "slatetrack.activeProject.v2";

// Legacy v1 keys (single-project model) — migrated on first load.
const LEGACY_ENTRIES = "slatetrack.entries.v1";
const LEGACY_RATES = "slatetrack.rates.v1";
const LEGACY_PROJECT = "slatetrack.project.v1";

export type Project = {
  id: string;
  name: string;
  createdAt: string;
  rates: RateConfig;
  entries: DayEntry[];
};

function load<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function mergeRates(stored: Partial<RateConfig> | undefined): RateConfig {
  const s = stored || {};
  return {
    ...DEFAULT_RATES,
    ...s,
    dayTypeRates: { ...DEFAULT_RATES.dayTypeRates, ...(s.dayTypeRates || {}) },
  };
}

function migrateLegacy(): Project[] | null {
  const legacyEntries = localStorage.getItem(LEGACY_ENTRIES);
  const legacyRates = localStorage.getItem(LEGACY_RATES);
  const legacyName = localStorage.getItem(LEGACY_PROJECT);
  if (!legacyEntries && !legacyRates && !legacyName) return null;
  try {
    const entries: DayEntry[] = legacyEntries ? JSON.parse(legacyEntries) : [];
    const rates = mergeRates(legacyRates ? JSON.parse(legacyRates) : {});
    const name = (legacyName ? JSON.parse(legacyName) : "Untitled Production") as string;
    return [{
      id: crypto.randomUUID(),
      name: name || "Untitled Production",
      createdAt: new Date().toISOString(),
      rates,
      entries,
    }];
  } catch {
    return null;
  }
}

function initial(): { projects: Project[]; activeId: string } {
  const existing = load<Project[]>(PROJECTS_KEY, []);
  if (existing.length) {
    // Re-merge rates so older saves get new fields (shootingOTMinutes etc).
    const projects = existing.map((p) => ({ ...p, rates: mergeRates(p.rates) }));
    const active = load<string>(ACTIVE_KEY, projects[0].id);
    return { projects, activeId: projects.find((p) => p.id === active) ? active : projects[0].id };
  }
  const migrated = migrateLegacy();
  if (migrated) return { projects: migrated, activeId: migrated[0].id };
  const fresh: Project = {
    id: crypto.randomUUID(),
    name: "Untitled Production",
    createdAt: new Date().toISOString(),
    rates: DEFAULT_RATES,
    entries: [],
  };
  return { projects: [fresh], activeId: fresh.id };
}

export function useProjects() {
  const [{ projects, activeId }, setState] = useState(initial);

  useEffect(() => { localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects)); }, [projects]);
  useEffect(() => { localStorage.setItem(ACTIVE_KEY, JSON.stringify(activeId)); }, [activeId]);

  const active = useMemo(() => projects.find((p) => p.id === activeId) ?? projects[0], [projects, activeId]);

  const setActive = (id: string) => setState((s) => ({ ...s, activeId: id }));

  const createProject = (name: string) => {
    const p: Project = {
      id: crypto.randomUUID(),
      name: name.trim() || "New Production",
      createdAt: new Date().toISOString(),
      rates: DEFAULT_RATES,
      entries: [],
    };
    setState((s) => ({ projects: [...s.projects, p], activeId: p.id }));
  };

  const renameProject = (id: string, name: string) =>
    setState((s) => ({ ...s, projects: s.projects.map((p) => p.id === id ? { ...p, name } : p) }));

  const deleteProject = (id: string) =>
    setState((s) => {
      const remaining = s.projects.filter((p) => p.id !== id);
      if (remaining.length === 0) {
        const fresh: Project = {
          id: crypto.randomUUID(),
          name: "Untitled Production",
          createdAt: new Date().toISOString(),
          rates: DEFAULT_RATES,
          entries: [],
        };
        return { projects: [fresh], activeId: fresh.id };
      }
      const newActive = s.activeId === id ? remaining[0].id : s.activeId;
      return { projects: remaining, activeId: newActive };
    });

  const duplicateProject = (id: string) =>
    setState((s) => {
      const src = s.projects.find((p) => p.id === id);
      if (!src) return s;
      const copy: Project = { ...src, id: crypto.randomUUID(), name: `${src.name} (copy)`, createdAt: new Date().toISOString() };
      return { projects: [...s.projects, copy], activeId: copy.id };
    });

  // Active-project mutations
  const patchActive = (patch: Partial<Project>) =>
    setState((s) => ({ ...s, projects: s.projects.map((p) => p.id === s.activeId ? { ...p, ...patch } : p) }));

  const setRates = (rates: RateConfig) => patchActive({ rates });
  const setProjectName = (name: string) => patchActive({ name });

  const addEntry = (e: Omit<DayEntry, "id">) =>
    setState((s) => ({
      ...s,
      projects: s.projects.map((p) => p.id === s.activeId
        ? { ...p, entries: [{ ...e, id: crypto.randomUUID() }, ...p.entries] }
        : p),
    }));

  const updateEntry = (id: string, patch: Partial<DayEntry>) =>
    setState((s) => ({
      ...s,
      projects: s.projects.map((p) => p.id === s.activeId
        ? { ...p, entries: p.entries.map((e) => e.id === id ? { ...e, ...patch } : e) }
        : p),
    }));

  const removeEntry = (id: string) =>
    setState((s) => ({
      ...s,
      projects: s.projects.map((p) => p.id === s.activeId
        ? { ...p, entries: p.entries.filter((e) => e.id !== id) }
        : p),
    }));

  return {
    projects,
    active,
    setActive,
    createProject,
    renameProject,
    deleteProject,
    duplicateProject,
    // active-project shortcuts
    entries: active.entries,
    rates: active.rates,
    project: active.name,
    setRates,
    setProject: setProjectName,
    addEntry,
    updateEntry,
    removeEntry,
  };
}
