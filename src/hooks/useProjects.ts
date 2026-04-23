import { useEffect, useMemo, useState, useRef } from "react";
import type { DayEntry, RateConfig } from "@/lib/calc";
import { DEFAULT_RATES } from "@/lib/calc";
import { useFirebase } from "@/components/FirebaseProvider";
import { db, handleFirestoreError } from "@/lib/firebase";
import { 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  writeBatch, 
  serverTimestamp, 
  getDocs,
  collectionGroup,
  where
} from "firebase/firestore";

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
  const { user } = useFirebase();
  const [state, setState] = useState<{ projects: Project[]; activeId: string; isLoading: boolean }>({
    projects: [],
    activeId: "",
    isLoading: true,
  });
  
  const isSyncingFromCloud = useRef(false);

  useEffect(() => {
    if (!user) {
      const saved = initial();
      setState({ ...saved, isLoading: false });
      return;
    }

    // Load from Firestore if user is present
    setState(s => ({ ...s, isLoading: true }));
    
    const projectsQuery = query(collection(db, "users", user.uid, "projects"));
    const unsub = onSnapshot(projectsQuery, async (snapshot) => {
      isSyncingFromCloud.current = true;
      const projects: Project[] = [];
      
      for (const pDoc of snapshot.docs) {
        const pData = pDoc.data() as Omit<Project, "entries">;
        const entriesSnapshot = await getDocs(collection(db, "users", user.uid, "projects", pDoc.id, "entries"));
        const entries = entriesSnapshot.docs.map(d => d.data() as DayEntry);
        
        projects.push({
          ...pData,
          rates: mergeRates(pData.rates),
          entries: entries.sort((a, b) => b.date.localeCompare(a.date))
        });
      }

      // If cloud is empty but local has data, offer to upload (or just upload for now)
      if (projects.length === 0) {
        const local = initial();
        if (local.projects.length > 0) {
          for (const lp of local.projects) {
            await cloudSaveProject(user.uid, lp);
          }
          setState({ ...local, isLoading: false });
          return;
        }
      }

      setState(s => {
        const nextActiveId = snapshot.docs.find(d => d.id === s.activeId) ? s.activeId : (projects[0]?.id || "");
        return { projects, activeId: nextActiveId, isLoading: false };
      });
      isSyncingFromCloud.current = false;
    }, (err) => {
      handleFirestoreError(err, 'list', 'projects');
    });

    return () => unsub();
  }, [user]);

  const { projects, activeId, isLoading } = state;

  // Persistence to localStorage (as backup/offline cache)
  useEffect(() => {
    if (!isLoading && !isSyncingFromCloud.current) {
      localStorage.setItem(PROJECTS_KEY, JSON.stringify(projects));
    }
  }, [projects, isLoading]);

  useEffect(() => {
    if (!isLoading && !isSyncingFromCloud.current) {
      localStorage.setItem(ACTIVE_KEY, JSON.stringify(activeId));
    }
  }, [activeId, isLoading]);

  const active = useMemo(() => {
    if (isLoading || projects.length === 0) {
      return {
        id: "",
        name: "Loading...",
        createdAt: new Date().toISOString(),
        rates: DEFAULT_RATES,
        entries: [],
      };
    }
    return projects.find((p) => p.id === activeId) ?? projects[0];
  }, [projects, activeId, isLoading]);

  // Firestore Sync Helpers
  const cloudSaveProject = async (uid: string, p: Project) => {
    const { entries, ...data } = p;
    await setDoc(doc(db, "users", uid, "projects", p.id), {
      ...data,
      updatedAt: serverTimestamp()
    });
    const batch = writeBatch(db);
    entries.forEach(e => {
      batch.set(doc(db, "users", uid, "projects", p.id, "entries", e.id), e);
    });
    await batch.commit();
  };

  const cloudDeleteProject = async (uid: string, pid: string) => {
    await deleteDoc(doc(db, "users", uid, "projects", pid));
    // Note: Recursive delete of subcollections is handled by client batch or rules cleanup if needed
    // For simplicity, we assume entries are clean or we use a cloud function later. 
    // In small apps, manually deleting entries is fine.
    const entries = await getDocs(collection(db, "users", uid, "projects", pid, "entries"));
    const batch = writeBatch(db);
    entries.forEach(d => batch.delete(d.ref));
    await batch.commit();
  };

  const setActive = (id: string) => setState((s) => ({ ...s, activeId: id }));

  const createProject = async (name: string, initialRates?: RateConfig) => {
    const p: Project = {
      id: crypto.randomUUID(),
      name: name.trim() || "New Production",
      createdAt: new Date().toISOString(),
      rates: initialRates || DEFAULT_RATES,
      entries: [],
    };
    setState((s) => ({ ...s, projects: [...s.projects, p], activeId: p.id }));
    if (user) await cloudSaveProject(user.uid, p);
  };

  const renameProject = async (id: string, name: string) => {
    setState((s) => ({ ...s, projects: s.projects.map((p) => p.id === id ? { ...p, name } : p) }));
    if (user) await setDoc(doc(db, "users", user.uid, "projects", id), { name }, { merge: true });
  };

  const deleteProject = async (id: string) => {
    setState((s) => {
      const remaining = s.projects.filter((p) => p.id !== id);
      const newActive = s.activeId === id ? (remaining[0]?.id || "") : s.activeId;
      return { ...s, projects: remaining, activeId: newActive };
    });
    if (user) await cloudDeleteProject(user.uid, id);
  };

  const duplicateProject = async (id: string) => {
    const src = projects.find((p) => p.id === id);
    if (!src) return;
    const copy: Project = { ...src, id: crypto.randomUUID(), name: `${src.name} (copy)`, createdAt: new Date().toISOString() };
    setState((s) => ({ ...s, projects: [...s.projects, copy], activeId: copy.id }));
    if (user) await cloudSaveProject(user.uid, copy);
  };

  // Active-project mutations
  const setRates = async (rates: RateConfig) => {
    setState((s) => ({ ...s, projects: s.projects.map((p) => p.id === s.activeId ? { ...p, rates } : p) }));
    if (user && activeId) await setDoc(doc(db, "users", user.uid, "projects", activeId), { rates }, { merge: true });
  };

  const addEntry = async (e: Omit<DayEntry, "id">) => {
    const newEntry = { ...e, id: crypto.randomUUID() };
    setState((s) => ({
      ...s,
      projects: s.projects.map((p) => p.id === s.activeId
        ? { ...p, entries: [newEntry, ...p.entries] }
        : p),
    }));
    if (user && activeId) {
      await setDoc(doc(db, "users", user.uid, "projects", activeId, "entries", newEntry.id), newEntry);
    }
  };

  const updateEntry = async (id: string, patch: Partial<DayEntry>) => {
    setState((s) => ({
      ...s,
      projects: s.projects.map((p) => p.id === s.activeId
        ? { ...p, entries: p.entries.map((e) => e.id === id ? { ...e, ...patch } : e) }
        : p),
    }));
    if (user && activeId) {
      await setDoc(doc(db, "users", user.uid, "projects", activeId, "entries", id), patch, { merge: true });
    }
  };

  const removeEntry = async (id: string) => {
    setState((s) => ({
      ...s,
      projects: s.projects.map((p) => p.id === s.activeId
        ? { ...p, entries: p.entries.filter((e) => e.id !== id) }
        : p),
    }));
    if (user && activeId) {
      await deleteDoc(doc(db, "users", user.uid, "projects", activeId, "entries", id));
    }
  };

  return {
    projects,
    active,
    isLoading,
    setActive,
    createProject,
    renameProject,
    deleteProject,
    duplicateProject,
    entries: active.entries,
    rates: active.rates,
    project: active.name,
    setRates,
    setProject: (name: string) => renameProject(activeId, name),
    addEntry,
    updateEntry,
    removeEntry,
  };
}
