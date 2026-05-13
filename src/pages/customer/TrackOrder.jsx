import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { ArrowLeft, Clock, CheckCircle2, ShoppingBag, Receipt, MapPin, Hash, ChefHat, Sparkles, History, RotateCw } from 'lucide-react';
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

  const fetchOrders = useCallback(() => {
    const orderIds = JSON.parse(localStorage.getItem('myOrders') || '[]');
    
    if (orderIds.length === 0) {
      setLoading(false);
      return [];
    }

    setIsRefreshing(true);
    const unsubscribes = orderIds.map(id => 
      onSnapshot(doc(db, 'bills', id), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          const orderObj = { id: snapshot.id, ...data };

          if (data.status !== 'paid') {
            setActiveOrders(prev => {
              const other = prev.filter(o => o.id !== id);
              return [...other, orderObj].sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
            });
          } else {
            setActiveOrders(prev => prev.filter(o => o.id !== id));
            setPastOrders(prev => {
              const other = prev.filter(o => o.id !== id);
              return [...other, orderObj].sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
            });
          }
        }
      }, (err) => {
        console.error("Order sync error:", err);
      })
    );

    setLoading(false);
    setTimeout(() => setIsRefreshing(false), 1000);
    return unsubscribes;
  }, [tableNumber]);

  useEffect(() => {
    const unsubscribes = fetchOrders();
    return () => {
      if (Array.isArray(unsubscribes)) {
        unsubscribes.forEach(unsub => unsub());
      }
    };
  }, [fetchOrders]);

  // Auto-status progression logic (Simulation/Fallback)
  useEffect(() => {
    if (activeOrders.length === 0) return;

    const timer = setInterval(() => {
      activeOrders.forEach(async (order) => {
        if (order.status === 'paid') return;
        
        const now = new Date();
        const placedAt = order.date?.toDate();
        if (!placedAt) return;

        const secondsElapsed = (now - placedAt) / 1000;
        const totalMinutes = order.totalCookingTime || 15;
        
        let targetStatus = order.deliveryStatus || 'Received';

        if (secondsElapsed > totalMinutes * 60) {
          targetStatus = 'Served';
        } else if (secondsElapsed > 60) {
          targetStatus = 'Preparing';
        }

        if (targetStatus !== order.deliveryStatus) {
          try {
            const orderRef = doc(db, 'bills', order.id);
            await updateDoc(orderRef, { deliveryStatus: targetStatus });
          } catch (err) {
            console.error("Auto-update failed:", err);
          }
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

  const handleManualRefresh = () => {
    fetchOrders();
    toast.success('Syncing with kitchen...', {
      icon: '🔄',
      style: { borderRadius: '1rem', background: '#333', color: '#fff' }
    });
  };

  if (loading) {
    return (
      <div className="p-8 space-y-10 max-w-2xl mx-auto min-h-screen bg-gray-50/30">
        <div className="h-12 w-48 bg-gray-200 rounded-2xl animate-shimmer" />
        <div className="space-y-8">
          {[1, 2].map(i => <div key={i} className="h-72 bg-gray-200 rounded-[2.5rem] animate-shimmer" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-40 max-w-2xl mx-auto min-h-screen bg-gray-50/30">
      <header className="flex items-center justify-between">
        <div className="flex items-center gap-6">
          <button onClick={() => navigate(-1)} className="w-12 h-12 flex items-center justify-center bg-white border border-gray-100 rounded-2xl shadow-sm active:scale-90 transition-all">
            <ArrowLeft size={24} strokeWidth={2.5} className="text-gray-900" />
          </button>
          <div>
            <h1 className="text-3xl font-black tracking-tighter text-gray-900 uppercase leading-none">Order Tracking</h1>
            <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-2">Kitchen Synchronization</p>
          </div>
        </div>
        <button 
          onClick={handleManualRefresh}
          className={`p-4 bg-white border border-gray-100 rounded-2xl shadow-sm active:scale-90 transition-all ${isRefreshing ? 'animate-spin' : ''}`}
        >
          <RotateCw size={20} strokeWidth={2.5} className="text-indigo-600" />
        </button>
      </header>

      {activeOrders.length === 0 && pastOrders.length === 0 ? (
        <div className="text-center py-32 space-y-10 glass rounded-[3rem] border-dashed border-2 border-gray-100 mx-auto max-w-md">
          <div className="relative w-32 h-32 mx-auto">
            <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-20" />
            <div className="relative w-32 h-32 bg-linear-to-br from-indigo-50 to-indigo-100 rounded-full flex items-center justify-center text-indigo-500 shadow-inner">
              <ShoppingBag size={64} strokeWidth={1.5} />
            </div>
          </div>
          <div className="space-y-3 px-8">
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">No Culinary Logs</h2>
            <p className="text-gray-500 text-sm font-medium leading-relaxed">Your order history is empty. Start a new session to see your records here.</p>
          </div>
          <Link to="/menu/main" className="inline-block">
            <Button className="px-12 py-5 shadow-2xl shadow-indigo-100 rounded-2xl">
              Start Ordering
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-12">
          {/* Active Orders Section */}
          {activeOrders.length > 0 && (
            <div className="space-y-8">
              <div className="flex items-center gap-3 ml-2">
                <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Live Sessions</h2>
              </div>
              <div className="space-y-8">
                {activeOrders.map(order => {
                  const step = getStatusStep(order.deliveryStatus);
                  return (
                    <Card key={order.id} className="overflow-hidden border-none shadow-[0_30px_60px_rgba(0,0,0,0.06)] hover:shadow-[0_40px_80px_rgba(0,0,0,0.1)] transition-all duration-700 rounded-[2.5rem]" padding="p-0">
                      <div className="p-6 bg-linear-to-r from-indigo-600 to-violet-700 text-white flex justify-between items-center">
                        <div className="flex items-center gap-4">
                          <div className="bg-white/20 p-3 rounded-2xl backdrop-blur-md">
                            <Hash size={20} strokeWidth={3} />
                          </div>
                          <span className="font-black text-xl tracking-tighter">{order.invoiceNumber}</span>
                        </div>
                        <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-5 py-2.5 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10 shadow-lg">
                          <Sparkles size={14} className="text-amber-400 animate-pulse" />
                          {order.status}
                        </div>
                      </div>

                      <div className="p-8 space-y-12">
                        {/* Tracker */}
                        <div className="space-y-10">
                          <div className="flex justify-between items-center bg-gray-50/50 p-6 rounded-[1.5rem] border border-gray-100">
                            <div className="flex items-center gap-5">
                              <div className="p-4 bg-white text-indigo-600 rounded-2xl shadow-sm border border-indigo-50">
                                <Clock size={28} strokeWidth={2.5} />
                              </div>
                              <div>
                                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Kitchen ETA</p>
                                <p className="text-xl font-black text-gray-900 tracking-tighter">{order.totalCookingTime || 15} Mins</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Live Status</p>
                              <p className="text-xl font-black text-indigo-600 uppercase tracking-tighter animate-pulse">{order.deliveryStatus || 'Received'}</p>
                            </div>
                          </div>

                          <div className="relative px-4">
                            <div className="absolute top-7 left-8 right-8 h-2.5 bg-gray-100 -z-10 rounded-full" />
                            <div className="absolute top-7 left-8 h-2.5 bg-linear-to-r from-emerald-400 to-teal-500 -z-10 transition-all duration-1000 rounded-full shadow-[0_0_20px_rgba(52,211,153,0.4)]" style={{ width: `calc(${((step - 1) / 2) * 100}% - 12px)` }} />
                            
                            <div className="flex justify-between">
                              {[
                                { id: 1, label: 'Received', icon: Receipt },
                                { id: 2, label: 'Cooking', icon: ChefHat },
                                { id: 3, label: 'Served', icon: CheckCircle2 }
                              ].map((item) => (
                                <div key={item.id} className="flex flex-col items-center gap-4">
                                  <div className={`w-16 h-16 rounded-[1.5rem] flex items-center justify-center transition-all duration-700 ${step >= item.id ? 'bg-linear-to-br from-emerald-400 to-teal-500 text-white shadow-2xl shadow-emerald-100 scale-110' : 'bg-white border border-gray-100 text-gray-300'}`}>
                                    <item.icon size={28} strokeWidth={2.5} className={step === item.id ? 'animate-bounce' : ''} />
                                  </div>
                                  <span className={`text-[10px] font-black uppercase tracking-widest ${step >= item.id ? 'text-emerald-600' : 'text-gray-400'}`}>{item.label}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        <div className="flex justify-between items-center border-t border-gray-100 pt-8">
                          <div className="flex flex-col">
                            <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none mb-2">Investment</span>
                            <span className="text-3xl font-black text-gray-900 tracking-tighter leading-none">₹{order.totalAmount?.toLocaleString()}</span>
                          </div>
                          <div className="px-5 py-3 bg-indigo-50 rounded-2xl border border-indigo-100 text-indigo-700 text-xs font-black uppercase tracking-widest">
                            Table {order.tableNumber}
                          </div>
                        </div>
                      </div>
                    </Card>
                  );
                })}
              </div>
            </div>
          )}

          {/* Past Orders Section */}
          {pastOrders.length > 0 && (
            <div className="space-y-6">
              <div className="flex items-center gap-3 ml-2">
                <History size={16} className="text-gray-400" />
                <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Order History</h2>
                <div className="h-[1px] flex-1 ml-4 bg-gray-100" />
              </div>
              <div className="space-y-4">
                {pastOrders.map(order => (
                  <Card key={order.id} className="border border-gray-100 shadow-sm hover:shadow-md transition-all duration-300 rounded-3xl" padding="p-6">
                    <div className="flex justify-between items-center mb-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-gray-50 text-indigo-600 rounded-xl flex items-center justify-center font-black text-[10px] border border-gray-100">
                          {order.tableNumber}
                        </div>
                        <div>
                          <p className="text-xs font-black text-gray-900 tracking-tight">{order.invoiceNumber}</p>
                          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
                            {order.date?.toDate ? format(order.date.toDate(), 'dd MMM, HH:mm') : 'N/A'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-emerald-600 tracking-tight">₹{order.totalAmount?.toLocaleString()}</p>
                        <span className="text-[9px] font-black uppercase tracking-widest text-emerald-500/70">Completed</span>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-wrap">
                      {order.items?.map((item, idx) => (
                        <span key={idx} className="px-3 py-1 bg-gray-50 text-[10px] font-bold text-gray-500 rounded-full border border-gray-100">
                          {item.name} ×{item.quantity}
                        </span>
                      ))}
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
