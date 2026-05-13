import React, { useState, useEffect } from 'react';
import Card from '../../components/Card';
import { db } from '../../firebase/firebase';
import { collection, onSnapshot, query, orderBy, limit } from 'firebase/firestore';
import { Package, FileText, IndianRupee, Users, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { format } from 'date-fns';

const StatCard = ({ title, value, icon: Icon, color }) => (
  <Card className="flex items-center gap-4">
    <div className={`p-4 rounded-2xl ${color} bg-opacity-10`}>
      <Icon className={color.replace('bg-', 'text-')} size={24} />
    </div>
    <div>
      <p className="text-sm font-medium text-gray-500 uppercase tracking-wider">{title}</p>
      <p className="text-2xl font-bold text-gray-900">{value}</p>
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
    // Products count
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setStats(prev => ({ ...prev, products: snapshot.size }));
    });

    // Bills and Revenue
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

    // Recent Bills
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
    { title: 'Total Products', value: stats.products.toString(), icon: Package, color: 'bg-blue-600' },
    { title: 'Total Orders', value: stats.bills.toString(), icon: FileText, color: 'bg-green-600' },
    { title: 'Revenue', value: `₹${stats.revenue.toLocaleString()}`, icon: IndianRupee, color: 'bg-indigo-600' },
    { title: 'Customers', value: stats.customers.toString(), icon: Users, color: 'bg-purple-600' },
  ];

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
      <header>
        <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
        <p className="text-gray-500 mt-1">Real-time overview of your restaurant operations.</p>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {statItems.map((stat, index) => (
          <StatCard key={index} {...stat} />
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="min-h-[300px]">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-50">
            <h3 className="text-lg font-bold text-gray-900">Recent Orders</h3>
            <Link to="/admin/orders" className="text-indigo-600 text-sm font-medium hover:underline flex items-center gap-1">
              View All <ArrowRight size={14} />
            </Link>
          </div>
          
          <div className="space-y-4">
            {recentBills.map(bill => (
              <div key={bill.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-xl transition-colors">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gray-100 rounded-lg text-gray-500">
                    <FileText size={16} />
                  </div>
                  <div>
                    <p className="font-bold text-sm text-gray-900">{bill.invoiceNumber}</p>
                    <p className="text-xs text-gray-500">{bill.customerName}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-sm text-indigo-600">₹{bill.totalAmount?.toFixed(2)}</p>
                  <p className="text-[10px] text-gray-400">
                    {bill.date?.toDate ? format(bill.date.toDate(), 'HH:mm') : ''}
                  </p>
                </div>
              </div>
            ))}
            {recentBills.length === 0 && !loading && (
              <div className="text-gray-400 text-center py-12 italic">
                No transactions yet.
              </div>
            )}
          </div>
        </Card>

        <Card className="min-h-[300px]">
          <div className="flex items-center justify-between mb-6 pb-4 border-b border-gray-50">
            <h3 className="text-lg font-bold text-gray-900">System Status</h3>
          </div>
          <div className="space-y-6">
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">Database Connected</p>
                <p className="text-xs text-gray-500">Cloud Firestore is active and syncing.</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-2 h-2 bg-green-500 rounded-full" />
              <div className="flex-1">
                <p className="text-sm font-bold text-gray-900">Storage Ready</p>
                <p className="text-xs text-gray-500">Firebase Storage is ready for product images.</p>
              </div>
            </div>
            <div className="pt-6">
              <p className="text-xs text-gray-400 leading-relaxed">
                Add products in the <Link to="/admin/products" className="text-indigo-600 hover:underline">Products</Link> section to start seeing menu performance analytics here.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
};

export default Dashboard;
