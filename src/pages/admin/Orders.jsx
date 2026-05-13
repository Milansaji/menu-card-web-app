import React, { useState, useEffect, useRef } from 'react';
import { db } from '../../firebase/firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc, getDoc } from 'firebase/firestore';
import { FileText, Calendar, IndianRupee, ExternalLink, Hash, ShoppingBag, CheckCircle2, Search, Filter, ChefHat } from 'lucide-react';
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

  // Fetch sound settings
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

  // Kitchen Session Trigger (satisfies audio policy)
  const startKitchenSession = () => {
    playSound(currentSound);
    setIsKitchenActive(true);
    toast.success('Kitchen alerts activated!', { icon: '🧑‍🍳' });
  };

  // Main real-time listener
  useEffect(() => {
    const q = query(collection(db, 'bills'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const newOrders = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setOrders(newOrders);
      setLoading(false);
      
      // Update Stats
      const today = newOrders.filter(o => o.date?.toDate && isToday(o.date.toDate()));
      setStats({
        todaySales: today.reduce((acc, o) => acc + (o.totalAmount || 0), 0),
        pendingOrders: newOrders.filter(o => o.status === 'pending').length,
        todayCount: today.length
      });
    });
    return () => unsubscribe();
  }, []);

  // Robust Notification Handler
  useEffect(() => {
    if (!isKitchenActive || orders.length <= prevOrdersCount.current || prevOrdersCount.current === 0) {
      prevOrdersCount.current = orders.length;
      return;
    }

    const latest = orders[0];
    playSound(currentSound);

    // Controlled Title Blink with Cleanup
    if (blinkRef.current) clearInterval(blinkRef.current);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);

    const originalTitle = document.title;
    let toggle = true;
    blinkRef.current = setInterval(() => {
      document.title = toggle ? '🚨 NEW ORDER! 🚨' : originalTitle;
      toggle = !toggle;
    }, 1000);

    timeoutRef.current = setTimeout(() => {
      clearInterval(blinkRef.current);
      document.title = originalTitle;
      blinkRef.current = null;
    }, 10000);

    // Custom Toast
    toast.custom((t) => (
      <div className={`${t.visible ? 'animate-in slide-in-from-top-full' : 'animate-out fade-out'} max-w-md w-full bg-slate-900 shadow-2xl rounded-3xl pointer-events-auto flex ring-1 ring-black ring-opacity-5 p-4 border-2 border-indigo-500`}>
        <div className="flex-1 w-0 p-1">
          <div className="flex items-start">
            <div className="flex-shrink-0 pt-0.5">
              <div className="h-12 w-12 rounded-2xl bg-indigo-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/50">
                <ChefHat size={24} />
              </div>
            </div>
            <div className="ml-4 flex-1">
              <p className="text-xs font-black text-indigo-400 uppercase tracking-[0.2em] mb-1">New Order Incoming</p>
              <p className="text-xl font-black text-white">Table {latest.tableNumber}</p>
              <p className="mt-1 text-sm font-bold text-slate-400">Order ID: #{latest.invoiceNumber}</p>
            </div>
          </div>
        </div>
        <div className="flex border-l border-slate-800 ml-4 pl-4">
          <button
            onClick={() => {
              toast.dismiss(t.id);
              openOrderDetails(latest);
            }}
            className="w-full border border-transparent rounded-none rounded-r-lg flex items-center justify-center text-sm font-black text-indigo-400 hover:text-indigo-300 focus:outline-none"
          >
            VIEW
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
      toast.success(`Order marked as ${newStatus}`);
      setIsModalOpen(false);
    } catch (error) {
      toast.error('Failed to update status');
    }
  };

  const updateDeliveryStatus = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, 'bills', id), { deliveryStatus: newStatus });
      toast.success(`Status updated to ${newStatus}`);
      setSelectedOrder(prev => ({ ...prev, deliveryStatus: newStatus }));
    } catch (error) {
      toast.error('Failed to update delivery status');
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
      case 'Preparing': return 'bg-orange-100 text-orange-600';
      case 'Served': return 'bg-blue-100 text-blue-600';
      default: return 'bg-gray-100 text-gray-600';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight">Order Command Center</h1>
          <p className="text-gray-500 mt-1">Real-time monitoring of kitchen and payments.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={startKitchenSession}
            disabled={isKitchenActive}
            className={`p-3 rounded-2xl border transition-all flex items-center gap-2 group active:scale-95 ${
              isKitchenActive 
                ? 'bg-green-50 border-green-200 text-green-600' 
                : 'bg-white border-gray-100 text-gray-600 hover:bg-gray-50 shadow-sm'
            }`}
          >
            <ChefHat size={20} className={isKitchenActive ? 'animate-bounce' : 'group-hover:rotate-12 transition-transform'} />
            <span className="text-xs font-bold whitespace-nowrap">
              {isKitchenActive ? 'Kitchen Session Active' : 'Start Kitchen Session'}
            </span>
          </button>
          <div className="bg-indigo-600 text-white p-3 rounded-2xl shadow-lg shadow-indigo-100 flex items-center gap-3">
            <IndianRupee size={24} />
            <div>
              <p className="text-[10px] opacity-70 font-black uppercase tracking-wider leading-none">Today's Sales</p>
              <p className="text-xl font-black">₹{stats.todaySales.toFixed(2)}</p>
            </div>
          </div>
        </div>
      </header>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          Array(3).fill(0).map((_, i) => (
            <div key={i} className="h-24 bg-gray-100 rounded-3xl animate-pulse" />
          ))
        ) : (
          <>
            <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-orange-100 text-orange-600 rounded-2xl flex items-center justify-center">
                <ChefHat size={24} />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Active Orders</p>
                <p className="text-2xl font-black text-gray-900">{stats.pendingOrders}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-green-100 text-green-600 rounded-2xl flex items-center justify-center">
                <CheckCircle2 size={24} />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Today's Count</p>
                <p className="text-2xl font-black text-gray-900">{stats.todayCount}</p>
              </div>
            </div>
            <div className="bg-white p-4 rounded-3xl border border-gray-100 shadow-sm flex items-center gap-4">
              <div className="w-12 h-12 bg-indigo-100 text-indigo-600 rounded-2xl flex items-center justify-center">
                <ShoppingBag size={24} />
              </div>
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest">Success Rate</p>
                <p className="text-2xl font-black text-gray-900">
                  {orders.length > 0 ? Math.round((orders.filter(o => o.status === 'paid').length / orders.length) * 100) : 0}%
                </p>
              </div>
            </div>
          </>
        )}
      </div>

      {/* Filters Bar */}
      <Card className="flex flex-col md:flex-row gap-4 p-4 border-none shadow-sm" padding="p-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
          <input
            type="text"
            placeholder="Search Order ID or Table..."
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border-none rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none transition-all text-sm"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="flex gap-2">
          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-transparent focus-within:border-indigo-500">
            <Filter size={16} className="text-gray-400" />
            <select 
              className="bg-transparent border-none outline-none text-sm font-medium text-gray-700 cursor-pointer"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="pending">Active Orders</option>
              <option value="paid">Completed (Paid)</option>
              <option value="all">All History</option>
            </select>
          </div>

          <div className="flex items-center gap-2 px-3 py-2 bg-gray-50 rounded-xl border border-transparent focus-within:border-indigo-500">
            <Calendar size={16} className="text-gray-400" />
            <select 
              className="bg-transparent border-none outline-none text-sm font-medium text-gray-700 cursor-pointer"
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
            >
              <option value="all">All Time</option>
              <option value="today">Today</option>
              <option value="yesterday">Yesterday</option>
            </select>
          </div>
        </div>
      </Card>

      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-y-3">
          <thead>
            <tr className="text-left text-gray-500 text-sm uppercase tracking-wider">
              <th className="px-6 py-3 font-medium">Order ID</th>
              <th className="px-6 py-3 font-medium">Table</th>
              <th className="px-6 py-3 font-medium">Order Status</th>
              <th className="px-6 py-3 font-medium">Amount</th>
              <th className="px-6 py-3 font-medium">Payment</th>
              <th className="px-6 py-3 font-medium text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              Array(5).fill(0).map((_, i) => (
                <tr key={i} className="animate-pulse">
                  <td colSpan={6} className="bg-gray-100 h-16 rounded-2xl mb-4"></td>
                </tr>
              ))
            ) : filteredOrders.length === 0 ? (
              <tr>
                <td colSpan={6} className="text-center py-12 text-gray-400 italic">No orders matching your filters.</td>
              </tr>
            ) : (
              filteredOrders.map((order) => (
                <tr key={order.id} className="bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md transition-shadow group">
                  <td className="px-6 py-4 rounded-l-2xl">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                        <FileText size={18} />
                      </div>
                      <span className="font-bold text-gray-900">{order.invoiceNumber}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2 text-gray-900 font-bold">
                      <Hash size={14} className="text-indigo-500" />
                      {order.tableNumber || 'N/A'}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${getDeliveryStatusColor(order.deliveryStatus)}`}>
                      {order.deliveryStatus || 'Received'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-1 font-bold text-indigo-600">
                      <IndianRupee size={14} />
                      {order.totalAmount?.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      order.status === 'paid' 
                        ? 'bg-green-100 text-green-700' 
                        : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {order.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 rounded-r-2xl text-right">
                    <button 
                      onClick={() => openOrderDetails(order)}
                      className="p-2 text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                    >
                      <ExternalLink size={18} />
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
        title={`Order Details: ${selectedOrder?.invoiceNumber}`}
        footer={
          <div className="flex gap-3 w-full">
            {selectedOrder?.status !== 'paid' && (
              <Button 
                onClick={() => updateOrderStatus(selectedOrder.id, 'paid')}
                className="flex-1 bg-green-600 hover:bg-green-700"
              >
                Mark as Paid
              </Button>
            )}
            <Button variant="outline" onClick={() => setIsModalOpen(false)} className="flex-1">
              Close
            </Button>
          </div>
        }
      >
        {selectedOrder && (
          <div className="space-y-6">
            <div className="flex justify-between items-start p-4 bg-gray-50 rounded-2xl border border-gray-100">
              <div>
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Customer / Table</p>
                <div className="flex items-center gap-2">
                  <Hash size={16} className="text-indigo-600" />
                  <span className="text-lg font-black text-gray-900">Table {selectedOrder.tableNumber}</span>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mb-1">Date & Time</p>
                <p className="text-sm font-bold text-gray-700">
                  {selectedOrder.date?.toDate ? format(selectedOrder.date.toDate(), 'dd MMM yyyy, HH:mm') : 'N/A'}
                </p>
              </div>
            </div>

            {/* Delivery Status Controls */}
            <div className="space-y-3">
              <h4 className="text-xs font-black text-gray-400 uppercase tracking-widest flex items-center gap-2">
                <ChefHat size={16} className="text-indigo-600" />
                Preparation Status
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {['Received', 'Preparing', 'Served'].map((status) => (
                  <button
                    key={status}
                    onClick={() => updateDeliveryStatus(selectedOrder.id, status)}
                    className={`py-2 rounded-xl text-xs font-bold transition-all border ${
                      (selectedOrder.deliveryStatus || 'Received') === status
                        ? 'bg-indigo-600 text-white border-indigo-600 shadow-lg shadow-indigo-100'
                        : 'bg-white text-gray-500 border-gray-100 hover:border-indigo-200'
                    }`}
                  >
                    {status}
                  </button>
                ))}
              </div>
            </div>

            {selectedOrder.notes && (
              <div className="p-4 bg-yellow-50 border-l-4 border-yellow-400 rounded-r-2xl">
                <p className="text-[10px] text-yellow-600 font-black uppercase tracking-widest mb-1 flex items-center gap-1">
                  <Hash size={10} />
                  Customer Suggestion
                </p>
                <p className="text-sm font-bold text-yellow-900 italic">"{selectedOrder.notes}"</p>
              </div>
            )}

            <div className="space-y-3">
              <h4 className="text-sm font-black text-gray-900 uppercase tracking-widest flex items-center gap-2">
                <ShoppingBag size={16} className="text-indigo-600" />
                Ordered Items
              </h4>
              <div className="space-y-2">
                {selectedOrder.items.map((item, i) => (
                  <div key={i} className="flex justify-between items-center p-3 bg-white border border-gray-100 rounded-xl">
                    <div className="flex items-center gap-3">
                      <span className="w-8 h-8 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-lg font-bold text-sm">
                        {item.quantity}
                      </span>
                      <span className="font-bold text-gray-800">{item.name}</span>
                    </div>
                    <span className="font-black text-gray-900">₹{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-4 border-t border-gray-100 space-y-2">
              <div className="flex justify-between text-gray-500 text-sm">
                <span>Base Amount</span>
                <span>₹{selectedOrder.subtotal?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-500 text-sm">
                <span>CGST</span>
                <span>₹{selectedOrder.cgst?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-500 text-sm">
                <span>SGST</span>
                <span>₹{selectedOrder.sgst?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-2xl font-black text-indigo-600 pt-2">
                <span>Total Amount</span>
                <span>₹{selectedOrder.totalAmount?.toFixed(2)}</span>
              </div>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default Orders;
