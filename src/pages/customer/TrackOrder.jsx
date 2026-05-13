import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../../firebase/firebase';
import { doc, onSnapshot, updateDoc, collection, query, where } from 'firebase/firestore';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { 
  ArrowLeft, CheckCircle2, ShoppingBag, Receipt, MapPin, 
  ChefHat, History, RotateCw, Navigation, Utensils, AlertTriangle, Info
} from 'lucide-react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

const TrackOrder = () => {
  const [activeOrders, setActiveOrders] = useState([]);
  const [pastOrders, setPastOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [searchParams] = useSearchParams();
  const { tableNumber, setTableNumber } = useCart();
  
  const navigate = useNavigate();
  const unsubscribesRef = useRef([]);

  // Technical Diagnostics
  const isConfigured = !!import.meta.env.VITE_FIREBASE_API_KEY;

  useEffect(() => {
    const urlTable = searchParams.get('table');
    if (urlTable && urlTable !== tableNumber) {
      setTableNumber(urlTable);
      localStorage.setItem('currentTable', urlTable);
      toast.success(`Tracking Table ${urlTable}`, { icon: '📍' });
    }
  }, [searchParams, tableNumber, setTableNumber]);

  const syncOrders = useCallback(() => {
    if (!isConfigured) {
      toast.error("Firebase Config Missing in Production!");
      setLoading(false);
      return;
    }

    setIsRefreshing(true);
    unsubscribesRef.current.forEach(unsub => unsub());
    unsubscribesRef.current = [];

    const existingHistory = localStorage.getItem('myOrders');
    let personalOrderIds = [];
    try {
      personalOrderIds = existingHistory ? JSON.parse(existingHistory) : [];
      if (!Array.isArray(personalOrderIds)) personalOrderIds = [];
    } catch (e) { personalOrderIds = []; }

    // 1. ROBUST FRONTEND-FIRST SYNC
    // Instead of complex queries that might fail on data types or indexes,
    // we fetch ALL pending bills and filter locally. 
    // This is 100% reliable for "Automatic Detection".
    const activeQuery = query(collection(db, 'bills'), where('status', '==', 'pending'));
    
    const unsubTable = onSnapshot(activeQuery, (snapshot) => {
      const allPending = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Normalize comparison for both String and Number types
      const tableMatch = allPending.filter(order => 
        String(order.tableNumber).trim() === String(tableNumber || '').trim()
      );
      
      // AUTO-ADOPT: Ensure these orders are in local history so they survive the "Paid" transition
      if (tableMatch.length > 0) {
        const existingHistory = JSON.parse(localStorage.getItem('myOrders') || '[]');
        let updated = false;
        tableMatch.forEach(order => {
          if (!existingHistory.includes(order.id)) {
            existingHistory.push(order.id);
            updated = true;
          }
        });
        if (updated) {
          localStorage.setItem('myOrders', JSON.stringify(existingHistory));
          // Trigger a re-sync to start listeners for the newly adopted IDs
          syncOrders();
        }
      }

      setActiveOrders(prev => {
        const personalOnly = prev.filter(p => !tableMatch.some(t => t.id === p.id));
        return [...tableMatch, ...personalOnly].sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
      });
      
      setLoading(false);
      setIsRefreshing(false);
    }, (err) => {
      console.error("Firestore Permission or Connection Error:", err);
      // If it's a Permission Error, it means rules weren't deployed
      if (err.code === 'permission-denied') {
        toast.error("Security Rules Blocking Phone Access. Please Deploy Rules.", { duration: 6000 });
      }
      setLoading(false);
      setIsRefreshing(false);
    });
    unsubscribesRef.current.push(unsubTable);

    // 2. Direct Doc Listeners (Backups)
    personalOrderIds.forEach(id => {
      const unsubPersonal = onSnapshot(doc(db, 'bills', id), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const orderObj = { id: snapshot.id, ...data };

          if (data.status === 'paid') {
            setActiveOrders(prev => prev.filter(o => o.id !== id));
            setPastOrders(prev => {
              const other = prev.filter(o => o.id !== id);
              return [...other, orderObj].sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
            });
          } else {
            setActiveOrders(prev => {
              const other = prev.filter(o => o.id !== id);
              return [...other, orderObj].sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
            });
          }
        }
      }, (err) => {});
      unsubscribesRef.current.push(unsubPersonal);
    });

    if (!tableNumber && personalOrderIds.length === 0) {
      setLoading(false);
      setIsRefreshing(false);
    }

    const timeout = setTimeout(() => {
      setLoading(false);
      setIsRefreshing(false);
    }, 6000);
    return () => clearTimeout(timeout);
  }, [tableNumber, isConfigured]);

  useEffect(() => {
    syncOrders();
    return () => unsubscribesRef.current.forEach(unsub => unsub());
  }, [syncOrders]);

  useEffect(() => {
    if (activeOrders.length === 0) return;
    const timer = setInterval(() => {
      activeOrders.forEach(async (order) => {
        if (order.status === 'paid' || order.deliveryStatus === 'Served') return;
        const placedAt = order.date?.toDate();
        if (!placedAt) return;
        const secondsElapsed = (new Date() - placedAt) / 1000;
        const totalMinutes = order.totalCookingTime || 15;
        let targetStatus = order.deliveryStatus || 'Received';
        if (secondsElapsed > totalMinutes * 60) targetStatus = 'Served';
        else if (secondsElapsed > 45) targetStatus = 'Preparing';
        if (targetStatus !== order.deliveryStatus) {
          try { await updateDoc(doc(db, 'bills', order.id), { deliveryStatus: targetStatus }); } catch (err) {}
        }
      });
    }, 20000);
    return () => clearInterval(timer);
  }, [activeOrders]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white text-center p-8">
        <div className="w-16 h-16 border-4 border-indigo-50 border-t-indigo-600 rounded-full animate-spin mb-6" />
        <h2 className="text-lg font-black text-gray-900 uppercase tracking-tighter">Syncing Table</h2>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mt-2">Connecting to Kitchen...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-6 duration-1000 pb-40 max-w-2xl mx-auto min-h-screen bg-gray-50/20">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-5">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center bg-white border border-gray-100 rounded-xl shadow-sm active:scale-90 transition-all">
            <ArrowLeft size={20} strokeWidth={2.5} />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-gray-900 uppercase leading-none">Live Tracker</h1>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1.5 flex items-center gap-2">
              <MapPin size={10} className="text-indigo-500" />
              {tableNumber ? `Table ${tableNumber}` : 'Scanning...'}
            </p>
          </div>
        </div>
        <button 
          onClick={syncOrders}
          className={`p-3 bg-white border border-gray-100 rounded-xl shadow-sm active:scale-90 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
        >
          <RotateCw size={18} strokeWidth={2.5} className="text-indigo-600" />
        </button>
      </header>

      {/* Diagnostic Alert for User */}
      {!isConfigured && (
        <div className="bg-red-50 border border-red-100 p-6 rounded-3xl flex gap-4">
          <AlertTriangle className="text-red-500 shrink-0" />
          <div className="space-y-1">
            <p className="text-xs font-black text-red-900 uppercase">Production Error</p>
            <p className="text-[10px] text-red-700 font-bold leading-relaxed">Firebase environment variables are missing in your deployment dashboard.</p>
          </div>
        </div>
      )}

      {activeOrders.length === 0 ? (
        <div className="text-center py-20 px-8 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500 mx-auto">
            <Utensils size={32} />
          </div>
          <div className="space-y-3">
            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">No Active Orders</h2>
            <p className="text-xs text-gray-400 font-medium leading-relaxed">Everything is settled! If you just ordered, please wait a moment for the kitchen to confirm.</p>
          </div>
          <Button onClick={() => navigate(`/menu/main${tableNumber ? `?table=${tableNumber}` : ''}`)} className="w-full py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100">
            Open Menu
          </Button>
        </div>
      ) : (
        <div className="space-y-12">
          {activeOrders.map(order => (
            <div key={order.id} className="relative animate-in slide-in-from-bottom-10 duration-700">
              <Card className="overflow-hidden border-none shadow-[0_30px_60px_rgba(0,0,0,0.06)] rounded-[3rem] bg-white" padding="p-0">
                <div className="p-8 bg-linear-to-br from-gray-900 to-indigo-900 text-white relative">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <ShoppingBag size={80} />
                  </div>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-[9px] text-indigo-300 font-black uppercase tracking-widest mb-1.5">Live Bill #{order.invoiceNumber}</p>
                      <h2 className="text-3xl font-black tracking-tighter uppercase leading-none">Table {order.tableNumber}</h2>
                    </div>
                    <div className="px-3 py-1.5 bg-emerald-500 text-[9px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-emerald-500/20">
                      {order.deliveryStatus}
                    </div>
                  </div>
                  <div className="flex gap-10">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-indigo-400 font-black uppercase tracking-widest">Time Remaining</span>
                      <span className="text-xl font-black tracking-tighter">{order.totalCookingTime || 15}m</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-indigo-400 font-black uppercase tracking-widest">Running Total</span>
                      <span className="text-xl font-black tracking-tighter">₹{order.totalAmount?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="p-10 space-y-12">
                  <div className="relative pl-4">
                    <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-gray-50" />
                    <div className="space-y-10 relative z-10">
                      {[
                        { id: 1, label: 'Confirmed', desc: 'Received by kitchen', icon: Receipt, status: 'Received' },
                        { id: 2, label: 'Cooking', desc: 'Chef is preparing', icon: ChefHat, status: 'Preparing' },
                        { id: 3, label: 'Served', desc: 'Enjoy your meal', icon: CheckCircle2, status: 'Served' }
                      ].map((s) => {
                        const isDone = order.deliveryStatus === s.status || 
                                     (s.id === 1 && (order.deliveryStatus === 'Preparing' || order.deliveryStatus === 'Served')) ||
                                     (s.id === 2 && order.deliveryStatus === 'Served');
                        const isCurrent = order.deliveryStatus === s.status;
                        
                        return (
                          <div key={s.id} className={`flex items-start gap-6 transition-all duration-500 ${!isDone ? 'opacity-20 grayscale' : 'opacity-100'}`}>
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${isDone ? 'bg-emerald-500 text-white shadow-emerald-100' : 'bg-gray-50 text-gray-300'}`}>
                              <s.icon size={20} strokeWidth={2.5} className={isCurrent ? 'animate-bounce' : ''} />
                            </div>
                            <div className="pt-1">
                              <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">{s.label}</h4>
                              <p className="text-[9px] text-gray-400 font-bold uppercase tracking-widest mt-1">{s.desc}</p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <Button onClick={() => navigate(`/menu/main?table=${order.tableNumber}`)} variant="secondary" className="w-full py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-gray-100 hover:bg-gray-50 transition-colors">Add to Order</Button>
                </div>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};


export default TrackOrder;
