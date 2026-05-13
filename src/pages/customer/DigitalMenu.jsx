import React, { useState, useEffect, useCallback } from 'react';
import { db } from '../../firebase/firebase';
import { collection, onSnapshot, query, where, getDoc, doc } from 'firebase/firestore';
import { useCart } from '../../contexts/CartContext';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Plus, Star, Clock, Hash, Receipt, ArrowLeft, ChefHat, Sparkles, Flame, RotateCw } from 'lucide-react';
import Card from '../../components/Card';
import Button from '../../components/Button';
import { toast } from 'react-hot-toast';

const DigitalMenu = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeOrder, setActiveOrder] = useState(null);
  const [searchParams] = useSearchParams();
  const { addToCart, setTableNumber, tableNumber, clearCart } = useCart();

  // Robust Active Order Tracking
  useEffect(() => {
    const orderIds = JSON.parse(localStorage.getItem('myOrders') || '[]');
    if (orderIds.length > 0) {
      // Monitor ALL recent orders to find an active one
      const unsubscribes = orderIds.map(id => 
        onSnapshot(doc(db, 'bills', id), (snapshot) => {
          if (snapshot.exists()) {
            const data = snapshot.data();
            if (data.status !== 'paid' && String(data.tableNumber) === String(tableNumber)) {
              setActiveOrder({ id: snapshot.id, ...data });
            }
          }
        })
      );
      return () => unsubscribes.forEach(unsub => unsub());
    }
  }, [tableNumber]);

  useEffect(() => {
    const table = searchParams.get('table');
    if (table && table !== tableNumber) {
      // Clear cart only if table actually changes to prevent accidental loss
      if (tableNumber) {
        clearCart();
        toast.success(`Welcome to Table ${table}`, {
          icon: '🪑',
          style: { borderRadius: '1rem', background: '#333', color: '#fff' }
        });
      } else {
        toast.success(`Linked to Table ${table}`, {
          icon: '🔗',
          style: { borderRadius: '1rem', background: '#333', color: '#fff' }
        });
      }
      
      setTableNumber(table);
      // Explicit mobile persistence
      localStorage.setItem('currentTable', table);
    }
  }, [searchParams, tableNumber, setTableNumber, clearCart]);

  const syncMenu = useCallback(() => {
    setIsSyncing(true);
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    const unsubCategories = onSnapshot(collection(db, 'categories'), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    const fetchSettings = async () => {
      const docSnap = await getDoc(doc(db, 'settings', 'config'));
      if (docSnap.exists()) setSettings(docSnap.data());
    };
    fetchSettings();

    setTimeout(() => setIsSyncing(false), 1000);

    return () => {
      unsubProducts();
      unsubCategories();
    };
  }, []);

  useEffect(() => {
    const unsub = syncMenu();
    return () => unsub();
  }, [syncMenu]);

  const handleAddToCart = (product) => {
    addToCart(product);
    toast.success(`${product.name} ready!`, {
      icon: '🛒',
      position: 'bottom-center',
      style: { borderRadius: '1.25rem', background: '#111', color: '#fff', fontWeight: 'bold' }
    });
  };

  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const matchesSearch = p.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         p.description.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesCategory && matchesSearch && p.isAvailable;
  });

  if (loading) {
    return (
      <div className="p-8 space-y-10 max-w-2xl mx-auto bg-white min-h-screen">
        <div className="h-64 bg-gray-50 rounded-[2.5rem] animate-shimmer" />
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="min-w-[120px] h-14 bg-gray-50 rounded-full animate-shimmer" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-8">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-44 bg-gray-50 rounded-[2.5rem] animate-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  const restaurantName = settings?.restaurantName || 'CAFE SUNRISE';

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-40 pt-6 max-w-2xl mx-auto min-h-screen bg-gray-50/20">

      {/* Active Order Banner */}
      {activeOrder && (
        <div className="mx-6 mb-8 animate-in slide-in-from-top-12 duration-700 ease-out">
          <Link 
            to="/track-order"
            className="flex items-center justify-between p-6 bg-linear-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-200/50 rounded-[2.5rem] shadow-[0_20px_50px_rgba(16,185,129,0.08)] hover:shadow-xl hover:shadow-emerald-200/20 transition-all group"
            aria-live="polite"
          >
            <div className="flex items-center gap-5">
              <div className="w-14 h-14 bg-emerald-500 text-white rounded-2xl flex items-center justify-center animate-pulse shadow-lg shadow-emerald-500/30">
                <ChefHat size={28} />
              </div>
              <div>
                <p className="text-[10px] text-emerald-600 font-black uppercase tracking-[0.2em] mb-1.5">Ongoing Experience</p>
                <p className="text-lg font-black text-emerald-900 tracking-tighter leading-none">
                  {activeOrder.deliveryStatus === 'Served' ? 'Feast is Ready! 🍽️' : `Kitchen: ${activeOrder.deliveryStatus || 'Received'}`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-emerald-600 font-black text-[10px] uppercase tracking-widest bg-white/80 px-5 py-3 rounded-2xl border border-emerald-100 shadow-sm">
              Live Track
              <ArrowLeft size={16} strokeWidth={3} className="rotate-180 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative h-64 overflow-hidden mx-6 rounded-[3rem] shadow-[0_30px_60px_rgba(79,70,229,0.15)] group">
        <div className="absolute inset-0 bg-linear-to-br from-indigo-600 via-indigo-700 to-violet-900 z-10" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=2047&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay opacity-30 transition-transform duration-2000 group-hover:scale-110" />
        <div className="absolute inset-0 bg-linear-to-t from-black/90 via-black/30 to-transparent z-20" />
        
        <div className="absolute top-8 right-8 z-30 flex gap-3">
          <button 
            onClick={syncMenu}
            className={`glass p-3 rounded-2xl text-white/90 border-white/20 active:scale-90 transition-all ${isSyncing ? 'animate-spin' : ''}`}
            title="Sync Menu"
          >
            <RotateCw size={18} strokeWidth={2.5} />
          </button>
          <div className="glass px-4 py-2 rounded-full flex items-center gap-2 text-white/90 text-[10px] font-black uppercase tracking-widest border-white/20">
            <Sparkles size={14} className="text-amber-400" />
            VVIP Dining
          </div>
        </div>

        <div className="absolute bottom-10 left-10 right-10 z-30">
          <h1 className="text-5xl font-black tracking-tighter text-white mb-3 drop-shadow-2xl uppercase leading-none">
            {restaurantName}
          </h1>
          <div className="flex items-center gap-3 text-indigo-100 font-bold text-sm">
            <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse shadow-[0_0_8px_rgba(52,211,153,0.8)]" />
            {settings?.address || 'Premium Culinary Destination'}
          </div>
        </div>
      </div>

      <div className="px-6 mt-12 space-y-10">
        {/* Search Bar */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-6 flex items-center pointer-events-none text-gray-300 group-focus-within:text-indigo-600 transition-colors">
            <Search size={24} strokeWidth={3} />
          </div>
          <input
            type="text"
            placeholder="Search for a dish or ingredient..."
            className="w-full pl-16 pr-8 py-6 bg-white border border-gray-100 rounded-[2rem] focus:ring-8 focus:ring-indigo-50 outline-none shadow-[0_15px_40px_rgb(0,0,0,0.03)] transition-all focus:shadow-[0_30px_60px_rgb(0,0,0,0.08)] placeholder:text-gray-300 placeholder:font-black placeholder:uppercase placeholder:text-[10px] placeholder:tracking-widest text-gray-900 font-bold"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Categories */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.25em]">Curated Categories</h2>
            <div className="h-[1px] flex-1 ml-6 bg-gray-100" />
          </div>
          <div className="flex gap-4 overflow-x-auto pb-6 scrollbar-hide -mx-6 px-6">
            <button
              onClick={() => setSelectedCategory('all')}
              className={`whitespace-nowrap px-10 py-4.5 rounded-[1.75rem] text-xs font-black transition-all duration-500 active:scale-95 border-2 uppercase tracking-widest ${
                selectedCategory === 'all' 
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-[0_15px_30px_rgba(79,70,229,0.3)]' 
                  : 'bg-white text-gray-400 border-gray-50 hover:border-indigo-100 hover:text-indigo-600'
              }`}
            >
              Master Menu
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                className={`whitespace-nowrap px-10 py-4.5 rounded-[1.75rem] text-xs font-black transition-all duration-500 active:scale-95 border-2 uppercase tracking-widest ${
                  selectedCategory === cat.id 
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-[0_15px_30px_rgba(79,70,229,0.3)]' 
                    : 'bg-white text-gray-400 border-gray-50 hover:border-indigo-100 hover:text-indigo-600'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Products */}
        <div className="space-y-8">
          <div className="flex items-center gap-4">
            <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase leading-none">
              {selectedCategory === 'all' ? 'Signature Dishes' : categories.find(c => c.id === selectedCategory)?.name}
            </h2>
            {selectedCategory === 'all' && <Flame size={24} className="text-orange-500 animate-pulse" />}
          </div>
          
          <div className="grid grid-cols-1 gap-8">
            {filteredProducts.map((product, index) => (
              <Card 
                key={product.id} 
                className="flex gap-6 p-5 border-none shadow-[0_10px_40px_rgb(0,0,0,0.02)] hover:shadow-[0_30px_70px_rgb(0,0,0,0.08)] hover:-translate-y-2 transition-all duration-700 animate-in fade-in slide-in-from-bottom-12 fill-mode-both @container group rounded-[2.5rem]" 
                padding="p-5"
                style={{ animationDelay: `${Math.min(index, 6) * 100}ms` }}
              >
                <div className="w-32 h-32 @[400px]:w-44 @[400px]:h-44 bg-gray-50 rounded-[2rem] overflow-hidden flex-shrink-0 relative">
                  {product.imageUrl ? (
                    <img 
                      src={product.imageUrl} 
                      alt={product.name} 
                      className="w-full h-full object-cover transition-transform duration-1000 group-hover:scale-110" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-200">
                      <Plus size={48} strokeWidth={1} />
                    </div>
                  )}
                  {product.cookingTime && (
                    <div className="absolute top-4 left-4 glass px-3 py-1.5 rounded-xl flex items-center gap-2 text-[10px] font-black text-gray-900 uppercase tracking-widest border-white/40 shadow-lg">
                      <Clock size={14} className="text-indigo-600" />
                      {product.cookingTime}m
                    </div>
                  )}
                </div>
                
                <div className="flex-1 flex flex-col justify-between py-2">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="font-black text-gray-900 text-xl tracking-tight leading-none group-hover:text-indigo-600 transition-colors uppercase">{product.name}</h3>
                      {product.isVegetarian && (
                        <div className="w-5 h-5 border-2 border-emerald-600 flex items-center justify-center p-0.5 shrink-0">
                          <div className="w-full h-full bg-emerald-600 rounded-full" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 font-medium line-clamp-2 mt-3 leading-relaxed tracking-tight">{product.description}</p>
                  </div>
                  
                  <div className="flex items-center justify-between mt-6">
                    <div className="flex flex-col">
                      <span className="text-[9px] text-gray-300 font-black uppercase tracking-[0.2em] leading-none mb-1.5">Asset Value</span>
                      <span className="text-2xl font-black text-indigo-600 tracking-tighter">₹{product.price.toLocaleString()}</span>
                    </div>
                    <button 
                      onClick={() => handleAddToCart(product)}
                      className="w-14 h-14 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all active:scale-75 shadow-sm hover:shadow-xl hover:shadow-indigo-200 flex items-center justify-center"
                      aria-label={`Add ${product.name}`}
                    >
                      <Plus size={32} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
            
            {filteredProducts.length === 0 && (
              <div className="text-center py-24 px-10 space-y-6 glass rounded-[3.5rem] border-dashed border-2 border-gray-100 max-w-md mx-auto">
                <div className="w-24 h-24 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-200 shadow-inner">
                  <Search size={48} />
                </div>
                <div className="space-y-2">
                  <h3 className="text-2xl font-black text-gray-900 uppercase tracking-tighter">Culinary Void</h3>
                  <p className="text-gray-400 text-sm font-medium leading-relaxed">No dishes matched your criteria. Expand your horizons or refine your search.</p>
                </div>
                <Button variant="secondary" className="px-10 py-4 rounded-2xl" onClick={() => {setSearchTerm(''); setSelectedCategory('all')}}>
                  Reset Vault
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DigitalMenu;
