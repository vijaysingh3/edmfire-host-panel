'use client';

import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useRouter } from 'next/navigation';
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut,
  User,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

// Firestore hosts document ka interface
interface HostData {
  fullName?: string;
  gmail?: string;
  mobile?: string;
  whatsapp?: string;
  gender?: string;
  age?: number;
  selfieUrl?: string;
  state?: string;
  district?: string;
  city?: string;
  ffNickname?: string;
  currentRank?: string;
  gameModes?: string;
  playingYears?: string;
  status?: string;
  [key: string]: any;
}

interface AuthContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  user: User | null;
  hostData: HostData | null;
  login: (email: string, password: string) => Promise<string | null>;
  logout: () => Promise<void>;
  refreshHostData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [hostData, setHostData] = useState<HostData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const router = useRouter();

  // Firestore se host data fetch karna
  const fetchHostData = async (uid: string): Promise<HostData | null> => {
    try {
      const docRef = doc(db, 'hosts', uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        return docSnap.data() as HostData;
      }
      return null;
    } catch (err) {
      console.error('🔥 [Auth] Firestore fetch error:', err);
      return null;
    }
  };

  // Firebase Auth state listener — page refresh pe bhi login rahega
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      console.log('🔥 [Auth] State changed:', firebaseUser?.email || 'no user');
      if (firebaseUser) {
        setUser(firebaseUser);
        // Firestore se host data fetch karo
        const data = await fetchHostData(firebaseUser.uid);
        if (data && data.status === 'verified') {
          setHostData(data);
          setIsAuthenticated(true);
        } else {
          // host not found ya verified nahi hai
          console.log('🔥 [Auth] Host not verified or not found, logging out...');
          await signOut(auth);
          setUser(null);
          setHostData(null);
          setIsAuthenticated(false);
        }
      } else {
        setUser(null);
        setHostData(null);
        setIsAuthenticated(false);
      }
      setIsLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Real login — Firebase Auth + Firestore verification
  const login = async (email: string, password: string): Promise<string | null> => {
    setIsLoading(true);
    try {
      // Firebase Auth se sign in
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const firebaseUser = userCredential.user;
      console.log('🔥 [Auth] Firebase sign-in success:', firebaseUser.email);

      // Firestore se host document check karo
      const hostDoc = await fetchHostData(firebaseUser.uid);
      if (!hostDoc) {
        await signOut(auth);
        return 'Host account not found. Contact admin.';
      }
      if (hostDoc.status !== 'verified') {
        await signOut(auth);
        return `Your account is ${hostDoc.status || 'not approved'} yet. Wait for admin approval.`;
      }

      setUser(firebaseUser);
      setHostData(hostDoc);
      setIsAuthenticated(true);
      return null; // null = success
    } catch (err: any) {
      console.error('🔥 [Auth] Login error:', err.code, err.message);
      // Firebase error codes ko user-friendly message mein convert karo
      switch (err.code) {
        case 'auth/user-not-found':
          return 'No account found with this email.';
        case 'auth/wrong-password':
          return 'Incorrect password. Try again.';
        case 'auth/invalid-credential':
          return 'Invalid email or password.';
        case 'auth/too-many-requests':
          return 'Too many failed attempts. Try again later.';
        case 'auth/invalid-email':
          return 'Please enter a valid email address.';
        case 'auth/network-request-failed':
          return 'Network error. Check your internet connection.';
        default:
          return err.message || 'Login failed. Please try again.';
      }
    } finally {
      setIsLoading(false);
    }
  };

  // Real logout
  const logout = async () => {
    try {
      await signOut(auth);
    } catch (err) {
      console.error('🔥 [Auth] Logout error:', err);
    }
    setUser(null);
    setHostData(null);
    setIsAuthenticated(false);
    router.push('/login');
  };

  // Refresh host data (profile update ke baad call kar sakte hain)
  const refreshHostData = async () => {
    if (user) {
      const data = await fetchHostData(user.uid);
      if (data) setHostData(data);
    }
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, isLoading, user, hostData, login, logout, refreshHostData }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
