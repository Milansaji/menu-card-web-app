import { onAuthStateChanged, signInWithEmailAndPassword, signOut } from 'firebase/auth';
import { doc, getDoc, collection, query, onSnapshot, orderBy, limit, where } from 'firebase/firestore';
import { playSound } from '../utils/audio';
import { toast } from 'react-hot-toast';
import { ChefHat } from 'lucide-react';
import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);

  async function login(email, password) {
    return signInWithEmailAndPassword(auth, email, password);
  }

  function logout() {
    return signOut(auth);
  }

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      try {
        setCurrentUser(user);
        if (user) {
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists() && userDoc.data().role === 'admin') {
            setIsAdmin(true);
          } else {
            setIsAdmin(false);
          }
        } else {
          setIsAdmin(false);
        }
      } catch (error) {
        console.error("Auth initialization error:", error);
      } finally {
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  // Global Kitchen Intelligence Listener (Hardened for Production)
  const lastOrderRef = useRef(null);
  const [currentSound, setCurrentSound] = useState('bell');

  useEffect(() => {
    if (!isAdmin) return;

    // Fetch sound preference once
    getDoc(doc(db, 'settings', 'config')).then(snap => {
      if (snap.exists()) setCurrentSound(snap.data().notificationSound || 'bell');
    });

    // We only care about the very latest pending order
    const q = query(
      collection(db, 'bills'), 
      where('status', '==', 'pending'),
      orderBy('date', 'desc'), 
      limit(1)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (snapshot.empty) return;
      
      const latestDoc = snapshot.docs[0];
      const latestData = latestDoc.data();
      const latestId = latestDoc.id;

      // 1. UNIQUE HANDSHAKE: Only notify if it's a DIFFERENT order ID than the last one we saw
      // 2. RECENCY CHECK: Only notify if the order was placed within the last 60 seconds (prevents alerts for old orders on load)
      const orderTime = latestData.date?.toMillis() || 0;
      const now = Date.now();
      const isRecent = (now - orderTime) < 60000;

      if (lastOrderRef.current !== null && lastOrderRef.current !== latestId && isRecent) {
        playSound(currentSound);
        
        toast.custom((t) => (
          <div className={`${t.visible ? 'animate-in slide-in-from-top-full duration-500' : 'animate-out fade-out duration-300'} max-w-md w-full bg-slate-900 shadow-[0_30px_60px_rgba(0,0,0,0.4)] rounded-[2rem] pointer-events-auto flex ring-1 ring-white/10 p-5 border border-indigo-50/50`}>
            <div className="flex-1 w-0">
              <div className="flex items-start">
                <div className="flex-shrink-0">
                  <div className="h-14 w-14 rounded-2xl bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 animate-pulse">
                    <ChefHat size={28} strokeWidth={2.5} />
                  </div>
                </div>
                <div className="ml-5 flex-1 min-w-0 text-left">
                  <div className="flex items-center gap-2 mb-1">
                    <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">New Kitchen Alert</p>
                  </div>
                  <p className="text-2xl font-black text-white tracking-tighter uppercase leading-none">Table {latestData.tableNumber}</p>
                  <p className="mt-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Priority Request</p>
                </div>
              </div>
            </div>
            <div className="flex border-l border-white/5 ml-4 pl-4 items-center">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  window.location.href = '/admin/orders';
                }}
                className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-black text-white transition-all uppercase tracking-widest active:scale-95"
              >
                Go
              </button>
            </div>
          </div>
        ), { duration: 8000, position: 'top-center', id: latestId }); // id: latestId prevents duplicate toasts for the same order
      }
      
      lastOrderRef.current = latestId;
    });

    return () => unsubscribe();
  }, [isAdmin, currentSound]);

  const value = {
    currentUser,
    isAdmin,
    login,
    logout
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
