import React, { useState, useEffect, useCallback, useRef } from 'react';
import { db } from '../../firebase/firebase';
import { doc, onSnapshot, updateDoc, collection, query, where } from 'firebase/firestore';
import { useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { 
  ArrowLeft, Clock, CheckCircle2, ShoppingBag, Receipt, MapPin, 
  Hash, ChefHat, Sparkles, History, RotateCw, Navigation, 
  AlertCircle, Keyboard, ChevronRight
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
  const [manualTable, setManualTable] = useState('');
  const [showManualEntry, setShowManualEntry] = useState(false);
  
  const navigate = useNavigate();
  const unsubscribesRef = useRef([]);

  // Mobile Recovery: If table is in URL but not in state, grab it!
  useEffect(() => {
    const urlTable = searchParams.get('table');
    if (urlTable && !tableNumber) {
      setTableNumber(urlTable);
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

    // 1. Table-wide Active Orders
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
          return [...tableActiveOrders, ...personalOnly].sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
        });
        
        setLoading(false);
        setIsRefreshing(false);
      }, (err) => {
        console.error("Firestore Table Sync Error:", err);
        setLoading(false);
        setIsRefreshing(false);
        toast.error("Network issue. Reconnecting...");
      });
      unsubscribesRef.current.push(unsubTable);
    }

    // 2. Personal History Listeners
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
        setIsRefreshing(false);
      }, (err) => {
        setLoading(false);
      });
      unsubscribesRef.current.push(unsubPersonal);
    });

    // Timeout protection for slow mobile connections
    const timeout = setTimeout(() => {
      setLoading(false);
      setIsRefreshing(false);
    }, 4000);

    if (!tableNumber && personalOrderIds.length === 0) {
      setLoading(false);
      setIsRefreshing(false);
    }

    return () => clearTimeout(timeout);
  }, [tableNumber]);

  useEffect(() => {
    syncOrders();
    return () => unsubscribesRef.current.forEach(unsub => unsub());
  }, [syncOrders]);

  // Auto-status updates
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
    }, 10000);
    return () => clearInterval(timer);
  }, [activeOrders]);

  const handleManualSync = (e) => {
    e.preventDefault();
    if (!manualTable) return;
    setTableNumber(manualTable);
    setShowManualEntry(false);
    setLoading(true);
    toast.success(`Syncing Table ${manualTable}`);
  };

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen bg-white p-8 text-center">
        <div className="relative mb-8">
          <div className="w-20 h-20 border-4 border-indigo-50 border-t-indigo-600 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <RotateCw size={24} className="text-indigo-600 animate-pulse" />
          </div>
        </div>
        <h2 className="text-xl font-black text-gray-900 tracking-tighter uppercase">Synchronizing</h2>
        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-2">Connecting to Kitchen Engine...</p>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-40 max-w-2xl mx-auto min-h-screen bg-gray-50/20">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center bg-white border border-gray-100 rounded-xl shadow-sm active:scale-90 transition-all">
            <ArrowLeft size={20} strokeWidth={2.5} />
          </button>
          <div>
            <h1 className="text-2xl font-black tracking-tighter text-gray-900 uppercase leading-none">Live Order</h1>
            <div className="flex items-center gap-2 mt-1.5">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
              <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest">
                {tableNumber ? `Table ${tableNumber}` : 'Guest Session'}
              </p>
            </div>
          </div>
        </div>
        <button 
          onClick={syncOrders}
          className={`p-3.5 bg-white border border-gray-100 rounded-xl shadow-sm active:scale-90 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
        >
          <RotateCw size={18} strokeWidth={2.5} className="text-indigo-600" />
        </button>
      </header>

      {activeOrders.length === 0 && pastOrders.length === 0 ? (
        <div className="space-y-6">
          <div className="text-center py-20 space-y-8 bg-white rounded-[2.5rem] border border-gray-100 shadow-sm px-6">
            <div className="w-24 h-24 bg-indigo-50 rounded-full flex items-center justify-center text-indigo-500 mx-auto">
              <ShoppingBag size={40} />
            </div>
            <div className="space-y-2">
              <h2 className="text-xl font-black text-gray-900 uppercase tracking-tighter">No Active Sessions</h2>
              <p className="text-xs text-gray-400 font-medium px-4">We couldn't find any orders for this table. Try syncing manually if you've already ordered.</p>
            </div>
            
            <div className="pt-4 space-y-3">
              <Button onClick={() => setShowManualEntry(true)} variant="secondary" className="w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-2">
                <Keyboard size={14} />
                Enter Table Manually
              </Button>
              <Link to="/menu/main" className="block">
                <Button className="w-full py-5 rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-indigo-100">
                  Browse Menu
                </Button>
              </Link>
            </div>
          </div>

          {showManualEntry && (
            <Card className="p-8 rounded-[2rem] border-2 border-indigo-100 bg-indigo-50/30 animate-in zoom-in-95" padding="p-8">
              <form onSubmit={handleManualSync} className="space-y-4">
                <div className="flex items-center gap-3 mb-2">
                  <AlertCircle size={18} className="text-indigo-600" />
                  <h3 className="text-xs font-black text-gray-900 uppercase tracking-widest">Manual Sync</h3>
                </div>
                <input 
                  type="text" 
                  placeholder="Enter Table Number (e.g. 5)"
                  className="w-full p-4 bg-white border border-transparent rounded-xl focus:ring-4 focus:ring-indigo-100 outline-none text-sm font-bold transition-all shadow-sm"
                  value={manualTable}
                  onChange={(e) => setManualTable(e.target.value)}
                />
                <Button type="submit" className="w-full py-4 rounded-xl text-[10px] font-black uppercase">Sync Now</Button>
              </form>
            </Card>
          )}
        </div>
      ) : (
        <div className="space-y-12">
          {activeOrders.map(order => (
            <div key={order.id} className="relative animate-in slide-in-from-bottom-8 duration-700">
              <Card className="overflow-hidden border-none shadow-[0_25px_60px_rgba(0,0,0,0.06)] rounded-[2.5rem] bg-white" padding="p-0">
                <div className="p-8 bg-linear-to-br from-indigo-600 to-violet-800 text-white relative">
                  <div className="absolute top-0 right-0 p-8 opacity-10">
                    <ChefHat size={80} />
                  </div>
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p className="text-[9px] text-indigo-200 font-black uppercase tracking-widest mb-1">Live Order • Table {order.tableNumber}</p>
                      <h2 className="text-2xl font-black tracking-tighter uppercase leading-none">#{order.invoiceNumber}</h2>
                    </div>
                    <div className="px-3 py-1 bg-white/10 rounded-lg backdrop-blur-md border border-white/10 text-[9px] font-black uppercase tracking-widest">
                      {order.deliveryStatus}
                    </div>
                  </div>
                  <div className="flex items-center gap-6">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-indigo-300 font-black uppercase tracking-widest">Wait Time</span>
                      <span className="text-lg font-black tracking-tighter">{order.totalCookingTime || 15} MINS</span>
                    </div>
                    <div className="w-[1px] h-6 bg-white/20" />
                    <div className="flex flex-col">
                      <span className="text-[9px] text-indigo-300 font-black uppercase tracking-widest">Total</span>
                      <span className="text-lg font-black tracking-tighter">₹{order.totalAmount?.toLocaleString()}</span>
                    </div>
                  </div>
                </div>

                <div className="p-8 space-y-10">
                  <div className="relative pl-4">
                    <div className="absolute left-6 top-2 bottom-2 w-0.5 bg-gray-50" />
                    <div className="space-y-8 relative z-10">
                      {[
                        { id: 1, label: 'Confirmed', icon: Receipt, status: 'Received' },
                        { id: 2, label: 'Cooking', icon: ChefHat, status: 'Preparing' },
                        { id: 3, label: 'Served', icon: CheckCircle2, status: 'Served' }
                      ].map((s) => {
                        const isDone = order.deliveryStatus === s.status || 
                                     (s.id === 1 && (order.deliveryStatus === 'Preparing' || order.deliveryStatus === 'Served')) ||
                                     (s.id === 2 && order.deliveryStatus === 'Served');
                        const isCurrent = order.deliveryStatus === s.status;
                        
                        return (
                          <div key={s.id} className={`flex items-center gap-5 transition-all ${!isDone ? 'opacity-25' : 'opacity-100'}`}>
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${isDone ? 'bg-emerald-500 text-white' : 'bg-gray-100 text-gray-400'}`}>
                              <s.icon size={18} className={isCurrent ? 'animate-bounce' : ''} />
                            </div>
                            <div>
                              <h4 className="text-xs font-black text-gray-900 uppercase tracking-tight">{s.label}</h4>
                              {isCurrent && <p className="text-[9px] text-emerald-500 font-black uppercase tracking-widest mt-0.5">Currently here</p>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <Button onClick={() => navigate(`/menu/main?table=${order.tableNumber}`)} variant="secondary" className="w-full py-4 rounded-xl text-[10px] font-black uppercase tracking-widest border border-gray-100">Add More Items</Button>
                </div>
              </Card>
            </div>
          ))}

          {pastOrders.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3">
                <History size={16} className="text-gray-400" />
                <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Past Receipts</h2>
              </div>
              <div className="space-y-3">
                {pastOrders.map(order => (
                  <Card key={order.id} className="border border-gray-100 shadow-sm rounded-2xl" padding="p-4">
                    <div className="flex justify-between items-center">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center font-black text-[10px] text-gray-400">
                          {order.tableNumber}
                        </div>
                        <div>
                          <p className="text-[10px] font-black text-gray-900 uppercase">#{order.invoiceNumber}</p>
                          <p className="text-[8px] text-gray-400 font-bold uppercase">{order.date?.toDate ? format(order.date.toDate(), 'MMM dd • HH:mm') : ''}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-black text-emerald-600">₹{order.totalAmount?.toLocaleString()}</p>
                        <p className="text-[8px] font-black text-gray-300 uppercase tracking-widest">PAID</p>
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
