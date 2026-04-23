import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth, loginWithGoogle, logout as firebaseLogout, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

interface FirebaseContextType {
  user: User | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        // Sync user profile
        const userRef = doc(db, "users", u.uid);
        const userSnap = await getDoc(userRef);
        if (!userSnap.exists()) {
          await setDoc(userRef, {
            id: u.uid,
            email: u.email,
            displayName: u.displayName,
            createdAt: new Date().toISOString(), // Rules logic expects string for now based on DRAFT
            updatedAt: serverTimestamp()
          });
        }
      }
      setUser(u);
      setLoading(false);
    });
  }, []);

  const login = async () => {
    try {
      await loginWithGoogle();
    } catch (err: unknown) {
      console.error("Login Error:", err);
      throw err;
    }
  };

  const handleLogout = async () => {
    await firebaseLogout();
  };

  return (
    <FirebaseContext.Provider value={{ user, loading, login, logout: handleLogout }}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (!context) throw new Error("useFirebase must be used within a FirebaseProvider");
  return context;
}
