import React, { createContext, useContext, useEffect, useMemo, useState, useRef } from "react";
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
  writeBatch, 
  serverTimestamp, 
  getDocs,
} from "firebase/firestore";

export type Project = {
  id: string;
  name: string;
  createdAt: string;
  rates: RateConfig;
  entries: DayEntry[];
};

type ProjectState = {
  projects: Project[];
  activeId: string;
  isLoading: boolean;
  isSyncing: boolean;
};

type ProjectContextType = {
  projects: Project[];
  active: Project;
  isLoading: boolean;
  isSyncing: boolean;
  setActive: (id: string) => void;
  createProject: (name: string, initialRates?: RateConfig) => Promise<void>;
  renameProject: (id: string, name: string) => Promise<void>;
  deleteProject: (id: string) => Promise<void>;
  duplicateProject: (id: string) => Promise<void>;
  entries: DayEntry[];
  rates: RateConfig;
  project: string;
  setRates: (rates: RateConfig) => Promise<void>;
  setProject: (name: string) => Promise<void>;
  addEntry: (e: Omit<DayEntry, "id">) => Promise<void>;
  updateEntry: (id: string, patch: Partial<DayEntry>) => Promise<void>;
  removeEntry: (id: string) => Promise<void>;
};

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

const PROJECTS_KEY = "slatetrack.projects.v2";
const ACTIVE_KEY = "slatetrack.activeProject.v2";

function safeGet(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

export function safeSet(key: string, value: string) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // Ignore
  }
}

export function safeRemove(key: string) {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore
  }
}

function load<T>(key: string, fallback: T): T {
  try {
    const raw = safeGet(key);
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

function initial(): { projects: Project[]; activeId: string } {
  const raw = safeGet(PROJECTS_KEY);
  if (raw) {
    try {
      const existing = JSON.parse(raw) as Project[];
      if (existing.length > 0) {
        const projects = existing.map((p) => ({ ...p, rates: mergeRates(p.rates) }));
        const active = load<string>(ACTIVE_KEY, projects[0].id);
        return { projects, activeId: projects.find((p) => p.id === active) ? active : projects[0].id };
      } else {
        return { projects: [], activeId: "" };
      }
    } catch {
      // JSON error, proceed to fallback
    }
  }
  
  const fresh: Project = {
    id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
    name: "Untitled Production",
    createdAt: new Date().toISOString(),
    rates: DEFAULT_RATES,
    entries: [],
  };
  return { projects: [fresh], activeId: fresh.id };
}

export const ProjectProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, loading: authLoading } = useFirebase();
  const [state, setState] = useState<ProjectState>({
    projects: [],
    activeId: "",
    isLoading: true,
    isSyncing: false,
  });
  
  const isSyncingFromCloud = useRef(false);
  const syncLock = useRef(0);
  const projectsRef = useRef<Project[]>([]);
  const hasEverLoadedCloud = useRef(false);
  const wasLoggedIn = useRef(false);

  useEffect(() => {
    projectsRef.current = state.projects;
  }, [state.projects]);

  const setSyncing = (val: boolean) => {
    setState(s => ({ ...s, isSyncing: val }));
    if (val) syncLock.current++;
    else syncLock.current = Math.max(0, syncLock.current - 1);
  };

  // Sync with Cloud
  useEffect(() => {
    if (!user) {
      const saved = initial();
      setState({ ...saved, isLoading: false, isSyncing: false });
      hasEverLoadedCloud.current = false;
      return;
    }

    // On login, we should consider if we need to clear local data that doesn't belong to this user
    // However, for simplicity in this template, we assume the user wants to migrate local data once.
    // We'll clear localStorage on logout later.

    setState(s => ({ ...s, isLoading: true }));
    
    const unsub = onSnapshot(collection(db, "users", user.uid, "projects"), async (snapshot) => {
      // If we have local pending writes or sync lock, we shouldn't overwrite our optimistic local state
      // but we still need to process new projects or other changes eventually.
      // However, typical simple way is to let metadata.hasPendingWrites pass through, 
      // but map carefully so we don't clobber local edits.
      const projectDocs = snapshot.docs;
      
      // Migration logic: Only run if it's the first time we load cloud and it's empty
      if (projectDocs.length === 0 && !hasEverLoadedCloud.current) {
        hasEverLoadedCloud.current = true;
        const local = initial();
        if (local.projects.length > 0) {
          console.log("[ProjectProvider] Empty cloud, migrating local data...");
          setSyncing(true);
          try {
            for (const p of local.projects) await cloudSaveProject(user.uid, p);
          } catch (err) {
            console.error("[ProjectProvider] Migration failed:", err);
          } finally {
            setSyncing(false);
            setState(s => ({ ...s, isLoading: false }));
          }
          return;
        }
        setState(s => ({ ...s, projects: [], activeId: "", isLoading: false, isSyncing: false }));
        return;
      }

      hasEverLoadedCloud.current = true;
      isSyncingFromCloud.current = true;
      
      try {
        const cloudProjects = await Promise.all(projectDocs.map(async (pDoc) => {
          const pData = pDoc.data() as Omit<Project, "entries"> & { updatedAt?: unknown };
          const existing = projectsRef.current.find(p => p.id === pDoc.id);
          
          let entries: DayEntry[] = [];
          
          // Optimization: only re-fetch entries if needed
          // We manually touch `updatedAt` on parent when entries change.
          // If we have an existing project and its updatedAt hasn't changed (server vs local),
          // we could potentially skip fetching but Firestore timestamps are tricky to compare accurately.
          // For now, let's always try to get entries but fallback to local ones if it fails.
          
          try {
            const entSnap = await getDocs(collection(db, "users", user.uid, "projects", pDoc.id, "entries"));
            if (!entSnap.empty) {
              entries = entSnap.docs.map(d => d.data() as DayEntry);
            } else if (existing && existing.entries.length > 0 && syncLock.current > 0) {
              // If server says empty but we are in-flight and had entries, stay safe
              entries = existing.entries;
            }
          } catch (e) {
            console.warn("[ProjectProvider] Failed to fetch entries for:", pDoc.id, e);
            if (existing) entries = existing.entries;
          }

          return {
            ...pData,
            rates: mergeRates(pData.rates),
            entries: entries.sort((a, b) => b.date.localeCompare(a.date))
          };
        }));

        setState(s => {
          // If cloud data is missing entries that we had locally (and we were syncing), try to keep them
          const finalProjects = cloudProjects.map(cp => {
            const lp = s.projects.find(p => p.id === cp.id);
            if (cp.entries.length === 0 && lp && lp.entries.length > 0 && s.isSyncing) {
              return { ...cp, entries: lp.entries };
            }
            return cp;
          });

          let nextActiveId = s.activeId;
          if (!snapshot.docs.find(d => d.id === nextActiveId)) {
             nextActiveId = finalProjects[0]?.id || "";
          }
          
          return {
            projects: finalProjects,
            activeId: nextActiveId,
            isLoading: false,
            isSyncing: false
          };
        });
      } finally {
        setTimeout(() => {
          isSyncingFromCloud.current = false;
        }, 800);
      }
    }, (err) => {
      console.error("[ProjectProvider] Snapshot error:", err);
      setState(s => ({ ...s, isLoading: false, isSyncing: false }));
    });

    return () => unsub();
  }, [user]);

  // Persistence to localStorage
  useEffect(() => {
    if (!state.isLoading) {
      safeSet(PROJECTS_KEY, JSON.stringify(state.projects));
      safeSet(ACTIVE_KEY, JSON.stringify(state.activeId));
    }
  }, [state.projects, state.activeId, state.isLoading]);

  // Clear local storage on logout to prevent state mixups
  useEffect(() => {
    if (user) {
      wasLoggedIn.current = true;
    } else if (!authLoading && wasLoggedIn.current && user === null) {
      // User was logged in, auth is not loading, and user is null -> they logged out!
      safeRemove(PROJECTS_KEY);
      safeRemove(ACTIVE_KEY);
      
      setState({ projects: [], activeId: "", isLoading: false, isSyncing: false });
      hasEverLoadedCloud.current = false;
      wasLoggedIn.current = false;
    }
  }, [user, authLoading]);

  const active = useMemo(() => {
    if (state.isLoading || state.projects.length === 0) {
      return {
        id: "",
        name: state.projects.length === 0 && !state.isLoading ? "No Project" : "Loading...",
        createdAt: new Date().toISOString(),
        rates: DEFAULT_RATES,
        entries: [],
      };
    }
    return state.projects.find((p) => p.id === state.activeId) ?? state.projects[0];
  }, [state.projects, state.activeId, state.isLoading]);

  // Cloud Helpers
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
    const entries = await getDocs(collection(db, "users", uid, "projects", pid, "entries"));
    const batch = writeBatch(db);
    entries.forEach(d => batch.delete(d.ref));
    await batch.commit();
  };

  // Actions
  const setActive = (id: string) => setState(s => ({ ...s, activeId: id }));

  const createProject = async (name: string, initialRates?: RateConfig) => {
    const p: Project = {
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
      name: name.trim() || "New Production",
      createdAt: new Date().toISOString(),
      rates: initialRates || DEFAULT_RATES,
      entries: [],
    };
    setState(s => ({ ...s, projects: [...s.projects, p], activeId: p.id }));
    if (user) {
      setSyncing(true);
      try {
        await cloudSaveProject(user.uid, p);
      } catch (err) {
        if (err instanceof Error) handleFirestoreError(err, 'create', `projects/${p.id}`);
      } finally {
        setSyncing(false);
      }
    }
  };

  const renameProject = async (id: string, name: string) => {
    if (!name.trim()) return;
    setState(s => ({
      ...s,
      projects: s.projects.map(p => p.id === id ? { ...p, name: name.trim() } : p)
    }));
    if (user) {
      setSyncing(true);
      try {
        await setDoc(doc(db, "users", user.uid, "projects", id), {
          name: name.trim(),
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (err) {
        if (err instanceof Error) handleFirestoreError(err, 'update', `projects/${id}`);
      } finally {
        setSyncing(false);
      }
    }
  };

  const deleteProject = async (id: string) => {
    setState(s => {
      const remaining = s.projects.filter(p => p.id !== id);
      const newActive = s.activeId === id ? (remaining[0]?.id || "") : s.activeId;
      return { ...s, projects: remaining, activeId: newActive };
    });
    if (user) {
      setSyncing(true);
      try {
        await cloudDeleteProject(user.uid, id);
      } catch (err) {
        if (err instanceof Error) handleFirestoreError(err, 'delete', `projects/${id}`);
      } finally {
        setSyncing(false);
      }
    }
  };

  const duplicateProject = async (id: string) => {
    const src = state.projects.find(p => p.id === id);
    if (!src) return;
    const copy: Project = { 
      ...src, 
      id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15),
      name: `${src.name} (copy)`, 
      createdAt: new Date().toISOString() 
    };
    setState(s => ({ ...s, projects: [...s.projects, copy], activeId: copy.id }));
    if (user) {
      setSyncing(true);
      try {
        await cloudSaveProject(user.uid, copy);
      } catch (err) {
        if (err instanceof Error) handleFirestoreError(err, 'create', `projects/${copy.id}`);
      } finally {
        setSyncing(false);
      }
    }
  };

  const setRates = async (rates: RateConfig) => {
    const aid = state.activeId;
    if (!aid) return;
    setState(s => ({
      ...s,
      projects: s.projects.map(p => p.id === aid ? { ...p, rates } : p)
    }));
    if (user) {
      setSyncing(true);
      try {
        await setDoc(doc(db, "users", user.uid, "projects", aid), {
          rates,
          updatedAt: serverTimestamp()
        }, { merge: true });
      } catch (err) {
        if (err instanceof Error) handleFirestoreError(err, 'update', `projects/${aid}`);
      } finally {
        setSyncing(false);
      }
    }
  };

  const addEntry = async (e: Omit<DayEntry, "id">) => {
    const aid = state.activeId;
    if (!aid) return;
    const newEntry = { ...e, id: typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2, 15) };
    setState(s => ({
      ...s,
      projects: s.projects.map(p => p.id === aid ? { ...p, entries: [newEntry, ...p.entries] } : p)
    }));
    if (user) {
      setSyncing(true);
      try {
        const batch = writeBatch(db);
        batch.set(doc(db, "users", user.uid, "projects", aid, "entries", newEntry.id), newEntry);
        batch.set(doc(db, "users", user.uid, "projects", aid), { updatedAt: serverTimestamp() }, { merge: true });
        await batch.commit();
      } catch (err) {
        if (err instanceof Error) handleFirestoreError(err, 'create', `projects/${aid}/entries/${newEntry.id}`);
      } finally {
        setSyncing(false);
      }
    }
  };

  const updateEntry = async (id: string, patch: Partial<DayEntry>) => {
    const aid = state.activeId;
    if (!aid) return;
    setState(s => ({
      ...s,
      projects: s.projects.map(p => p.id === aid
        ? { ...p, entries: p.entries.map(e => e.id === id ? { ...e, ...patch } : e) }
        : p)
    }));
    if (user) {
      setSyncing(true);
      try {
        const batch = writeBatch(db);
        batch.set(doc(db, "users", user.uid, "projects", aid, "entries", id), patch, { merge: true });
        batch.set(doc(db, "users", user.uid, "projects", aid), { updatedAt: serverTimestamp() }, { merge: true });
        await batch.commit();
      } catch (err) {
        if (err instanceof Error) handleFirestoreError(err, 'update', `projects/${aid}/entries/${id}`);
      } finally {
        setSyncing(false);
      }
    }
  };

  const removeEntry = async (id: string) => {
    const aid = state.activeId;
    if (!aid) return;
    setState(s => ({
      ...s,
      projects: s.projects.map(p => p.id === aid
        ? { ...p, entries: p.entries.filter(e => e.id !== id) }
        : p)
    }));
    if (user) {
      setSyncing(true);
      try {
        const batch = writeBatch(db);
        batch.delete(doc(db, "users", user.uid, "projects", aid, "entries", id));
        batch.set(doc(db, "users", user.uid, "projects", aid), { updatedAt: serverTimestamp() }, { merge: true });
        await batch.commit();
      } catch (err) {
        if (err instanceof Error) handleFirestoreError(err, 'delete', `projects/${aid}/entries/${id}`);
      } finally {
        setSyncing(false);
      }
    }
  };

  const value = {
    projects: state.projects,
    active,
    isLoading: state.isLoading,
    isSyncing: state.isSyncing,
    setActive,
    createProject,
    renameProject,
    deleteProject,
    duplicateProject,
    entries: active.entries,
    rates: active.rates,
    project: active.name,
    setRates,
    setProject: (name: string) => renameProject(state.activeId, name),
    addEntry,
    updateEntry,
    removeEntry,
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
};

export const useProjects = () => {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProjects must be used within a ProjectProvider");
  }
  return context;
};
