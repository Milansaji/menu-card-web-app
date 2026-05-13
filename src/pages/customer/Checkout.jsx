import React, { useState, useEffect } from 'react';
import { useCart } from '../../contexts/CartContext';
import { db } from '../../firebase/firebase';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Receipt, ArrowLeft, Loader2, Hash, Sparkles, CreditCard, ShieldCheck } from 'lucide-react';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { toast } from 'react-hot-toast';

const Checkout = () => {
  const { cart, clearCart, tableNumber } = useCart();
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [billDetails, setBillDetails] = useState(null);
  const [notes, setNotes] = useState('');
  const [isOffline, setIsOffline] = useState(!navigator.onLine);
  const navigate = useNavigate();

  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        const docSnap = await getDoc(doc(db, 'settings', 'config'));
        if (docSnap.exists()) setSettings(docSnap.data());
      } catch (err) {
        console.error("Settings fetch failed:", err);
      }
    };
    fetchSettings();
  }, []);

  if (!settings && !orderPlaced) {
    return (
      <div className="p-8 space-y-8 min-h-screen bg-gray-50/50">
        <div className="h-10 w-48 bg-gray-200 rounded-2xl animate-pulse" />
        <div className="h-64 bg-gray-200 rounded-[2.5rem] animate-pulse" />
        <div className="h-40 bg-gray-200 rounded-[2.5rem] animate-pulse" />
      </div>
    );
  }

  const calculateSubtotal = () => cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);

  const calculateTotals = () => {
    const isInclusive = settings?.gstMode === 'inclusive';
    
    let totalTax = 0;
    let totalBase = 0;
    let finalAmount = 0;

    cart.forEach(item => {
      const itemGst = Number(item.gstPercent || 0);
      const lineTotal = item.price * item.quantity;
      
      if (isInclusive) {
        const base = lineTotal / (1 + itemGst / 100);
        const tax = lineTotal - base;
        totalBase += base;
        totalTax += tax;
        finalAmount += lineTotal;
      } else {
        const tax = lineTotal * (itemGst / 100);
        totalBase += lineTotal;
        totalTax += tax;
        finalAmount += (lineTotal + tax);
      }
    });

    return {
      subtotal: totalBase,
      cgst: totalTax / 2,
      sgst: totalTax / 2,
      totalAmount: finalAmount
    };
  };

  const handlePlaceOrder = async () => {
    if (!settings) return toast.error('System settings syncing...');
    if (isOffline) return toast.error('Network unavailable');
    if (cart.length === 0) return toast.error('Your cart is empty');
    
    try {
      setLoading(true);
      
      const verifiedItems = [];
      let verifiedSubtotal = 0;
      let totalTax = 0;

      for (const item of cart) {
        const productSnap = await getDoc(doc(db, 'products', item.id));
        if (!productSnap.exists() || !productSnap.data().isAvailable) {
          throw new Error(`"${item.name}" is currently unavailable.`);
        }
        
        const dbProduct = productSnap.data();
        const price = Number(dbProduct.price);
        const gst = Number(dbProduct.gstPercent || 0);
        const lineTotal = price * item.quantity;
        
        verifiedItems.push({
          name: dbProduct.name,
          price: price,
          quantity: item.quantity,
          cookingTime: dbProduct.cookingTime || 15
        });

        if (settings.gstMode === 'inclusive') {
          const base = lineTotal / (1 + gst / 100);
          verifiedSubtotal += base;
          totalTax += (lineTotal - base);
        } else {
          verifiedSubtotal += lineTotal;
          totalTax += (lineTotal * (gst / 100));
        }
      }

      const finalAmount = settings.gstMode === 'inclusive' 
        ? verifiedItems.reduce((acc, i) => acc + (i.price * i.quantity), 0)
        : verifiedSubtotal + totalTax;

      const randomStr = Math.random().toString(36).substring(2, 5).toUpperCase();
      const invoiceNumber = `INV-${randomStr}-${Date.now().toString().slice(-4)}`;
      
      const billData = {
        invoiceNumber,
        customerName: tableNumber ? `Table ${tableNumber}` : 'Self Order',
        tableNumber: tableNumber || 'N/A',
        notes: notes,
        items: verifiedItems,
        totalCookingTime: Math.max(...verifiedItems.map(item => Number(item.cookingTime || 15))),
        subtotal: verifiedSubtotal,
        cgst: totalTax / 2,
        sgst: totalTax / 2,
        totalAmount: finalAmount,
        date: serverTimestamp(),
        status: 'pending',
        deliveryStatus: 'Received'
      };

      const docRef = await addDoc(collection(db, 'bills'), billData);
      
      const previousOrders = JSON.parse(localStorage.getItem('myOrders') || '[]');
      localStorage.setItem('myOrders', JSON.stringify([...previousOrders, docRef.id]));

      setBillDetails(billData);
      setOrderPlaced(true);
      clearCart();
      toast.success('Order synchronized with kitchen!', {
        icon: '🍳',
        style: { borderRadius: '1rem', background: '#333', color: '#fff' }
      });
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Transmission failed');
    } finally {
      setLoading(false);
    }
  };

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-700">
        <div className="relative mb-10">
          <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full animate-pulse" />
          <div className="relative w-28 h-28 bg-emerald-500 text-white rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-emerald-500/40">
            <CheckCircle2 size={64} strokeWidth={2.5} />
          </div>
        </div>
        
        <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase leading-none mb-4">Order Received!</h1>
        <p className="text-gray-500 font-medium max-w-xs mx-auto mb-10">Your culinary journey has begun. Our chefs are now preparing your meal with care.</p>
        
        <Card className="w-full max-w-sm border-dashed border-2 border-gray-100 bg-gray-50/50 rounded-[2.5rem] mb-10 overflow-hidden" padding="p-8">
          <div className="flex justify-between items-center mb-6 pb-6 border-b border-gray-200 border-dashed">
            <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Digital Invoice</span>
            <span className="font-black text-indigo-600 tracking-tight">#{billDetails?.invoiceNumber}</span>
          </div>
          <div className="space-y-4">
            {billDetails?.items.map((item, i) => (
              <div key={i} className="flex justify-between text-xs font-bold">
                <span className="text-gray-500 uppercase tracking-tight">{item.name} <span className="text-gray-400 ml-1">×{item.quantity}</span></span>
                <span className="text-gray-900">₹{(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="pt-6 mt-6 border-t border-gray-200 border-dashed">
            <div className="flex justify-between items-end">
              <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Grand Total</span>
              <span className="text-3xl font-black text-indigo-600 tracking-tighter leading-none">₹{billDetails?.totalAmount?.toLocaleString()}</span>
            </div>
          </div>
        </Card>

        <div className="flex flex-col gap-4 w-full max-w-xs">
          <Button onClick={() => navigate('/menu/track')} className="w-full py-5 rounded-2xl shadow-xl shadow-indigo-100">
            Track Order Live
          </Button>
          <Button onClick={() => navigate('/menu/main')} variant="secondary" className="w-full py-4 rounded-2xl">
            Return to Menu
          </Button>
        </div>
      </div>
    );
  }

  const totals = calculateTotals();

  return (
    <div className="p-8 space-y-10 animate-in fade-in slide-in-from-bottom-8 duration-1000 pb-40 min-h-screen bg-gray-50/30">
      {isOffline && (
        <div className="bg-rose-500 text-white p-4 rounded-2xl text-center text-[10px] font-black uppercase tracking-[0.2em] shadow-lg shadow-rose-200 animate-pulse">
          Connection Interrupted • Re-syncing...
        </div>
      )}
      
      <header className="flex items-center gap-6">
        <button 
          onClick={() => navigate(-1)} 
          className="w-12 h-12 flex items-center justify-center bg-white border border-gray-100 rounded-2xl shadow-sm active:scale-90 transition-all"
        >
          <ArrowLeft size={24} strokeWidth={2.5} />
        </button>
        <div>
          <h1 className="text-3xl font-black text-gray-900 tracking-tighter uppercase leading-none">Checkout</h1>
          <p className="text-gray-400 text-xs font-bold uppercase tracking-widest mt-1">Order Validation</p>
        </div>
      </header>

      <div className="space-y-8">
        {/* Bill Details */}
        <Card className="p-8 rounded-[2.5rem] border-none shadow-[0_20px_50px_rgba(0,0,0,0.03)]" padding="p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
              <Receipt size={22} strokeWidth={2.5} />
            </div>
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">Investment Summary</h2>
          </div>
          
          <div className="space-y-5">
            <div className="flex justify-between text-sm font-bold text-gray-500 uppercase tracking-tight">
              <span>Items Subtotal</span>
              <span className="text-gray-900">₹{calculateSubtotal().toLocaleString()}</span>
            </div>
            {settings && (
              <>
                <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-widest">
                  <span>Service CGST</span>
                  <span>₹{totals.cgst?.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-xs font-bold text-gray-400 uppercase tracking-widest">
                  <span>Service SGST</span>
                  <span>₹{totals.sgst?.toLocaleString()}</span>
                </div>
              </>
            )}
            <div className="pt-8 mt-4 border-t border-gray-100 flex justify-between items-end">
              <div className="flex flex-col">
                <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1">Payable Amount</span>
                <span className="text-4xl font-black text-indigo-600 tracking-tighter leading-none">₹{totals.totalAmount?.toLocaleString()}</span>
              </div>
              <ShieldCheck className="text-emerald-500 mb-1" size={24} />
            </div>
          </div>
        </Card>
        
        {/* Customization */}
        <Card className="p-8 rounded-[2.5rem] border-none shadow-[0_20px_50px_rgba(0,0,0,0.03)]" padding="p-8">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 bg-amber-50 text-amber-600 rounded-xl flex items-center justify-center">
              <Sparkles size={22} strokeWidth={2.5} />
            </div>
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">Special Requests</h2>
          </div>
          <textarea
            placeholder="e.g. Extra spicy, No cilantro, allergens..."
            className="w-full p-6 bg-gray-50/50 border border-transparent rounded-[1.5rem] focus:bg-white focus:border-indigo-100 focus:ring-4 focus:ring-indigo-50 outline-none text-sm font-medium min-h-[120px] transition-all"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </Card>

        {/* Security / Payment Notice */}
        <div className="bg-linear-to-br from-indigo-600 to-violet-700 p-8 rounded-[2.5rem] text-white flex gap-6 items-start shadow-xl shadow-indigo-200">
          <div className="w-12 h-12 bg-white/20 rounded-2xl flex items-center justify-center shrink-0">
            <CreditCard size={24} />
          </div>
          <div>
            <h4 className="text-sm font-black uppercase tracking-widest mb-2">Post-Dining Settlement</h4>
            <p className="text-xs text-indigo-100 font-medium leading-relaxed opacity-80">
              For your convenience, we follow a post-meal payment policy. Simply present your digital invoice at the concierge desk after your meal.
            </p>
          </div>
        </div>
      </div>

      {/* Floating Action Button */}
      <div className="fixed bottom-0 left-0 right-0 p-8 bg-linear-to-t from-white via-white/90 to-transparent z-50">
        <Button 
          className="w-full py-6 text-xs font-black uppercase tracking-[0.2em] shadow-2xl shadow-indigo-200 flex items-center justify-center gap-4 group active:scale-95"
          onClick={handlePlaceOrder}
          disabled={loading || cart.length === 0}
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Securing Order...
            </>
          ) : (
            <>
              Send to Kitchen
              <Sparkles className="group-hover:rotate-12 transition-transform" size={18} />
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default Checkout;
