import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { ArrowLeft, Clock, CheckCircle2, ShoppingBag, Receipt, MapPin, Hash, ChefHat, Sparkles } from 'lucide-react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { format } from 'date-fns';

const TrackOrder = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const { tableNumber } = useCart();
  const navigate = useNavigate();

  useEffect(() => {
    const orderIds = JSON.parse(localStorage.getItem('myOrders') || '[]');
    
    if (orderIds.length === 0) {
      setLoading(false);
      return;
    }

    const unsubscribes = orderIds.map(id => 
      onSnapshot(doc(db, 'bills', id), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if ((!tableNumber || String(data.tableNumber) === String(tableNumber)) && data.status !== 'paid') {
            setOrders(prev => {
              const otherOrders = prev.filter(o => o.id !== id);
              return [...otherOrders, { id: snapshot.id, ...data }]
                .sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
            });
          } else {
            setOrders(prev => prev.filter(o => o.id !== id));
          }
        }
      })
    );

    setLoading(false);
    return () => unsubscribes.forEach(unsub => unsub());
  }, [tableNumber]);

  useEffect(() => {
    if (orders.length === 0) return;

    const timer = setInterval(() => {
      orders.forEach(async (order) => {
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
    }, 5000);

    return () => clearInterval(timer);
  }, [orders]);

  const getStatusStep = (status) => {
    switch (status) {
      case 'Preparing': return 2;
      case 'Served': return 3;
      default: return 1;
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-8 max-w-2xl mx-auto">
        <div className="h-10 w-48 bg-gray-100 rounded-2xl animate-shimmer" />
        <div className="space-y-6">
          {[1, 2].map(i => <div key={i} className="h-64 bg-gray-100 rounded-[2.5rem] animate-shimmer" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 animate-in slide-in-from-right-8 duration-700 pb-32 max-w-2xl mx-auto">
      <header className="flex items-center gap-5">
        <button onClick={() => navigate(-1)} className="p-3 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md active:scale-90 transition-all">
          <ArrowLeft size={24} className="text-gray-900" />
        </button>
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-gray-900 uppercase leading-none">Order Status</h1>
          <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Real-time updates</p>
        </div>
      </header>

      {orders.length === 0 ? (
        <div className="text-center py-32 space-y-8 glass rounded-[3rem] border-dashed border-2 border-gray-100 mx-auto max-w-sm">
          <div className="relative w-28 h-28 mx-auto">
            <div className="absolute inset-0 bg-amber-100 rounded-full animate-ping opacity-20" />
            <div className="relative w-28 h-28 bg-linear-to-br from-amber-50 to-amber-100 rounded-full flex items-center justify-center text-amber-500 shadow-inner">
              <ShoppingBag size={56} strokeWidth={1.5} />
            </div>
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">No active orders</h2>
            <p className="text-gray-500 text-sm font-medium px-8">Your cravings haven't turned into orders yet. Let's change that!</p>
          </div>
          <Link to="/menu/main" className="inline-block">
            <Button variant="primary" className="px-10 py-4 shadow-xl shadow-indigo-100">
              Browse the Menu
            </Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-8">
          {orders.map(order => {
            const step = getStatusStep(order.deliveryStatus);
            return (
              <Card key={order.id} className="overflow-hidden border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] hover:shadow-[0_30px_60px_rgba(0,0,0,0.08)] transition-all duration-700 rounded-[2.5rem]" padding="p-0">
                <div className="p-5 bg-linear-to-r from-indigo-600 to-violet-700 text-white flex justify-between items-center">
                  <div className="flex items-center gap-3">
                    <div className="bg-white/20 p-2 rounded-xl">
                      <Hash size={18} strokeWidth={3} />
                    </div>
                    <span className="font-black text-lg tracking-tighter">{order.invoiceNumber}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/20 backdrop-blur-md px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest border border-white/10">
                    <Sparkles size={14} className="text-amber-400" />
                    {order.status}
                  </div>
                </div>

                <div className="p-8 space-y-10">
                  {/* Visual Status Tracker */}
                  <div className="space-y-8">
                    <div className="flex justify-between items-center bg-gray-50/50 p-5 rounded-3xl border border-gray-100">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl shadow-inner">
                          <Clock size={24} strokeWidth={2.5} />
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-0.5">Est. Time</p>
                          <p className="text-lg font-black text-gray-900">{order.totalCookingTime || 15} Minutes</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-0.5">Current Stage</p>
                        <p className="text-lg font-black text-indigo-600 uppercase tracking-tighter">{order.deliveryStatus || 'Received'}</p>
                      </div>
                    </div>

                    <div className="relative px-2">
                      <div className="absolute top-6 left-6 right-6 h-2 bg-gray-100 -z-10 rounded-full" />
                      <div className="absolute top-6 left-6 h-2 bg-linear-to-r from-green-400 to-emerald-600 -z-10 transition-all duration-1000 rounded-full shadow-[0_0_10px_rgba(52,211,153,0.5)]" style={{ width: `calc(${((step - 1) / 2) * 100}% - 12px)` }} />
                      
                      <div className="flex justify-between">
                        {[
                          { id: 1, label: 'Received', icon: Receipt },
                          { id: 2, label: 'Preparing', icon: ChefHat },
                          { id: 3, label: 'Served', icon: CheckCircle2 }
                        ].map((item) => (
                          <div key={item.id} className="flex flex-col items-center gap-3">
                            <div className={`w-14 h-14 rounded-[1.25rem] flex items-center justify-center transition-all duration-700 ${step >= item.id ? 'bg-linear-to-br from-green-400 to-emerald-600 text-white shadow-xl shadow-emerald-100 scale-110' : 'bg-white border-2 border-gray-50 text-gray-300'}`}>
                              <item.icon size={26} strokeWidth={2.5} className={step === item.id ? 'animate-pulse' : ''} />
                            </div>
                            <span className={`text-[10px] font-black uppercase tracking-widest ${step >= item.id ? 'text-emerald-600' : 'text-gray-400'}`}>{item.label}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-end border-b border-gray-100 pb-6">
                    <div>
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1.5">Your Table</p>
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-black text-xs border border-indigo-100">
                          <Hash size={12} strokeWidth={3} />
                        </div>
                        <p className="text-xl font-black text-gray-900 tracking-tighter">Table {order.tableNumber}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1.5">Total Bill</p>
                      <p className="text-2xl font-black text-transparent bg-clip-text bg-linear-to-r from-indigo-600 to-violet-700 tracking-tighter">₹{order.totalAmount?.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Order Details</h4>
                      <div className="h-[1px] flex-1 ml-4 bg-gray-50" />
                    </div>
                    <div className="space-y-3">
                      {order.items?.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm group/item">
                          <span className="text-gray-600 font-semibold group-hover:text-gray-900 transition-colors">
                            {item.name} <span className="text-gray-300 font-black ml-1 uppercase text-[10px]">x{item.quantity}</span>
                          </span>
                          <span className="font-black text-gray-900 tracking-tight">₹{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {order.notes && (
                    <div className="relative p-5 bg-indigo-50/50 rounded-3xl text-sm text-indigo-900/70 font-medium italic border-l-4 border-indigo-400 overflow-hidden">
                      <div className="absolute top-0 right-0 p-2 opacity-10">
                        <Sparkles size={40} />
                      </div>
                      "{order.notes}"
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default TrackOrder;
