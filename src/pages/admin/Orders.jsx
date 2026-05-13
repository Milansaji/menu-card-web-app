import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/firebase';
import { collection, onSnapshot, query, orderBy, doc, updateDoc } from 'firebase/firestore';
import { FileText, Calendar, User, IndianRupee, ExternalLink, Hash, X, ShoppingBag, CheckCircle2, Search, Filter } from 'lucide-react';
import Card from '../../components/Card';
import Modal from '../../components/Modal';
import Button from '../../components/Button';
import { format, isToday, isYesterday } from 'date-fns';
import { toast } from 'react-hot-toast';

const Orders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  
  // Filter states
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [dateFilter, setDateFilter] = useState('all');

  useEffect(() => {
    const q = query(collection(db, 'bills'), orderBy('date', 'desc'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  const openOrderDetails = (order) => {
    setSelectedOrder(order);
    setIsModalOpen(true);
  };

  const updateOrderStatus = async (id, newStatus) => {
    try {
      await updateDoc(doc(db, 'bills', id), { status: newStatus });
      toast.success(`Order marked as ${newStatus}`);
      setIsModalOpen(false);
    } catch (error) {
      toast.error('Failed to update status');
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

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Orders History</h1>
          <p className="text-gray-500 mt-1">Manage incoming table orders and payments.</p>
        </div>
        <div className="flex gap-2">
          <div className="bg-indigo-50 px-4 py-2 rounded-xl border border-indigo-100 flex items-center gap-3">
            <div className="text-right">
              <p className="text-[10px] text-indigo-400 font-black uppercase tracking-wider">Filtered</p>
              <p className="text-indigo-600 font-bold text-xl leading-none">{filteredOrders.length}</p>
            </div>
            <div className="w-px h-8 bg-indigo-200" />
            <div className="text-right">
              <p className="text-[10px] text-indigo-400 font-black uppercase tracking-wider">Total</p>
              <p className="text-indigo-600 font-bold text-xl leading-none">{orders.length}</p>
            </div>
          </div>
        </div>
      </header>

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
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="paid">Paid</option>
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
              <th className="px-6 py-3 font-medium">Date</th>
              <th className="px-6 py-3 font-medium">Amount</th>
              <th className="px-6 py-3 font-medium">Status</th>
              <th className="px-6 py-3 font-medium">Action</th>
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
                    <div className="flex items-center gap-2 text-gray-600 text-sm">
                      <Calendar size={14} />
                      <span>
                        {order.date?.toDate ? format(order.date.toDate(), 'dd MMM, HH:mm') : 'N/A'}
                      </span>
                    </div>
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
                        : order.status === 'pending'
                        ? 'bg-yellow-100 text-yellow-700'
                        : 'bg-blue-100 text-blue-700'
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

      {/* Order Details Modal (Same as before) */}
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
