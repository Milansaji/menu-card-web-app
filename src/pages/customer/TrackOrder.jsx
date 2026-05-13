import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/firebase';
import { doc, onSnapshot, updateDoc } from 'firebase/firestore';
import { useNavigate, Link } from 'react-router-dom';
import { useCart } from '../../contexts/CartContext';
import { ArrowLeft, Clock, CheckCircle2, ShoppingBag, Receipt, MapPin, Hash, ChefHat } from 'lucide-react';
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

    // Listener for all orders in local storage
    const unsubscribes = orderIds.map(id => 
      onSnapshot(doc(db, 'bills', id), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          // Only show if it matches current table AND is NOT paid
          if ((!tableNumber || String(data.tableNumber) === String(tableNumber)) && data.status !== 'paid') {
            setOrders(prev => {
              const otherOrders = prev.filter(o => o.id !== id);
              return [...otherOrders, { id: snapshot.id, ...data }]
                .sort((a, b) => (b.date?.seconds || 0) - (a.date?.seconds || 0));
            });
          } else {
            // Remove from state if it was there and now it's paid or table mismatch
            setOrders(prev => prev.filter(o => o.id !== id));
          }
        }
      })
    );

    setLoading(false);
    return () => unsubscribes.forEach(unsub => unsub());
  }, [tableNumber]);

  // Auto-status transition logic
  useEffect(() => {
    if (orders.length === 0) return;

    const timer = setInterval(() => {
      orders.forEach(async (order) => {
        if (order.status === 'paid') return; // Don't auto-update if already paid
        
        const now = new Date();
        const placedAt = order.date?.toDate();
        if (!placedAt) return;

        const secondsElapsed = (now - placedAt) / 1000;
        const totalMinutes = order.totalCookingTime || 15;
        
        let targetStatus = order.deliveryStatus || 'Received';

        // Logic:
        // 0-1 min: Received
        // 1 min to totalMinutes: Preparing
        // After totalMinutes: Served
        
        if (secondsElapsed > totalMinutes * 60) {
          targetStatus = 'Served';
        } else if (secondsElapsed > 60) { // After 1 minute, move to preparing
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
    }, 5000); // Check every 5 seconds

    return () => clearInterval(timer);
  }, [orders]);

  const getStatusStep = (status) => {
    switch (status) {
      case 'Preparing': return 2;
      case 'Served': return 3;
      default: return 1; // Received
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-gray-100 rounded animate-pulse" />
        <div className="space-y-4">
          {[1, 2].map(i => <div key={i} className="h-48 bg-gray-100 rounded-3xl animate-pulse" />)}
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-in slide-in-from-right-4 duration-500 pb-24">
      <header className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-black tracking-tight">Order Status</h1>
      </header>

      {orders.length === 0 ? (
        <div className="text-center py-20 space-y-4">
          <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
            <ShoppingBag size={40} />
          </div>
          <h2 className="text-xl font-bold text-gray-900">No active orders</h2>
          <p className="text-gray-500 text-sm">You haven't placed any orders from this device yet.</p>
          <Link to="/menu/main" className="inline-block pt-4">
            <Button>Back to Menu</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-6">
          {orders.map(order => {
            const step = getStatusStep(order.deliveryStatus);
            return (
              <Card key={order.id} className="overflow-hidden border-none shadow-lg shadow-gray-100" padding="p-0">
                <div className="p-4 bg-indigo-600 text-white flex justify-between items-center">
                  <div className="flex items-center gap-2">
                    <Hash size={18} />
                    <span className="font-black">#{order.invoiceNumber}</span>
                  </div>
                  <div className="flex items-center gap-2 bg-white/20 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider">
                    <Clock size={14} />
                    {order.status}
                  </div>
                </div>

                <div className="p-6 space-y-8">
                  {/* Visual Status Tracker */}
                  <div className="space-y-6">
                    <div className="flex justify-between items-center bg-gray-50 p-4 rounded-2xl">
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-indigo-100 text-indigo-600 rounded-xl">
                          <Clock size={20} />
                        </div>
                        <div>
                          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Est. Preparation</p>
                          <p className="text-sm font-black text-gray-900">{order.totalCookingTime || 15} Minutes</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Stage</p>
                        <p className="text-sm font-black text-indigo-600">{order.deliveryStatus || 'Received'}</p>
                      </div>
                    </div>

                    <div className="relative pt-2">
                      <div className="absolute top-6 left-0 right-0 h-1.5 bg-gray-100 -z-10 rounded-full" />
                      <div className={`absolute top-6 left-0 h-1.5 bg-green-500 -z-10 transition-all duration-1000 rounded-full`} style={{ width: `${((step - 1) / 2) * 100}%` }} />
                      
                      <div className="flex justify-between">
                        <div className="flex flex-col items-center gap-2">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${step >= 1 ? 'bg-green-500 text-white shadow-lg shadow-green-100 scale-110' : 'bg-white border-2 border-gray-100 text-gray-300'}`}>
                            <Receipt size={18} />
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-tighter ${step >= 1 ? 'text-green-600' : 'text-gray-400'}`}>Received</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${step >= 2 ? 'bg-green-500 text-white shadow-lg shadow-green-100 scale-110' : 'bg-white border-2 border-gray-100 text-gray-300'}`}>
                            <ChefHat size={18} />
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-tighter ${step >= 2 ? 'text-green-600' : 'text-gray-400'}`}>Preparing</span>
                        </div>
                        <div className="flex flex-col items-center gap-2">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${step >= 3 ? 'bg-green-500 text-white shadow-lg shadow-green-100 scale-110' : 'bg-white border-2 border-gray-100 text-gray-300'}`}>
                            <CheckCircle2 size={18} />
                          </div>
                          <span className={`text-[10px] font-black uppercase tracking-tighter ${step >= 3 ? 'text-green-600' : 'text-gray-400'}`}>Served</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="flex justify-between items-end border-b border-gray-50 pb-4">
                    <div>
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Table Number</p>
                      <p className="text-lg font-black text-gray-900">Table {order.tableNumber}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Total Amount</p>
                      <p className="text-lg font-black text-indigo-600">₹{order.totalAmount?.toFixed(2)}</p>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest">Items Detail</h4>
                    <div className="space-y-2">
                      {order.items?.map((item, i) => (
                        <div key={i} className="flex justify-between text-sm">
                          <span className="text-gray-700 font-medium">{item.name} <span className="text-gray-400">x{item.quantity}</span></span>
                          <span className="font-bold text-gray-900">₹{(item.price * item.quantity).toFixed(2)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {order.notes && (
                    <div className="p-3 bg-gray-50 rounded-xl text-xs text-gray-500 italic border-l-4 border-indigo-200">
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
