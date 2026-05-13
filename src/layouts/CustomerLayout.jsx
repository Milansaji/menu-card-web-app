import React from 'react';
import { Outlet, Link } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { ShoppingCart, Menu as MenuIcon, Receipt, Hash } from 'lucide-react';

const CustomerLayout = () => {
  const { totalItems, tableNumber } = useCart();

  return (
    <div className="min-h-screen bg-white flex flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100 px-4 py-3 flex items-center justify-between">
        <Link to="/menu/main" className="flex items-center gap-2">
          <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
            <MenuIcon className="text-white" size={18} />
          </div>
          <div className="flex flex-col">
            <span className="font-bold text-sm text-gray-900 leading-tight">FoodieMenu</span>
            {tableNumber && (
              <span className="text-[10px] font-black text-indigo-600 flex items-center gap-0.5">
                <Hash size={10} />
                TABLE {tableNumber}
              </span>
            )}
          </div>
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

      {/* Floating My Orders Button */}
      <Link 
        to="/track-order"
        className={`fixed z-50 transition-all duration-500 shadow-2xl flex items-center justify-center gap-2 group ${
          totalItems > 0 ? 'bottom-24 right-6' : 'bottom-8 right-6'
        }`}
      >
        <div className="bg-yellow-400 text-yellow-900 p-4 rounded-full shadow-lg group-hover:scale-110 transition-transform flex items-center gap-2">
          <Receipt size={24} />
          <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 font-bold whitespace-nowrap">My Orders</span>
        </div>
      </Link>

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
