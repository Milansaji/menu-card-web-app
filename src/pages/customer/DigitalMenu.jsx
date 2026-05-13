import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/firebase';
import { collection, onSnapshot, query, where, getDoc, doc } from 'firebase/firestore';
import { useCart } from '../../contexts/CartContext';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Plus, Star, Clock, Hash, Receipt, ArrowLeft, ChefHat, Sparkles, Flame } from 'lucide-react';
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
  const [activeOrder, setActiveOrder] = useState(null);
  const [searchParams] = useSearchParams();
  const { addToCart, setTableNumber, tableNumber, clearCart } = useCart();

  useEffect(() => {
    // Check for active orders in localStorage
    const orderIds = JSON.parse(localStorage.getItem('myOrders') || '[]');
    if (orderIds.length > 0) {
      const latestId = orderIds[orderIds.length - 1];
      const unsub = onSnapshot(doc(db, 'bills', latestId), (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
          if (data.status !== 'paid' && String(data.tableNumber) === String(tableNumber)) {
            setActiveOrder({ id: snapshot.id, ...data });
          } else {
            setActiveOrder(null);
          }
        }
      });
      return () => unsub();
    }
  }, [tableNumber]);

  useEffect(() => {
    const table = searchParams.get('table');
    if (table && table !== tableNumber) {
      clearCart();
      setTableNumber(table);
      toast.success(`Welcome to Table ${table}`, {
        icon: '🪑',
        style: { borderRadius: '1rem', background: '#333', color: '#fff' }
      });
    }
  }, [searchParams, tableNumber]);

  useEffect(() => {
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

    return () => {
      unsubProducts();
      unsubCategories();
    };
  }, []);

  const handleAddToCart = (product) => {
    addToCart(product);
    toast.success(`${product.name} added to cart`, {
      icon: '🛒',
      position: 'bottom-center',
      style: { borderRadius: '1rem', background: '#333', color: '#fff' }
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
      <div className="p-6 space-y-8 max-w-2xl mx-auto">
        <div className="h-56 bg-gray-100 rounded-[2.5rem] animate-shimmer" />
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
          {Array(5).fill(0).map((_, i) => (
            <div key={i} className="min-w-[100px] h-12 bg-gray-100 rounded-full animate-shimmer" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-6">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-36 bg-gray-100 rounded-[2rem] animate-shimmer" />
          ))}
        </div>
      </div>
    );
  }

  const restaurantName = settings?.restaurantName || 'CAFE SUNRISE';

  return (
    <div className="animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-24 pt-4 max-w-2xl mx-auto">

      {/* Active Order Banner */}
      {activeOrder && (
        <div className="mx-6 mb-6 animate-in slide-in-from-top-12 duration-700 ease-out">
          <Link 
            to="/track-order"
            className="flex items-center justify-between p-5 bg-linear-to-r from-emerald-500/10 to-teal-500/10 border border-emerald-100 rounded-[2rem] shadow-sm hover:shadow-lg hover:shadow-emerald-100/50 transition-all group"
            aria-live="polite"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-emerald-500 text-white rounded-2xl flex items-center justify-center animate-pulse shadow-lg shadow-emerald-200">
                <ChefHat size={24} />
              </div>
              <div>
                <p className="text-[10px] text-emerald-600 font-black uppercase tracking-[0.2em] mb-1">Live Order Status</p>
                <p className="text-base font-black text-emerald-900 leading-none">
                  {activeOrder.deliveryStatus === 'Served' ? 'Order Served! 🎉' : `Chef is ${activeOrder.deliveryStatus || 'Preparing'}...`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2 text-emerald-600 font-black text-xs uppercase tracking-wider bg-white/50 px-3 py-2 rounded-xl border border-emerald-100">
              Track
              <ArrowLeft size={14} className="rotate-180 group-hover:translate-x-1 transition-transform" />
            </div>
          </Link>
        </div>
      )}

      {/* Hero Section */}
      <div className="relative h-56 overflow-hidden mx-6 rounded-[2.5rem] shadow-2xl shadow-indigo-100 group">
        <div className="absolute inset-0 bg-linear-to-br from-indigo-600 via-indigo-700 to-violet-800 z-10" />
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1554118811-1e0d58224f24?q=80&w=2047&auto=format&fit=crop')] bg-cover bg-center mix-blend-overlay opacity-40 transition-transform duration-1000 group-hover:scale-110" />
        <div className="absolute inset-0 bg-linear-to-t from-black/80 via-black/20 to-transparent z-20" />
        
        <div className="absolute top-6 right-6 z-30">
          <div className="glass px-3 py-1.5 rounded-full flex items-center gap-2 text-white/90 text-[10px] font-black uppercase tracking-widest border-white/20">
            <Sparkles size={12} className="text-amber-400" />
            Premium Dining
          </div>
        </div>

        <div className="absolute bottom-8 left-8 right-8 z-30">
          <h1 className="text-4xl font-black tracking-tighter text-white mb-2 drop-shadow-lg uppercase leading-none">
            {restaurantName}
          </h1>
          <div className="flex items-center gap-2 text-indigo-100/90 text-sm font-medium">
            <span className="w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse" />
            {settings?.address || 'Experience the taste of sunrise'}
          </div>
        </div>
      </div>

      <div className="px-6 mt-8 space-y-8">
        {/* Search Bar */}
        <div className="relative group">
          <div className="absolute inset-y-0 left-0 pl-5 flex items-center pointer-events-none transition-colors duration-300 group-focus-within:text-indigo-600 text-gray-400">
            <Search size={22} strokeWidth={2.5} />
          </div>
          <input
            type="text"
            placeholder="Craving something specific?"
            className="w-full pl-14 pr-6 py-5 bg-white border border-gray-100/50 rounded-3xl focus:ring-4 focus:ring-indigo-100 outline-none shadow-[0_8px_30px_rgb(0,0,0,0.04)] transition-all focus:shadow-[0_20px_40px_rgb(0,0,0,0.08)] placeholder:text-gray-400 placeholder:font-medium text-gray-900"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Categories Horizontal Scroll */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Explore Categories</h2>
            <div className="h-[1px] flex-1 ml-4 bg-gray-100" />
          </div>
          <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide -mx-6 px-6">
            <button
              onClick={() => setSelectedCategory('all')}
              aria-pressed={selectedCategory === 'all'}
              className={`whitespace-nowrap px-8 py-3.5 rounded-[1.5rem] text-sm font-black transition-all duration-500 active:scale-90 border-2 ${
                selectedCategory === 'all' 
                  ? 'bg-indigo-600 text-white border-indigo-600 shadow-[0_10px_20px_rgba(79,70,229,0.3)]' 
                  : 'bg-white text-gray-500 border-gray-50 hover:border-indigo-100 hover:text-indigo-600 shadow-sm'
              }`}
            >
              All Items
            </button>
            {categories.map(cat => (
              <button
                key={cat.id}
                onClick={() => setSelectedCategory(cat.id)}
                aria-pressed={selectedCategory === cat.id}
                className={`whitespace-nowrap px-8 py-3.5 rounded-[1.5rem] text-sm font-black transition-all duration-500 active:scale-90 border-2 ${
                  selectedCategory === cat.id 
                    ? 'bg-indigo-600 text-white border-indigo-600 shadow-[0_10px_20px_rgba(79,70,229,0.3)]' 
                    : 'bg-white text-gray-500 border-gray-50 hover:border-indigo-100 hover:text-indigo-600 shadow-sm'
                }`}
              >
                {cat.name}
              </button>
            ))}
          </div>
        </div>

        {/* Products List */}
        <div className="space-y-6">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-black text-gray-900 tracking-tight">
              {selectedCategory === 'all' ? 'Signature Menu' : categories.find(c => c.id === selectedCategory)?.name}
            </h2>
            {selectedCategory === 'all' && <Flame size={20} className="text-orange-500 animate-bounce" />}
          </div>
          
          <div className="grid grid-cols-1 gap-6">
            {filteredProducts.map((product, index) => (
              <Card 
                key={product.id} 
                className="flex gap-5 p-4 border-none shadow-sm hover:shadow-2xl hover:-translate-y-1 transition-all duration-500 animate-in fade-in slide-in-from-bottom-12 fill-mode-both @container group overflow-hidden" 
                padding="p-4"
                style={{ animationDelay: `${Math.min(index, 6) * 100}ms` }}
              >
                <div className="w-28 h-28 @[400px]:w-36 @[400px]:h-36 bg-gray-50 rounded-3xl overflow-hidden flex-shrink-0 relative">
                  {product.imageUrl ? (
                    <img 
                      src={product.imageUrl} 
                      alt={product.name} 
                      className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" 
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-200">
                      <Plus size={40} />
                    </div>
                  )}
                  {product.cookingTime && (
                    <div className="absolute top-3 left-3 glass px-2.5 py-1 rounded-xl flex items-center gap-1.5 text-[10px] font-black text-gray-900 uppercase tracking-tighter">
                      <Clock size={12} className="text-indigo-600" />
                      {product.cookingTime}m
                    </div>
                  )}
                </div>
                
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <div className="flex items-start justify-between">
                      <h3 className="font-black text-gray-900 text-lg leading-tight group-hover:text-indigo-600 transition-colors">{product.name}</h3>
                      {product.isVegetarian && (
                        <div className="w-4 h-4 border-2 border-green-600 flex items-center justify-center p-0.5">
                          <div className="w-full h-full bg-green-600 rounded-full" />
                        </div>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-2 leading-relaxed font-medium">{product.description}</p>
                  </div>
                  
                  <div className="flex items-center justify-between mt-4">
                    <div className="flex flex-col">
                      <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1">Price</span>
                      <span className="text-xl font-black text-indigo-600">₹{product.price}</span>
                    </div>
                    <button 
                      onClick={() => handleAddToCart(product)}
                      className="p-3.5 bg-indigo-50 text-indigo-600 rounded-2xl hover:bg-indigo-600 hover:text-white transition-all active:scale-90 shadow-sm hover:shadow-indigo-200/50 group-hover:scale-105"
                      aria-label={`Add ${product.name} to cart`}
                    >
                      <Plus size={24} strokeWidth={3} />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
            
            {filteredProducts.length === 0 && (
              <div className="text-center py-20 px-10 space-y-4 glass rounded-[3rem] border-dashed border-2 border-gray-100">
                <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto text-gray-300">
                  <Search size={40} />
                </div>
                <h3 className="text-xl font-black text-gray-900 uppercase tracking-tighter">No items found</h3>
                <p className="text-gray-500 text-sm font-medium">We couldn't find anything matching your search. Try a different dish!</p>
                <Button variant="secondary" onClick={() => {setSearchTerm(''); setSelectedCategory('all')}}>
                  Clear Filters
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
