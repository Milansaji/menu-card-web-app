import React from 'react';
import { useCart } from '../../contexts/CartContext';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowLeft, ShoppingBag, Sparkles } from 'lucide-react';
import Button from '../../components/Button';
import Card from '../../components/Card';

const Cart = () => {
  const { cart, totalItems, updateQuantity, removeFromCart } = useCart();
  const navigate = useNavigate();

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-700 max-w-sm mx-auto">
        <div className="relative w-32 h-32 mb-10">
          <div className="absolute inset-0 bg-indigo-100 rounded-full animate-ping opacity-20" />
          <div className="relative w-32 h-32 bg-linear-to-br from-indigo-50 to-indigo-100 rounded-full flex items-center justify-center text-indigo-400 shadow-inner">
            <ShoppingBag size={64} strokeWidth={1.5} />
          </div>
        </div>
        <div className="space-y-3">
          <h2 className="text-3xl font-black text-gray-900 uppercase tracking-tighter">Your cart is empty</h2>
          <p className="text-gray-500 font-medium px-4">Seems like you haven't decided on your feast yet. Browse our menu for inspiration!</p>
        </div>
        <Link to="/menu/main" className="pt-8 w-full">
          <Button variant="primary" className="w-full py-5 shadow-xl shadow-indigo-100">
            Discover Flavors
          </Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 animate-in slide-in-from-right-8 duration-700 pb-40 max-w-2xl mx-auto">
      <header className="flex items-center gap-5">
        <button onClick={() => navigate(-1)} className="p-3 bg-white border border-gray-100 rounded-2xl shadow-sm hover:shadow-md active:scale-90 transition-all">
          <ArrowLeft size={24} className="text-gray-900" />
        </button>
        <div>
          <h1 className="text-3xl font-black tracking-tighter text-gray-900 uppercase leading-none">Your Cart</h1>
          <p className="text-[10px] text-gray-400 font-black uppercase tracking-widest mt-1">{totalItems} {totalItems === 1 ? 'Item' : 'Items'} selected</p>
        </div>
      </header>

      <div className="space-y-5">
        {cart.map((item, index) => (
          <Card 
            key={item.id} 
            className="flex items-center gap-5 p-4 border-none shadow-[0_15px_40px_rgba(0,0,0,0.03)] hover:shadow-[0_20px_50px_rgba(0,0,0,0.06)] transition-all duration-500 animate-in fade-in slide-in-from-bottom-8 fill-mode-both" 
            padding="p-4"
            style={{ animationDelay: `${index * 100}ms` }}
          >
            <div className="w-24 h-24 bg-gray-50 rounded-[1.5rem] overflow-hidden flex-shrink-0 relative group">
              {item.imageUrl ? (
                <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-200">
                  <ShoppingBag size={32} />
                </div>
              )}
            </div>
            <div className="flex-1 flex flex-col justify-between py-1">
              <div className="flex justify-between items-start">
                <h3 className="font-black text-gray-900 text-lg leading-tight">{item.name}</h3>
                <button 
                  onClick={() => removeFromCart(item.id)}
                  className="p-2 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded-xl transition-all active:scale-90"
                  aria-label={`Remove ${item.name}`}
                >
                  <Trash2 size={20} />
                </button>
              </div>
              <div className="flex items-center justify-between mt-4">
                <span className="text-xl font-black text-indigo-600 tracking-tighter">₹{item.price * item.quantity}</span>
                <div className="flex items-center gap-4 bg-gray-50/50 p-1.5 rounded-2xl border border-gray-100/50">
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-gray-600 active:scale-90 hover:text-indigo-600 transition-all border border-gray-100"
                    aria-label="Decrease quantity"
                  >
                    <Minus size={18} strokeWidth={3} />
                  </button>
                  <span className="font-black w-6 text-center text-gray-900">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-10 h-10 flex items-center justify-center bg-white rounded-xl shadow-sm text-gray-600 active:scale-90 hover:text-indigo-600 transition-all border border-gray-100"
                    aria-label="Increase quantity"
                  >
                    <Plus size={18} strokeWidth={3} />
                  </button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Summary */}
      <Card className="bg-white border-none shadow-[0_20px_50px_rgba(0,0,0,0.05)] space-y-6 rounded-[2.5rem] relative overflow-hidden" padding="p-8">
        <div className="absolute top-0 right-0 p-6 text-indigo-50 opacity-50">
          <Sparkles size={100} />
        </div>
        <div className="relative z-10 space-y-6">
          <div className="space-y-3">
            <div className="flex justify-between items-center text-gray-500 font-bold uppercase text-[10px] tracking-widest">
              <span>Total Items</span>
              <span className="text-gray-900 text-sm">{totalItems}</span>
            </div>
            <div className="flex justify-between items-center text-gray-500 font-bold uppercase text-[10px] tracking-widest">
              <span>Subtotal</span>
              <span className="text-gray-900 text-sm">₹{subtotal}</span>
            </div>
          </div>
          
          <div className="pt-6 border-t border-gray-100 flex justify-between items-center">
            <div>
              <p className="text-[10px] text-gray-400 font-black uppercase tracking-[0.2em] mb-1">Final Amount</p>
              <h2 className="text-4xl font-black text-transparent bg-clip-text bg-linear-to-r from-indigo-600 to-violet-700 tracking-tighter">₹{subtotal}</h2>
            </div>
            <div className="bg-indigo-50 text-indigo-600 px-4 py-2 rounded-2xl font-black text-[10px] uppercase tracking-widest border border-indigo-100">
              Tax Included
            </div>
          </div>
          <p className="text-xs text-gray-400 text-center font-medium italic">Service charge and GST are already included in the price.</p>
        </div>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 p-6 glass border-t border-white/20 z-50">
        <Button 
          className="w-full py-5 text-xl font-black shadow-2xl shadow-indigo-200 uppercase tracking-widest"
          onClick={() => navigate('/checkout')}
        >
          Checkout Order
        </Button>
      </div>
    </div>
  );
};

export default Cart;
