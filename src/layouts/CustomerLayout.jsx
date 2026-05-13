import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import { useCart } from '../contexts/CartContext';
import { ShoppingCart, Receipt, Hash, ArrowLeft } from 'lucide-react';

import { doc, getDoc } from 'firebase/firestore';
import { db } from '../firebase/firebase';

import logoAsset from '../assets/logo.webp';

const CustomerLayout = () => {
  const { totalItems, tableNumber } = useCart();
  const [logo, setLogo] = React.useState(null);
  const [hotelName, setHotelName] = React.useState('FoodieMenu');
  const location = useLocation();

  React.useEffect(() => {
    const fetchLogo = async () => {
      const docSnap = await getDoc(doc(db, 'settings', 'config'));
      if (docSnap.exists()) {
        const data = docSnap.data();
        setLogo(data.logoUrl || logoAsset);
        setHotelName(data.restaurantName || 'FoodieMenu');
      } else {
        setLogo(logoAsset);
      }
    };
    fetchLogo();
  }, []);

  const isMenuPage = location.pathname.startsWith('/menu');
  const isCartPage = location.pathname === '/cart';
  const isCheckoutPage = location.pathname === '/checkout';
  const isTrackOrderPage = location.pathname === '/track-order';
  const showFloatingButtons = !isCartPage && !isCheckoutPage && !isTrackOrderPage;

  return (
    <div className="min-h-screen bg-[#fcfcfd] flex flex-col font-sans selection:bg-indigo-100 selection:text-indigo-900">
      {/* Header */}
      <header className="sticky top-0 z-50 glass border-b border-white/20 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-3">
          {!isMenuPage && (
            <Link to="/menu/main" className="p-2 hover:bg-black/5 rounded-xl transition-colors active:scale-90">
              <ArrowLeft size={20} className="text-gray-900" />
            </Link>
          )}
          <Link to="/menu/main" className="flex items-center gap-3">
            <div className="relative">
              <img 
                src={logo || logoAsset} 
                alt={hotelName} 
                className="w-10 h-10 rounded-[0.8rem] object-cover shadow-sm ring-2 ring-white" 
                onError={(e) => { e.target.src = logoAsset; }}
              />
              <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-green-500 border-2 border-white rounded-full"></div>
            </div>
            <div className="flex flex-col">
              <span className="font-black text-[13px] text-gray-900 leading-none tracking-tight uppercase mb-0.5">{hotelName}</span>
              {tableNumber && (
                <div className="flex items-center gap-1 bg-indigo-50 px-2 py-0.5 rounded-full w-fit">
                  <Hash size={8} className="text-indigo-600 font-black" />
                  <span className="text-[9px] font-black text-indigo-600 tracking-wider">TABLE {tableNumber}</span>
                </div>
              )}
            </div>
          </Link>
        </div>

        <Link 
          to="/cart" 
          className="relative p-2.5 text-gray-900 hover:bg-black/5 rounded-2xl transition-all active:scale-90"
        >
          <ShoppingCart size={22} strokeWidth={2.5} />
          {totalItems > 0 && (
            <span className="absolute top-1 right-1 bg-indigo-600 text-white text-[9px] font-black w-5 h-5 rounded-full flex items-center justify-center ring-2 ring-white animate-in zoom-in duration-300">
              {totalItems}
            </span>
          )}
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 pb-24">
        <Outlet />
      </main>

      {/* Floating Buttons */}
      {showFloatingButtons && (
        <div className="fixed bottom-0 left-0 right-0 p-6 flex flex-col gap-4 pointer-events-none z-50">
          {/* Floating My Orders Button */}
          <div className="flex justify-end">
            <Link 
              to="/track-order"
              className={`pointer-events-auto transition-all duration-500 flex items-center gap-2 group ${
                totalItems > 0 ? 'mb-2' : ''
              }`}
            >
              <div className="bg-amber-400 text-amber-950 p-4 rounded-3xl shadow-[0_12px_24px_rgba(251,191,36,0.4)] hover:shadow-[0_15px_30px_rgba(251,191,36,0.5)] group-hover:scale-110 active:scale-95 transition-all flex items-center gap-3">
                <Receipt size={24} strokeWidth={2.5} />
                <span className="max-w-0 overflow-hidden group-hover:max-w-xs transition-all duration-500 font-black text-sm whitespace-nowrap uppercase tracking-wider">My Orders</span>
              </div>
            </Link>
          </div>

          {/* Floating View Cart Button (Mobile) */}
          {totalItems > 0 && (
            <div className="pointer-events-auto w-full animate-in slide-in-from-bottom-12 duration-500 ease-out">
              <Link 
                to="/cart"
                className="w-full bg-linear-to-r from-indigo-600 to-violet-700 text-white py-5 px-6 rounded-[2rem] font-black flex items-center justify-between shadow-[0_15px_35px_rgba(79,70,229,0.4)] hover:shadow-[0_20px_40px_rgba(79,70,229,0.5)] active:scale-95 transition-all group"
              >
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2 rounded-xl group-hover:rotate-12 transition-transform">
                    <ShoppingCart size={20} strokeWidth={2.5} />
                  </div>
                  <div className="flex flex-col items-start leading-none">
                    <span className="text-[10px] text-indigo-100 uppercase tracking-widest font-black mb-1">Items in Cart</span>
                    <span className="text-sm">{totalItems} {totalItems === 1 ? 'Delicious Item' : 'Delicious Items'}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="uppercase text-xs tracking-widest font-black">View Cart</span>
                  <div className="w-6 h-6 bg-white/20 rounded-full flex items-center justify-center group-hover:translate-x-1 transition-transform">
                    <ArrowLeft size={14} className="rotate-180" strokeWidth={3} />
                  </div>
                </div>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default CustomerLayout;
