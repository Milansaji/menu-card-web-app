import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../../firebase/firebase';
import { doc, onSnapshot, updateDoc, collection, query, where } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { ArrowLeft, Clock, CheckCircle2, ShoppingBag, Receipt, MapPin, Hash, ChefHat, Sparkles, History, RotateCw, Navigation } from 'lucide-react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { format } from 'date-fns';
import { toast } from 'react-hot-toast';

const TrackOrder = () => {
  const [activeOrders, setActiveOrders] = useState([]);
  const [pastOrders, setPastOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const { tableNumber } = useCart();
  const navigate = useNavigate();
  const unsubscribesRef = useRef([]);

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

    // 1. Listen for Table-wide Active Orders (The "Zomato" experience - anyone at the table sees the status)
    if (tableNumber) {
      const tableQuery = query(
        collection(db, 'bills'), 
        where('tableNumber', '==', String(tableNumber)),
        where('status', '!=', 'paid')
      );

      const unsubTable = onSnapshot(tableQuery, (snapshot) => {
        const tableActiveOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        
        setActiveOrders(prev => {
          // Merge table orders with personal orders, avoiding duplicates
          const personalOnly = prev.filter(p => !tableActiveOrders.some(t => t.id === p.id));
          return [...tableActiveOrders, ...personalOnly].sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
        });
        
        setLoading(false);
        setIsRefreshing(false);
      }, (err) => {
        console.error("Table sync error:", err);
        setLoading(false);
      });
      unsubscribesRef.current.push(unsubTable);
    }

    // 2. Listen for Personal Order History (IDs stored on this device)
    personalOrderIds.forEach(id => {
      const unsubPersonal = onSnapshot(doc(db, 'bills', id), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const orderObj = { id: snapshot.id, ...data };

          if (data.status === 'paid') {
            // Move to history if paid
            setActiveOrders(prev => prev.filter(o => o.id !== id));
            setPastOrders(prev => {
              const other = prev.filter(o => o.id !== id);
              return [...other, orderObj].sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
            });
          } else {
            // Update active orders
            setActiveOrders(prev => {
              const other = prev.filter(o => o.id !== id);
              return [...other, orderObj].sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
            });
          }
        }
        setLoading(false);
        setIsRefreshing(false);
      });
      unsubscribesRef.current.push(unsubPersonal);
    });

    // Fallback if no table and no history
    if (!tableNumber && personalOrderIds.length === 0) {
      setLoading(false);
      setIsRefreshing(false);
    }
  }, [tableNumber]);

  useEffect(() => {
    syncOrders();
    return () => unsubscribesRef.current.forEach(unsub => unsub());
  }, [syncOrders]);

  // Auto-status simulation
  useEffect(() => {
    if (activeOrders.length === 0) return;
    const timer = setInterval(() => {
      activeOrders.forEach(async (order) => {
        if (order.status === 'paid' || order.deliveryStatus === 'Served') return;
        const now = new Date();
        const placedAt = order.date?.toDate();
        if (!placedAt) return;
        const secondsElapsed = (now - placedAt) / 1000;
        const totalMinutes = order.totalCookingTime || 15;
        let targetStatus = order.deliveryStatus || 'Received';
        if (secondsElapsed > totalMinutes * 60) targetStatus = 'Served';
        else if (secondsElapsed > 45) targetStatus = 'Preparing';
        if (targetStatus !== order.deliveryStatus) {
          try { await updateDoc(doc(db, 'bills', order.id), { deliveryStatus: targetStatus }); } catch (err) {}
        }
      });
    }, 10000);
    return () => clearInterval(timer);
  }, [activeOrders]);

  const getStatusStep = (status) => {
    switch (status) {
      case 'Preparing': return 2;
      case 'Served': return 3;
      default: return 1;
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-12 max-w-2xl mx-auto min-h-screen bg-white">
        <div className="h-12 w-48 bg-gray-50 rounded-2xl animate-pulse" />
        <div className="space-y-10">
          {[1, 2].map(i => <div key={i} className="h-80 bg-gray-50 rounded-[3rem] animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-40 max-w-2xl mx-auto min-h-screen bg-gray-50/20">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate(-1)} className="w-12 h-12 flex items-center justify-center bg-white border border-gray-100 rounded-2xl shadow-sm active:scale-90 transition-all">
            <ArrowLeft size={24} strokeWidth={2.5} className="text-gray-900" />
          </button>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-gray-900 uppercase leading-none">Live Tracking</h1>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-2">
              {tableNumber ? `Table ${tableNumber} Command Center` : 'Guest Session Tracking'}
            </p>
          </div>
        </div>
        <button 
          onClick={syncOrders}
          className={`p-4 bg-white border border-gray-100 rounded-2xl shadow-sm active:scale-90 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
        >
          <RotateCw size={20} strokeWidth={2.5} className="text-indigo-600" />
        </button>
      </header>

      {activeOrders.length === 0 && pastOrders.length === 0 ? (
        <div className="text-center py-32 space-y-10 glass rounded-[3.5rem] border-dashed border-2 border-gray-100 mx-auto max-w-md">
          <div className="relative w-32 h-32 mx-auto">
            <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-20" />
            <div className="relative w-32 h-32 bg-linear-to-br from-indigo-50 to-indigo-100 rounded-full flex items-center justify-center text-indigo-500 shadow-inner">
              <ShoppingBag size={64} strokeWidth={1.5} />
            </div>
          </div>
          <div className="space-y-3 px-8">
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Kitchen is Quiet</h2>
            <p className="text-gray-400 text-sm font-medium leading-relaxed">No active orders found for this table. Scan a QR code or place a new order to begin.</p>
          </div>
          <Link to="/menu/main" className="inline-block">
            <Button className="px-12 py-5 shadow-2xl shadow-indigo-200 rounded-2xl text-xs font-black uppercase tracking-widest">
              Explore Menu
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-16">
          {activeOrders.map(order => {
            const step = getStatusStep(order.deliveryStatus);
            return (
              <div key={order.id} className="relative animate-in slide-in-from-bottom-12 duration-700">
                <div className="absolute -top-4 -right-4 z-10">
                  <div className="bg-indigo-600 text-white px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl flex items-center gap-2">
                    <span className="w-2 h-2 bg-white rounded-full animate-pulse" />
                    Live Status
                  </div>
                </div>
                
                <Card className="overflow-hidden border-none shadow-[0_30px_70px_rgba(0,0,0,0.08)] rounded-[3rem] bg-white" padding="p-0">
                  <div className="p-8 bg-linear-to-br from-indigo-600 to-violet-800 text-white">
                    <div className="flex justify-between items-start mb-8">
                      <div>
                        <p className="text-[10px] text-indigo-200 font-black uppercase tracking-[0.2em] mb-1.5">Table {order.tableNumber} Order</p>
                        <h2 className="text-3xl font-black tracking-tighter uppercase leading-none">#{order.invoiceNumber}</h2>
                      </div>
                      <div className="w-14 h-14 bg-white/10 rounded-2xl flex items-center justify-center backdrop-blur-md border border-white/10">
                        <Navigation size={28} className="text-indigo-100" />
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-8">
                      <div className="flex flex-col">
                        <span className="text-[10px] text-indigo-300 font-black uppercase tracking-widest mb-1">Time Estimate</span>
                        <span className="text-xl font-black tracking-tighter">{order.totalCookingTime || 15} Mins</span>
                      </div>
                      <div className="w-[1px] h-8 bg-white/20" />
                      <div className="flex flex-col">
                        <span className="text-[10px] text-indigo-300 font-black uppercase tracking-widest mb-1">Status</span>
                        <span className="text-xl font-black tracking-tighter uppercase">{order.deliveryStatus || 'Received'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="p-10 space-y-12">
                    <div className="relative">
                      <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-gray-50 -z-0" />
                      <div className="space-y-10 relative z-10">
                        {[
                          { id: 1, label: 'Order Confirmed', desc: 'Received by kitchen team', icon: Receipt },
                          { id: 2, label: 'Chef is Cooking', desc: 'Crafting your culinary delight', icon: ChefHat },
                          { id: 3, label: 'Ready to Serve', desc: 'On its way to your table', icon: CheckCircle2 }
                        ].map((item) => (
                          <div key={item.id} className={`flex items-start gap-6 transition-all duration-700 ${step < item.id ? 'opacity-30 grayscale' : 'opacity-100'}`}>
                            <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-lg ${step >= item.id ? 'bg-emerald-500 text-white shadow-emerald-200' : 'bg-gray-50 text-gray-300 shadow-none'}`}>
                              <item.icon size={22} strokeWidth={2.5} className={step === item.id ? 'animate-bounce' : ''} />
                            </div>
                            <div className="pt-1">
                              <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">{item.label}</h4>
                              <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">{item.desc}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div className="pt-8 border-t border-gray-50 space-y-4">
                      {order.items?.map((item, i) => (
                        <div key={i} className="flex justify-between items-center text-xs">
                          <span className="text-gray-500 font-black uppercase tracking-tight">
                            {item.name} <span className="text-gray-300 ml-1">×{item.quantity}</span>
                          </span>
                          <span className="text-gray-900 font-black tracking-tighter">₹{(item.price * item.quantity).toLocaleString()}</span>
                        </div>
                      ))}
                      <div className="flex justify-between items-end pt-4">
                        <span className="text-[10px] text-gray-300 font-black uppercase tracking-widest">Payable Total</span>
                        <span className="text-2xl font-black text-indigo-600 tracking-tighter">₹{order.totalAmount?.toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                </Card>
              </div>
            );
          })}

          {pastOrders.length > 0 && (
            <div className="space-y-8">
              <div className="flex items-center gap-4 ml-2">
                <History size={18} className="text-gray-400" />
                <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em]">Session History</h2>
                <div className="h-[1px] flex-1 bg-gray-100" />
              </div>
              <div className="grid grid-cols-1 gap-4">
                {pastOrders.map(order => (
                  <Card key={order.id} className="border border-gray-50 shadow-sm hover:shadow-md transition-all rounded-3xl group" padding="p-6">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-4">
                        <div className="w-12 h-12 bg-gray-50 text-indigo-600 rounded-2xl flex items-center justify-center font-black text-xs border border-gray-100 group-hover:bg-indigo-50 transition-colors">
                          {order.tableNumber}
                        </div>
                        <div>
                          <p className="text-xs font-black text-gray-900 tracking-tight uppercase">#{order.invoiceNumber}</p>
                          <p className="text-[10px] text-gray-400 font-bold tracking-widest">
                            {order.date?.toDate ? format(order.date.toDate(), 'dd MMM • HH:mm') : 'N/A'}
                          </p>
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
