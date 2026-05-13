import React, { useState, useEffect } from 'react';
import { db } from '../../firebase/firebase';
import { collection, onSnapshot, query, where, getDoc, doc } from 'firebase/firestore';
import { useCart } from '../../contexts/CartContext';
import { useSearchParams, Link } from 'react-router-dom';
import { Search, Plus, Star, Clock, Hash, Receipt } from 'lucide-react';
import Card from '../../components/Card';
import { toast } from 'react-hot-toast';

const DigitalMenu = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [settings, setSettings] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchParams] = useSearchParams();
  const { addToCart, setTableNumber, tableNumber, clearCart } = useCart();

  useEffect(() => {
    const table = searchParams.get('table');
    if (table && table !== tableNumber) {
      clearCart();
      setTableNumber(table);
      toast.success(`Welcome to Table ${table}`);
    }
  }, [searchParams, tableNumber]);

  useEffect(() => {
    // Fetch Products
    const unsubProducts = onSnapshot(collection(db, 'products'), (snapshot) => {
      setProducts(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
      setLoading(false);
    });

    // Fetch Categories
    const unsubCategories = onSnapshot(collection(db, 'categories'), (snapshot) => {
      setCategories(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });

    // Fetch Settings
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
      <div className="p-6 space-y-6">
        <div className="h-48 bg-gray-100 rounded-3xl animate-pulse" />
        <div className="flex gap-4 overflow-x-auto pb-2">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="min-w-[100px] h-10 bg-gray-100 rounded-full animate-pulse" />
          ))}
        </div>
        <div className="grid grid-cols-1 gap-4">
          {Array(4).fill(0).map((_, i) => (
            <div key={i} className="h-32 bg-gray-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-700 pb-24">
      {/* Sticky Top Bar */}
      <div className="sticky top-0 z-50 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-6 py-3 flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          {tableNumber && (
            <div className="flex items-center gap-1.5 bg-indigo-600 text-white px-4 py-1.5 rounded-full text-xs font-black shadow-lg shadow-indigo-100">
              <Hash size={14} />
              TABLE {tableNumber}
            </div>
          )}
          {!tableNumber && <span className="font-black text-indigo-600">Menu</span>}
        </div>
      </div>

      {/* Hero Section */}
      <div className="relative h-48 bg-indigo-600 overflow-hidden mx-6 rounded-3xl mt-4">
        <div className="absolute inset-0 bg-linear-to-t from-black/60 to-transparent z-10" />
        <div className="absolute inset-0 bg-indigo-900 opacity-20 pattern-dots" />
        <div className="absolute bottom-6 left-6 right-6 z-20 text-white">
          <h1 className="text-3xl font-black tracking-tight">{settings?.restaurantName || 'Digital Menu'}</h1>
          <p className="text-sm opacity-90 line-clamp-1">{settings?.address || 'Welcome to our restaurant'}</p>
        </div>
      </div>

      <div className="px-6 space-y-6">
        {/* Search Bar */}
        <div className="relative animate-in fade-in slide-in-from-top-4 duration-500">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input
            type="text"
            placeholder="Search for dishes..."
            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-inner transition-all focus:bg-white focus:shadow-lg"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Categories Horizontal Scroll */}
        <div className="flex gap-3 overflow-x-auto pb-4 scrollbar-hide animate-in fade-in slide-in-from-left-4 duration-700">
          <button
            onClick={() => setSelectedCategory('all')}
            className={`whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ${
              selectedCategory === 'all' 
                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-105' 
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            All
          </button>
          {categories.map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategory(cat.id)}
              className={`whitespace-nowrap px-6 py-2.5 rounded-full text-sm font-bold transition-all ${
                selectedCategory === cat.id 
                  ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100 scale-105' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {cat.name}
            </button>
          ))}
        </div>

        {/* Products List */}
        <div className="space-y-4">
          <h2 className="text-xl font-black text-gray-900 tracking-tight">
            {selectedCategory === 'all' ? 'Popular Items' : categories.find(c => c.id === selectedCategory)?.name}
          </h2>
          <div className="grid grid-cols-1 gap-4">
            {filteredProducts.map((product, index) => (
              <Card 
                key={product.id} 
                className="flex gap-4 p-3 border-none shadow-sm hover:shadow-xl hover:scale-[1.02] transition-all duration-300 animate-in fade-in slide-in-from-bottom-4 fill-mode-both" 
                padding="p-3"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gray-50 rounded-2xl overflow-hidden flex-shrink-0 relative group">
                  {product.imageUrl ? (
                    <img src={product.imageUrl} alt={product.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-gray-200">
                      <Plus size={32} />
                    </div>
                  )}
                  {product.cookingTime && (
                    <div className="absolute top-2 left-2 bg-black/50 backdrop-blur-md text-white text-[10px] font-bold px-2 py-1 rounded-lg flex items-center gap-1">
                      <Clock size={10} />
                      {product.cookingTime}m
                    </div>
                  )}
                </div>
                <div className="flex-1 flex flex-col justify-between py-1">
                  <div>
                    <h3 className="font-bold text-gray-900 line-clamp-1">{product.name}</h3>
                    <p className="text-xs text-gray-500 line-clamp-2 mt-1">{product.description}</p>
                  </div>
                  <div className="flex items-center justify-between mt-2">
                    <span className="text-indigo-600 font-black">₹{product.price}</span>
                    <button 
                      onClick={() => handleAddToCart(product)}
                      className="p-2 bg-indigo-50 text-indigo-600 rounded-lg hover:bg-indigo-600 hover:text-white transition-all active:scale-90"
                    >
                      <Plus size={20} />
                    </button>
                  </div>
                </div>
              </Card>
            ))}
            {filteredProducts.length === 0 && (
              <div className="text-center py-12 text-gray-400 italic">No items found in this category.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DigitalMenu;
