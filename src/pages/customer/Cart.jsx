import React from 'react';
import { useCart } from '../../contexts/CartContext';
import { Link, useNavigate } from 'react-router-dom';
import { Trash2, Plus, Minus, ArrowLeft, ShoppingBag } from 'lucide-react';
import Button from '../../components/Button';
import Card from '../../components/Card';

const Cart = () => {
  const { cart, totalItems, updateQuantity, removeFromCart } = useCart();
  const navigate = useNavigate();

  const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  if (cart.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center animate-in fade-in duration-500">
        <div className="w-24 h-24 bg-gray-100 rounded-full flex items-center justify-center text-gray-300 mb-6">
          <ShoppingBag size={48} />
        </div>
        <h2 className="text-2xl font-black text-gray-900">Your cart is empty</h2>
        <p className="text-gray-500 mt-2 mb-8">Add some delicious items from the menu to get started!</p>
        <Link to="/menu/main">
          <Button className="px-8 py-3">Back to Menu</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-in slide-in-from-right-4 duration-500 pb-32">
      <header className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-black tracking-tight">Your Cart</h1>
      </header>

      <div className="space-y-4">
        {cart.map(item => (
          <Card key={item.id} className="flex items-center gap-4 p-3" padding="p-3">
            <div className="w-20 h-20 bg-gray-100 rounded-xl overflow-hidden flex-shrink-0">
              {item.imageUrl && <img src={item.imageUrl} alt={item.name} className="w-full h-full object-cover" />}
            </div>
            <div className="flex-1 flex flex-col justify-between py-1">
              <div className="flex justify-between items-start">
                <h3 className="font-bold text-gray-900 line-clamp-1">{item.name}</h3>
                <button 
                  onClick={() => removeFromCart(item.id)}
                  className="text-gray-400 hover:text-red-500"
                >
                  <Trash2 size={18} />
                </button>
              </div>
              <div className="flex items-center justify-between mt-2">
                <span className="text-indigo-600 font-bold">₹{item.price * item.quantity}</span>
                <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-1">
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity - 1)}
                    className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-gray-600 active:scale-90 transition-all"
                  >
                    <Minus size={16} />
                  </button>
                  <span className="font-bold w-4 text-center">{item.quantity}</span>
                  <button 
                    onClick={() => updateQuantity(item.id, item.quantity + 1)}
                    className="w-8 h-8 flex items-center justify-center bg-white rounded-lg shadow-sm text-gray-600 active:scale-90 transition-all"
                  >
                    <Plus size={16} />
                  </button>
                </div>
              </div>
            </div>
          </Card>
        ))}
      </div>

      {/* Summary */}
      <Card className="bg-gray-50 border-none space-y-4" padding="p-6">
        <div className="flex justify-between items-center text-gray-600">
          <span className="font-medium">Total Items</span>
          <span className="font-bold text-gray-900">{totalItems}</span>
        </div>
        <div className="flex justify-between items-center text-xl font-black pt-4 border-t border-gray-200">
          <span className="text-gray-900">Subtotal</span>
          <span className="text-indigo-600">₹{subtotal}</span>
        </div>
        <p className="text-xs text-gray-400 text-center italic">GST and other charges will be applied at checkout.</p>
      </Card>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-100 z-50">
        <Button 
          className="w-full py-4 text-lg font-black shadow-xl shadow-indigo-100"
          onClick={() => navigate('/checkout')}
        >
          Proceed to Checkout
        </Button>
      </div>
    </div>
  );
};

export default Cart;
