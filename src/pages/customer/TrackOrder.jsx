import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../../firebase/firebase';
import { doc, onSnapshot, updateDoc, collection, query, where } from 'firebase/firestore';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { 
  ArrowLeft, CheckCircle2, ShoppingBag, Receipt, MapPin, 
  ChefHat, History, RotateCw, Navigation, Utensils
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

  // Automated Session Recovery: Priority URL -> Priority Context
  useEffect(() => {
    const urlTable = searchParams.get('table');
    if (urlTable && urlTable !== tableNumber) {
      setTableNumber(urlTable);
      localStorage.setItem('currentTable', urlTable);
    }
  }, [searchParams, tableNumber, setTableNumber]);

  const syncOrders = useCallback(() => {
    setIsRefreshing(true);
    
    // Clear previous listeners
    unsubscribesRef.current.forEach(unsub => unsub());
    unsubscribesRef.current = [];

    const existingHistory = localStorage.getItem('myOrders');
    let personalOrderIds = [];
    try {
      personalOrderIds = existingHistory ? JSON.parse(existingHistory) : [];
      if (!Array.isArray(personalOrderIds)) personalOrderIds = [];
    } catch (e) { personalOrderIds = []; }

    // 1. Table-wide Auto-Detection
    if (tableNumber) {
      const tableQuery = query(
        collection(db, 'bills'), 
        where('tableNumber', '==', String(tableNumber).trim()),
        where('status', '==', 'pending')
      );

      const unsubTable = onSnapshot(tableQuery, (snapshot) => {
        const tableActiveOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        setActiveOrders(prev => {
          const personalOnly = prev.filter(p => !tableActiveOrders.some(t => t.id === p.id));
          const combined = [...tableActiveOrders, ...personalOnly];
          return combined.sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
        });
        
        setLoading(false);
        setIsRefreshing(false);
      }, (err) => {
        console.error("Firestore Error:", err);
        setLoading(false);
        setIsRefreshing(false);
      });
      unsubscribesRef.current.push(unsubTable);
    }

    // 2. Personal Vault Listeners
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
        setLoading(false);
      }, (err) => setLoading(false));
      unsubscribesRef.current.push(unsubPersonal);
    });

    // Final check for empty states
    if (!tableNumber && personalOrderIds.length === 0) {
      setLoading(false);
      setIsRefreshing(false);
    }

    // Fallback for connectivity issues
    const timeout = setTimeout(() => {
      setLoading(false);
      setIsRefreshing(false);
    }, 5000);
    return () => clearTimeout(timeout);
  }, [tableNumber]);

  useEffect(() => {
    syncOrders();
    return () => unsubscribesRef.current.forEach(unsub => unsub());
  }, [syncOrders]);

  // Real-time status handshake
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
    }, 15000);
    return () => clearInterval(timer);
  }, [activeOrders]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white">
        <div className="w-16 h-16 border-4 border-indigo-50 border-t-indigo-600 rounded-full animate-spin mb-4" />
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Finding your session...</p>
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
            <h1 className="text-2xl font-black tracking-tighter text-gray-900 uppercase leading-none">Order Status</h1>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1.5 flex items-center gap-2">
              <MapPin size={10} className="text-indigo-500" />
              {tableNumber ? `Table ${tableNumber}` : 'Guest Mode'}
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

      {activeOrders.length === 0 && pastOrders.length === 0 ? (
        <div className="text-center py-20 px-8 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm space-y-8">
          <div className="w-20 h-20 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500 mx-auto">
            <Utensils size={32} />
          </div>
          <div className="space-y-3">
            <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Ready to Order?</h2>
            <p className="text-xs text-gray-400 font-medium leading-relaxed">We couldn't find any active sessions for this table. Start a fresh order to begin tracking.</p>
          </div>
          <Button onClick={() => navigate(`/menu/main${tableNumber ? `?table=${tableNumber}` : ''}`)} className="w-full py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100">
            View Menu
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
                      <p className="text-[9px] text-indigo-300 font-black uppercase tracking-widest mb-1.5">Order #{order.invoiceNumber}</p>
                      <h2 className="text-3xl font-black tracking-tighter uppercase leading-none">Table {order.tableNumber}</h2>
                    </div>
                    <div className="px-3 py-1.5 bg-emerald-500 text-[9px] font-black uppercase tracking-widest rounded-lg shadow-lg shadow-emerald-500/20">
                      {order.deliveryStatus}
                    </div>
                  </div>
                  <div className="flex gap-10">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-indigo-400 font-black uppercase tracking-widest">Wait Time</span>
                      <span className="text-xl font-black tracking-tighter">{order.totalCookingTime || 15}m</span>
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[9px] text-indigo-400 font-black uppercase tracking-widest">Total Bill</span>
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
                        { id: 3, label: 'Served', desc: 'Ready on your table', icon: CheckCircle2, status: 'Served' }
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
                  <Button onClick={() => navigate(`/menu/main?table=${order.tableNumber}`)} variant="secondary" className="w-full py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-gray-100 hover:bg-gray-50 transition-colors">Order More Items</Button>
                </div>
              </Card>
            </div>
          ))}

          {pastOrders.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 ml-2">
                <History size={16} className="text-gray-400" />
                <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Recent Sessions</h2>
              </div>
              <div className="space-y-4">
                {pastOrders.map(order => (
                  <Card key={order.id} className="border border-gray-100 shadow-sm rounded-3xl" padding="p-5">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xs border border-gray-100">
                          {order.tableNumber}
                        </div>
                        <div>
                          <p className="text-xs font-black text-gray-900 uppercase tracking-tight">#{order.invoiceNumber}</p>
                          <p className="text-[9px] text-gray-400 font-bold uppercase">{order.date?.toDate ? format(order.date.toDate(), 'dd MMM • HH:mm') : ''}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-emerald-600 tracking-tighter">₹{order.totalAmount?.toLocaleString()}</p>
                        <div className="flex items-center justify-end gap-1 mt-0.5">
                          <CheckCircle2 size={10} className="text-emerald-500" />
                          <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500">Paid</span>
                        </div>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default TrackOrder;
