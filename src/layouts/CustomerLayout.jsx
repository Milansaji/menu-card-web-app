import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { ShoppingCart, Menu as MenuIcon } from 'lucide-react';

const CustomerLayout = () => {
  const { totalItems } = useCart();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <MenuIcon className="text-white" size={18} />
          </div>
          <span className="font-bold text-lg text-gray-900 tracking-tight">FoodieMenu</span>
        </Link>

        <Link 
          to="/cart" 
          className="relative p-2 text-gray-700 hover:bg-gray-100 rounded-full transition-colors"
        >
          <ShoppingCart size={24} />
          {totalItems > 0 && (
            <span className="absolute top-0 right-0 bg-indigo-600 text-white text-[10px] font-bold w-5 h-5 rounded-full flex items-center justify-center border-2 border-white">
              {totalItems}
            </span>
          )}
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-20">
        <Outlet />
      </main>

      {/* Floating View Cart Button (Mobile) */}
      {totalItems > 0 && (
        <div className="fixed bottom-6 left-0 right-0 px-6 z-40">
          <Link 
            to="/cart"
            className="w-full bg-indigo-600 text-white py-4 px-6 rounded-2xl font-bold flex items-center justify-between shadow-xl shadow-indigo-200 animate-in fade-in slide-in-from-bottom-4 duration-300"
          >
            <div className="flex items-center gap-2">
              <ShoppingCart size={20} />
              <span>{totalItems} {totalItems === 1 ? 'Item' : 'Items'}</span>
            </div>
            <span>View Cart</span>
          </Link>
        </div>
      )}
    </div>
  );
};

export default CustomerLayout;
