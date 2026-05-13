import React, { useState, useEffect } from 'react';
import Card from '../../components/Card';
import { db } from '../../firebase/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { Package, FileText, IndianRupee, Users, ArrowRight, TrendingUp, Sparkles, Clock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

const StatCard = ({ title, value, icon: Icon, gradient, trend }) => (
  <Card className="relative overflow-hidden border-none shadow-[0_15px_40px_rgba(0,0,0,0.03)] hover:shadow-[0_25px_50px_rgba(0,0,0,0.08)] transition-all duration-500 group" padding="p-6">
    <div className={`absolute top-0 right-0 w-24 h-24 bg-linear-to-br ${gradient} opacity-5 rounded-bl-[5rem] transition-transform duration-700 group-hover:scale-110`} />
    <div className="relative z-10 flex flex-col gap-4">
      <div className={`w-14 h-14 bg-linear-to-br ${gradient} rounded-2xl flex items-center justify-center text-white shadow-lg`}>
        <Icon size={28} strokeWidth={2.5} />
      </div>
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-1">{title}</p>
        <div className="flex items-end gap-3">
          <p className="text-3xl font-black text-gray-900 tracking-tighter leading-none">{value}</p>
          {trend && (
            <div className="flex items-center gap-1 text-emerald-500 font-bold text-xs bg-emerald-50 px-2 py-0.5 rounded-full">
              <TrendingUp size={12} />
              {trend}
            </div>
          )}
        </div>
      </div>
    </div>
  </Card>
);

const Dashboard = () => {
  const [stats, setStats] = useState({
    products: 0,
    bills: 0,
    revenue: 0,
    customers: 0
  });
  const [recentBills, setRecentBills] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setStats(prev => ({ ...prev, products: snapshot.size }));
    });

    const unsubBills = onSnapshot(collection(db, 'bills'), (snapshot) => {
      const bills = snapshot.docs.map(doc => doc.data());
      const totalRevenue = bills.reduce((acc, bill) => acc + (bill.totalAmount || 0), 0);
      const uniqueCustomers = new Set(bills.map(bill => bill.customerName)).size;
      
      setStats(prev => ({ 
        ...prev, 
        bills: snapshot.size,
        revenue: totalRevenue,
        customers: uniqueCustomers
      }));
    });

    const qRecent = query(collection(db, 'bills'), orderBy('date', 'desc'), limit(5));
    const unsubRecent = onSnapshot(qRecent, (snapshot) => {
      setRecentBills(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    return () => {
      unsubProducts();
      unsubBills();
      unsubRecent();
    };
  }, []);

  const statItems = [
    { title: 'Inventory Size', value: stats.products.toString(), icon: Package, gradient: 'from-blue-500 to-indigo-600', trend: '+12%' },
    { title: 'Total Orders', value: stats.bills.toString(), icon: FileText, gradient: 'from-emerald-500 to-teal-600', trend: '+18%' },
    { title: 'Gross Revenue', value: `₹${stats.revenue.toLocaleString()}`, icon: IndianRupee, gradient: 'from-indigo-600 to-violet-700', trend: '+24%' },
    { title: 'Guest Reach', value: stats.customers.toString(), icon: Users, gradient: 'from-amber-500 to-orange-600', trend: '+5%' },
  ];

  return (
    <div className="space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Live Operations</span>
          </div>
          <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase leading-none">Dashboard</h1>
          <p className="text-gray-500 mt-2 font-medium">Monitoring your restaurant's pulse in real-time.</p>
        </div>
        <div className="flex items-center gap-4">
          <div className="glass px-4 py-2 rounded-2xl flex items-center gap-2 text-gray-500 text-xs font-bold border-gray-100">
            <Clock size={16} className="text-indigo-600" />
            Last Updated: {format(new Date(), 'HH:mm')}
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
        {statItems.map((stat, index) => (
          <div key={index} className="animate-in fade-in slide-in-from-bottom-8 fill-mode-both" style={{ animationDelay: `${index * 100}ms` }}>
            <StatCard {...stat} />
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <Card className="lg:col-span-2 border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] rounded-[2.5rem]" padding="p-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">Recent Invoices</h3>
              <p className="text-xs text-gray-400 font-bold uppercase tracking-widest mt-1">Latest 5 transactions</p>
            </div>
            <Link to="/admin/orders" className="p-3 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all active:scale-90 group">
              <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
          
          <div className="space-y-4">
            {recentBills.map((bill, index) => (
              <div 
                key={bill.id} 
                className="flex items-center justify-between p-5 bg-gray-50/50 hover:bg-white hover:shadow-xl hover:shadow-gray-100 rounded-[1.5rem] transition-all duration-500 group animate-in fade-in slide-in-from-left-4 fill-mode-both"
                style={{ animationDelay: `${(index + 4) * 100}ms` }}
              >
                <div className="flex items-center gap-5">
                  <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center text-gray-400 group-hover:text-indigo-600 transition-colors">
                    <FileText size={20} />
                  </div>
                  <div>
                    <p className="font-black text-gray-900 group-hover:text-indigo-600 transition-colors tracking-tight">{bill.invoiceNumber}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{bill.customerName}</span>
                      <span className="w-1 h-1 bg-gray-300 rounded-full" />
                      <span className="text-[10px] text-gray-400">Table {bill.tableNumber}</span>
                    </div>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-black text-lg text-gray-900">₹{bill.totalAmount?.toFixed(2)}</p>
                  <div className="flex items-center justify-end gap-1.5 mt-0.5 text-gray-400">
                    <Clock size={10} />
                    <span className="text-[10px] font-bold">
                      {bill.date?.toDate ? format(bill.date.toDate(), 'HH:mm') : ''}
                    </span>
                  </div>
                </div>
              </div>
            ))}
            {recentBills.length === 0 && !loading && (
              <div className="text-center py-20 space-y-4 glass rounded-[2rem] border-dashed border-2 border-gray-100">
                <div className="w-16 h-16 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
                  <FileText size={32} />
                </div>
                <p className="text-gray-400 font-bold uppercase tracking-widest text-xs">No transactions recorded yet</p>
              </div>
            )}
          </div>
        </Card>

        <Card className="border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] rounded-[2.5rem] relative overflow-hidden" padding="p-8">
          <div className="absolute top-0 right-0 p-6 text-indigo-50 opacity-50">
            <Sparkles size={120} />
          </div>
          <div className="relative z-10">
            <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter mb-8">System Health</h3>
            <div className="space-y-8">
              <div className="flex items-start gap-5 p-4 rounded-3xl hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 bg-emerald-50 text-emerald-600 rounded-xl flex items-center justify-center border border-emerald-100">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900 leading-tight">Database Syncing</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Firestore Active</p>
                </div>
              </div>
              <div className="flex items-start gap-5 p-4 rounded-3xl hover:bg-gray-50 transition-colors">
                <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center border border-indigo-100">
                  <Package size={20} />
                </div>
                <div>
                  <p className="text-sm font-black text-gray-900 leading-tight">Asset Storage</p>
                  <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest mt-1">Media Ready</p>
                </div>
              </div>
              <div className="pt-8 border-t border-gray-100">
                <p className="text-xs text-gray-400 leading-relaxed font-medium">
                  Your restaurant system is running at peak performance. Add more <Link to="/admin/products" className="text-indigo-600 font-black hover:underline">Inventory</Link> to expand your reach.
                </p>
              </div>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
