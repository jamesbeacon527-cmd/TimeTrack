import React, { createContext, useContext, useEffect, useState } from "react";
import { User, onAuthStateChanged } from "firebase/auth";
import { auth, loginWithGoogle, logout as firebaseLogout, db } from "@/lib/firebase";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

interface FirebaseContextType {
  user: User | null;
  userData: any | null;
  loading: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
}

const FirebaseContext = createContext<FirebaseContextType | undefined>(undefined);

export function FirebaseProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    return onAuthStateChanged(auth, async (u) => {
      if (u) {
        // Sync user profile
        const userRef = doc(db, "users", u.uid);
        const userSnap = await getDoc(userRef);
        let data = userSnap.data();
        if (!userSnap.exists()) {
          const newData = {
            id: u.uid,
            email: u.email,
            displayName: u.displayName,
            createdAt: new Date().toISOString(), // Rules logic expects string for now based on DRAFT
            updatedAt: serverTimestamp()
          };
          await setDoc(userRef, newData);
          data = newData;
        }
        setUserData(data || null);
      } else {
        setUserData(null);
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
    <FirebaseContext.Provider value={{ user, userData, loading, login, logout: handleLogout }}>
      {children}
    </FirebaseContext.Provider>
  );
}

export function useFirebase() {
  const context = useContext(FirebaseContext);
  if (!context) throw new Error("useFirebase must be used within a FirebaseProvider");
  return context;
}
