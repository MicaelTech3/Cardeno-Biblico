import { initializeApp, getApps, getApp } from "firebase/app";
import { 
  getFirestore, 
  collection, 
  doc, 
  setDoc, 
  deleteDoc, 
  onSnapshot, 
  query, 
  orderBy,
  serverTimestamp
} from "firebase/firestore";
import { 
  getAuth, 
  GoogleAuthProvider, 
  signInWithPopup, 
  signOut as firebaseSignOut, 
  onAuthStateChanged,
  type User as FirebaseUser
} from "firebase/auth";
import { getAnalytics, isSupported } from "firebase/analytics";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyC1Qg-P_PRImjYN-hm6eQAI1jwfpIXzGsY",
  authDomain: "cardeno-de-estudos.firebaseapp.com",
  projectId: "cardeno-de-estudos",
  storageBucket: "cardeno-de-estudos.firebasestorage.app",
  messagingSenderId: "349676434783",
  appId: "1:349676434783:web:bf35538e7d794f630432ea",
  measurementId: "G-NM1DRYE9JY"
};

// Initialize Firebase
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

export const signInWithGoogle = async () => {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error: any) {
    console.error("Erro ao fazer login com o Google:", error);
    throw error;
  }
};

export const logoutFirebase = () => firebaseSignOut(auth);

// Helper function to remove undefined values and non-serializable objects before writing to Firestore
export function sanitizeForFirestore<T>(obj: T): any {
  if (obj === null || obj === undefined) return null;
  if (typeof obj !== 'object') return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeForFirestore(item));
  }
  const clean: Record<string, any> = {};
  for (const key of Object.keys(obj)) {
    const val = (obj as any)[key];
    if (
      val !== undefined &&
      typeof val !== 'function' &&
      typeof val !== 'symbol' &&
      !(typeof Element !== 'undefined' && val instanceof Element) &&
      !(typeof Window !== 'undefined' && val instanceof Window)
    ) {
      clean[key] = sanitizeForFirestore(val);
    }
  }
  return clean;
}

// Safe setDoc wrapper
export async function safeSetDoc(docRef: any, data: any, options?: any) {
  const cleanData = sanitizeForFirestore(data);
  return setDoc(docRef, cleanData, options);
}

// Initialize Analytics safely
export const initAnalytics = async () => {
  if (typeof window !== "undefined" && await isSupported()) {
    return getAnalytics(app);
  }
  return null;
};

export { collection, doc, setDoc, deleteDoc, onSnapshot, query, orderBy, serverTimestamp, onAuthStateChanged, type FirebaseUser };
