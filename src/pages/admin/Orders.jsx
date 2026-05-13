import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase/firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, getDoc } from 'firebase/firestore';
import { FileText, Calendar, IndianRupee, ExternalLink, Hash, ShoppingBag, CheckCircle2, Search, Filter, ChefHat, Sparkles, TrendingUp, Clock, AlertCircle } from 'lucide-react';
import Card from '../../components/Card';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import { format, isToday, isYesterday } from 'date-fns';
import { toast } from 'react-hot-toast';
import { playSound } from '../../utils/audio';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('pending');
  const [dateFilter, setDateFilter] = useState('all');
  const [stats, setStats] = useState({
    todaySales: 0,
    pendingOrders: 0,
    todayCount: 0
  });
  const [currentSound, setCurrentSound] = useState('bell');

  const [isKitchenActive, setIsKitchenActive] = useState(false);
  const blinkRef = useRef(null);
  const timeoutRef = useRef(null);

  const prevOrdersCount = useRef(0);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'config'));
        if (docSnap.exists()) {
          setCurrentSound(docSnap.data().notificationSound || 'bell');
        }
      } catch (err) {
        console.error("Error fetching sound settings:", err);
      }
    };
    fetchSettings();
  }, []);

  const startKitchenSession = () => {
    playSound(currentSound);
    setIsKitchenActive(true);
    toast.success('Command Center Online', { 
      icon: '🧑‍🍳',
      style: { borderRadius: '1rem', background: '#333', color: '#fff' }
    });
  };

  useEffect(() => {
    const q = query(collection(db, 'bills'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(newOrders);
      setLoading(false);
      
      const today = newOrders.filter(o => o.date?.toDate && isToday(o.date.toDate()));
      setStats({
        todaySales: today.reduce((acc, o) => acc + (o.totalAmount || 0), 0),
        pendingOrders: newOrders.filter(o => o.status === 'pending').length,
        todayCount: today.length
      });
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Sound Trigger Logic:
    // Trigger if count increased (new order arrived)
    if (!isKitchenActive || orders.length <= prevOrdersCount.current) {
      prevOrdersCount.current = orders.length;
      return;
    }

    const latest = orders[0];
    playSound(currentSound);

    if (blinkRef.current) clearInterval(blinkRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const originalTitle = document.title;
    let toggle = true;
    blinkRef.current = setInterval(() => {
      document.title = toggle ? '🚨 INCOMING ORDER 🚨' : originalTitle;
      toggle = !toggle;
    }, 1000);

    timeoutRef.current = setTimeout(() => {
      clearInterval(blinkRef.current);
      document.title = originalTitle;
      blinkRef.current = null;
    }, 10000);

    toast.custom((t) => (
      <div className={`${t.visible ? 'animate-in slide-in-from-top-full duration-500' : 'animate-out fade-out duration-300'} max-w-md w-full bg-slate-900 shadow-[0_30px_60px_rgba(0,0,0,0.4)] rounded-[2rem] pointer-events-auto flex ring-1 ring-white/10 p-5 border border-indigo-500/50`}>
        <div className="flex-1 w-0">
          <div className="flex items-start">
            <div className="flex-shrink-0">
              <div className="h-14 w-14 rounded-2xl bg-linear-to-br from-indigo-500 to-violet-600 flex items-center justify-center text-white shadow-lg shadow-indigo-500/30 animate-pulse">
                <ChefHat size={28} strokeWidth={2.5} />
              </div>
            </div>
            <div className="ml-5 flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.2em]">New Order</p>
              </div>
              <p className="text-2xl font-black text-white tracking-tighter uppercase leading-none">Table {latest.tableNumber}</p>
              <p className="mt-2 text-[10px] font-black text-slate-500 uppercase tracking-widest">Inv: {latest.invoiceNumber}</p>
            </div>
          </div>
        </div>
        <div className="flex border-l border-white/5 ml-4 pl-4 items-center">
          <button
            onClick={() => {
              toast.dismiss(t.id);
              openOrderDetails(latest);
            }}
            className="px-6 py-3 bg-white/5 hover:bg-white/10 rounded-xl text-xs font-black text-white transition-all uppercase tracking-widest active:scale-95"
          >
            Review
          </button>
        </div>
      </div>
    ), { duration: 15000, position: 'top-center' });

    prevOrdersCount.current = orders.length;

    return () => {
      if (blinkRef.current) clearInterval(blinkRef.current);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    };
  }, [orders.length, isKitchenActive, currentSound]);

  const openOrderDetails = (order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const updateOrderStatus = async (id, newStatus) => {
    try {
      const updates = { status: newStatus };
      if (newStatus === 'paid') {
        updates.deliveryStatus = 'Served';
      }
      await updateDoc(doc(db, 'bills', id), updates);
      toast.success(`Order settled as ${newStatus}`);
      setIsModalOpen(false);
    } catch (error) {
      toast.error('Sync failed');
    }
  };

  const updateDeliveryStatus = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, 'bills', id), { deliveryStatus: newStatus });
      toast.success(`Order ${newStatus}`);
      setSelectedOrder(prev => ({ ...prev, deliveryStatus: newStatus }));
    } catch (error) {
      toast.error('Status sync failed');
    }
  };

  const filteredOrders = orders.filter(order => {
    const searchLower = searchTerm.toLowerCase();
    const invoiceMatch = order.invoiceNumber?.toLowerCase().includes(searchLower);
    const tableMatch = String(order.tableNumber || '').toLowerCase().includes(searchLower);
    
    const matchesSearch = invoiceMatch || tableMatch;
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter;
    
    let matchesDate = true;
    if (dateFilter === 'today') {
      matchesDate = order.date?.toDate && isToday(order.date.toDate());
    } else if (dateFilter === 'yesterday') {
      matchesDate = order.date?.toDate && isYesterday(order.date.toDate());
    }

    return matchesSearch && matchesStatus && matchesDate;
  });

  const getDeliveryStatusColor = (status) => {
    switch (status) {
      case 'Preparing': return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'Served': return 'bg-emerald-100 text-emerald-700 border-emerald-200';
      default: return 'bg-gray-100 text-gray-700 border-gray-200';
    }
  };

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-20">
      <header className="flex flex-col lg:flex-row lg:items-end justify-between gap-8">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${isKitchenActive ? 'bg-green-500 animate-pulse' : 'bg-gray-300'}`} />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
              {isKitchenActive ? 'Session Active' : 'Session Offline'}
            </span>
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase leading-none">Command Center</h1>
          <p className="text-gray-500 mt-2 font-medium">Real-time management of your restaurant's culinary flow.</p>
        </div>
        <div className="flex flex-wrap items-center gap-4">
          <button 
            onClick={startKitchenSession}
            disabled={isKitchenActive}
            className={`px-6 py-4 rounded-2xl border transition-all flex items-center gap-3 group active:scale-95 shadow-sm font-black text-xs uppercase tracking-widest ${
              isKitchenActive 
                ? 'bg-emerald-50 border-emerald-200 text-emerald-600' 
                : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50'
            }`}
          >
            <ChefHat size={20} className={isKitchenActive ? 'animate-bounce' : 'group-hover:rotate-12 transition-transform'} />
            {isKitchenActive ? 'Active Alerts' : 'Start Kitchen Alerts'}
          </button>
          <div className="bg-linear-to-r from-indigo-600 to-violet-700 text-white px-6 py-4 rounded-2xl shadow-xl shadow-indigo-600/20 flex items-center gap-4">
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <TrendingUp size={22} />
            </div>
            <div>
              <p className="text-[9px] opacity-60 font-black uppercase tracking-widest leading-none mb-1">Today's Revenue</p>
              <p className="text-xl font-black tracking-tight">₹{stats.todaySales.toLocaleString()}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-[2rem] animate-shimmer" />
          ))
        ) : (
          <>
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex items-center gap-5 hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)] transition-all group">
              <div className="w-14 h-14 bg-amber-50 text-amber-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <AlertCircle size={28} />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Active Orders</p>
                <p className="text-3xl font-black text-gray-900 tracking-tighter">{stats.pendingOrders}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100/50 shadow-[0_8px_30px_rgb(0,0,0,0.02)] flex items-center gap-5 hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)] transition-all group">
              <div className="w-14 h-14 bg-emerald-50 text-emerald-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <CheckCircle2 size={28} />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Total Served</p>
                <p className="text-3xl font-black text-gray-900 tracking-tighter">{stats.todayCount}</p>
              </div>
            </div>
            <div className="bg-white p-6 rounded-[2rem] border border-gray-100/50 shadow-[0_8px_30_rgb(0,0,0,0.02)] flex items-center gap-5 hover:shadow-[0_20px_40px_rgb(0,0,0,0.06)] transition-all group">
              <div className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl flex items-center justify-center group-hover:scale-110 transition-transform">
                <ShoppingBag size={28} />
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mb-1">Conversion</p>
                <p className="text-3xl font-black text-gray-900 tracking-tighter">
                  {orders.length > 0 ? Math.round((orders.filter(o => o.status === 'paid').length / orders.length) * 100) : 0}%
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Control Bar */}
      <Card className="flex flex-col md:flex-row gap-6 p-6 border-none shadow-[0_20px_50px_rgba(0,0,0,0.03)] rounded-[2.5rem]" padding="p-6">
        <div className="relative flex-1 group">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-600 transition-colors" size={20} strokeWidth={2.5} />
          <input
            type="text"
            placeholder="Search by Invoice ID or Table Number..."
            className="w-full pl-12 pr-6 py-4 bg-gray-50/50 border border-transparent rounded-[1.5rem] focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-50 outline-none transition-all text-sm font-medium"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-4">
          <div className="flex items-center gap-3 px-5 py-4 bg-gray-50/50 rounded-[1.5rem] border border-transparent focus-within:bg-white focus-within:border-indigo-100 transition-all">
            <Filter size={18} className="text-gray-400" />
            <select 
              className="bg-transparent border-none outline-none text-xs font-black text-gray-700 cursor-pointer uppercase tracking-widest"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="pending">Active Live</option>
              <option value="paid">Settled</option>
              <option value="all">Full Log</option>
            </select>
          </div>

          <div className="flex items-center gap-3 px-5 py-4 bg-gray-50/50 rounded-[1.5rem] border border-transparent focus-within:bg-white focus-within:border-indigo-100 transition-all">
            <Calendar size={18} className="text-gray-400" />
            <select 
              className="bg-transparent border-none outline-none text-xs font-black text-gray-700 cursor-pointer uppercase tracking-widest"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="all">Timeline: All</option>
              <option value="today">Today Only</option>
              <option value="yesterday">Yesterday</option>
            </select>
          </div>
        </div>
      </Card>

      <div className="overflow-x-auto pb-4">
        <table className="w-full border-separate border-spacing-y-4 min-w-[800px]">
          <thead>
            <tr className="text-left text-gray-400 text-[10px] font-black uppercase tracking-[0.2em]">
              <th className="px-8 py-2">Invoice Details</th>
              <th className="px-8 py-2">Location</th>
              <th className="px-8 py-2">Culinary Status</th>
              <th className="px-8 py-2">Investment</th>
              <th className="px-8 py-2">Settle State</th>
              <th className="px-8 py-2 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={6} className="bg-gray-100 h-20 rounded-[2rem] mb-4"></td>
                </tr>
              ))
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-20 glass rounded-[2.5rem] border-dashed border-2 border-gray-100 text-gray-400 font-bold uppercase tracking-widest text-xs">Zero results found in the database</td>
              </tr>
            ) : (
              filteredOrders.map((order, index) => (
                <tr 
                  key={order.id} 
                  className="bg-white border border-gray-100 rounded-[2rem] shadow-sm hover:shadow-xl hover:shadow-gray-100 transition-all duration-500 group animate-in fade-in slide-in-from-left-4 fill-mode-both"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <td className="px-8 py-6 rounded-l-[2rem]">
                    <div className="flex items-center gap-4">
                      <div className="w-12 h-12 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center group-hover:scale-110 transition-transform">
                        <FileText size={20} strokeWidth={2.5} />
                      </div>
                      <div>
                        <span className="font-black text-gray-900 group-hover:text-indigo-600 transition-colors tracking-tight">{order.invoiceNumber}</span>
                        <div className="flex items-center gap-1.5 mt-0.5 text-gray-400">
                          <Clock size={10} />
                          <span className="text-[10px] font-bold">
                            {order.date?.toDate ? format(order.date.toDate(), 'HH:mm') : 'N/A'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-gray-50 rounded-lg flex items-center justify-center text-indigo-600 border border-gray-100 font-black text-xs">
                        {order.tableNumber || '?'}
                      </div>
                      <span className="text-xs font-black text-gray-500 uppercase tracking-widest">Table Unit</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border inline-flex items-center gap-2 ${getDeliveryStatusColor(order.deliveryStatus)}`}>
                      <div className={`w-1.5 h-1.5 rounded-full bg-current ${order.deliveryStatus === 'Preparing' ? 'animate-pulse' : ''}`} />
                      {order.deliveryStatus || 'Received'}
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <div className="flex flex-col">
                      <span className="font-black text-lg text-gray-900 tracking-tighter">₹{order.totalAmount?.toLocaleString()}</span>
                      <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest">Gross Total</span>
                    </div>
                  </td>
                  <td className="px-8 py-6">
                    <span className={`px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                      order.status === 'paid' 
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100' 
                        : 'bg-amber-50 text-amber-700 border border-amber-100'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-8 py-6 rounded-r-[2rem] text-right">
                    <button 
                      onClick={() => openOrderDetails(order)}
                      className="w-10 h-10 bg-gray-50 hover:bg-indigo-600 hover:text-white rounded-xl flex items-center justify-center text-gray-400 transition-all active:scale-90"
                    >
                      <ExternalLink size={18} strokeWidth={2.5} />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Order Details Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={`Review Order: ${selectedOrder?.invoiceNumber}`}
        footer={
          <div className="flex gap-4 w-full">
            {selectedOrder?.status !== 'paid' && (
              <Button 
                onClick={() => updateOrderStatus(selectedOrder.id, 'paid')}
                className="flex-2 bg-emerald-500 hover:bg-emerald-600 shadow-lg shadow-emerald-100 rounded-2xl py-4"
              >
                Confirm Payment & Serve
              </Button>
            )}
            <Button variant="secondary" onClick={() => setIsModalOpen(false)} className="flex-1 rounded-2xl py-4">
              Back to Center
            </Button>
          </div>
        }
      >
        {selectedOrder && (
          <div className="space-y-8 py-2">
            <div className="flex justify-between items-center p-6 bg-linear-to-br from-indigo-50/50 to-violet-50/50 rounded-[2rem] border border-indigo-100/50">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 bg-white rounded-2xl shadow-sm flex items-center justify-center text-indigo-600 border border-indigo-50">
                  <Hash size={24} strokeWidth={3} />
                </div>
                <div>
                  <p className="text-[10px] text-indigo-400 font-black uppercase tracking-widest leading-none mb-1">Target Station</p>
                  <p className="text-2xl font-black text-gray-900 tracking-tighter">TABLE {selectedOrder.tableNumber}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1">Sync Time</p>
                <p className="text-sm font-black text-gray-900">
                  {selectedOrder.date?.toDate ? format(selectedOrder.date.toDate(), 'HH:mm, dd MMM') : 'N/A'}
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                <ChefHat size={14} className="text-indigo-600" />
                Workflow Progression
              </h4>
              <div className="grid grid-cols-3 gap-3">
                {['Received', 'Preparing', 'Served'].map((status) => (
                  <button
                    key={status}
                    onClick={() => updateDeliveryStatus(selectedOrder.id, status)}
                    className={`py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                      (selectedOrder.deliveryStatus || 'Received') === status
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-xl shadow-indigo-100'
                        : 'bg-gray-50 text-gray-500 border-transparent hover:bg-white hover:border-indigo-100'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {selectedOrder.notes && (
              <div className="p-5 bg-amber-50/50 border border-amber-100 rounded-[1.5rem] relative overflow-hidden">
                <div className="absolute top-0 right-0 p-4 text-amber-100 opacity-20">
                  <AlertCircle size={60} />
                </div>
                <div className="relative z-10">
                  <p className="text-[9px] text-amber-600 font-black uppercase tracking-widest mb-1 flex items-center gap-2">
                    <Sparkles size={10} />
                    Guest Customization
                  </p>
                  <p className="text-sm font-bold text-amber-900 italic">"{selectedOrder.notes}"</p>
                </div>
              </div>
            )}

            <div className="space-y-4">
              <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest flex items-center gap-2 ml-1">
                <ShoppingBag size={14} className="text-indigo-600" />
                Culinary Portfolio
              </h4>
              <div className="space-y-3">
                {selectedOrder.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-5 bg-white border border-gray-100 rounded-2xl hover:shadow-lg hover:shadow-gray-50 transition-all duration-300">
                    <div className="flex items-center gap-4">
                      <div className="w-10 h-10 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-xl font-black text-sm border border-indigo-100">
                        {item.quantity}
                      </div>
                      <span className="font-black text-gray-900 tracking-tight uppercase text-xs">{item.name}</span>
                    </div>
                    <span className="font-black text-gray-900 tracking-tighter">₹{(item.price * item.quantity).toLocaleString()}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-gray-100 space-y-3">
              <div className="flex justify-between text-gray-400 text-[10px] font-black uppercase tracking-widest px-2">
                <span>Subtotal Assets</span>
                <span>₹{selectedOrder.subtotal?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-gray-400 text-[10px] font-black uppercase tracking-widest px-2">
                <span>Tax Contributions</span>
                <span>₹{(selectedOrder.cgst + selectedOrder.sgst)?.toLocaleString()}</span>
              </div>
              <div className="flex justify-between items-center p-6 bg-gray-900 text-white rounded-[2rem] shadow-2xl shadow-gray-200 mt-4">
                <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-50">Final Valuation</span>
                <span className="text-3xl font-black tracking-tighter">₹{selectedOrder.totalAmount?.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Orders;
