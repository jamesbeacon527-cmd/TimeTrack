import { collection, doc, setDoc, updateDoc, deleteDoc, onSnapshot, query, writeBatch, serverTimestamp, getDocs } from "firebase/firestore";
import { db } from "./firebase";
import type { Project } from "@/hooks/useProjects";
import type { DayEntry } from "./calc";

export async function syncProjectToCloud(userId: string, project: Project) {
  const projectRef = doc(db, "users", userId, "projects", project.id);
  const { entries, ...projectData } = project;
  
  await setDoc(projectRef, {
    ...projectData,
    updatedAt: serverTimestamp()
  });

  // Batch entries
  const batch = writeBatch(db);
  entries.forEach(entry => {
    const entryRef = doc(db, "users", userId, "projects", project.id, "entries", entry.id);
    batch.set(entryRef, entry);
  });
  await batch.commit();
}

export function subscribeToProjects(userId: string, onUpdate: (projects: Project[]) => void) {
  const projectsQuery = query(collection(db, "users", userId, "projects"));
  
  return onSnapshot(projectsQuery, async (snapshot) => {
    const projects: Project[] = [];
    
    for (const projectDoc of snapshot.docs) {
      const projectData = projectDoc.data() as Omit<Project, "entries">;
      
      // Fetch entries for each project
      const entriesQuery = query(collection(db, "users", userId, "projects", projectDoc.id, "entries"));
      const entriesSnapshot = await getDocs(entriesQuery);
      const entries = entriesSnapshot.docs.map(d => d.data() as DayEntry);
      
      projects.push({
        ...projectData,
        entries: entries.sort((a, b) => b.date.localeCompare(a.date))
      });
    }
    
    onUpdate(projects);
  });
}

// More granular sync functions can be added here
