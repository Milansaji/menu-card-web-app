import React, { useState, useEffect } from 'react';
import { useCart } from '../../contexts/CartContext';
import { db } from '../../firebase/firebase';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { 
  CheckCircle2, Receipt, ArrowLeft, Loader2, Hash, Sparkles, 
  CreditCard, ShieldCheck, Heart, ShoppingBag, ChefHat, 
  Utensils, Info, MapPin, Tag, ArrowRight
} from 'lucide-react';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { toast } from 'react-hot-toast';

const Checkout = () => {
  const { cart, clearCart, tableNumber } = useCart();
  const [settings, setSettings] = useState(null);
  const [placingOrder, setPlacingOrder] = useState(false);
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
      <div className="p-8 space-y-8 min-h-screen bg-white">
        <div className="h-10 w-48 bg-gray-50 rounded-2xl animate-pulse" />
        <div className="h-64 bg-gray-50 rounded-[2.5rem] animate-pulse" />
        <div className="h-40 bg-gray-50 rounded-[2.5rem] animate-pulse" />
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
        totalBase += base;
        totalTax += (lineTotal - base);
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
    if (!settings) return toast.error('Syncing...');
    if (isOffline) return toast.error('Connection lost');
    if (cart.length === 0) return toast.error('Cart is empty');
    
    try {
      setPlacingOrder(true);
      const verifiedItems = [];
      let verifiedSubtotal = 0;
      let totalTax = 0;

      for (const item of cart) {
        const productSnap = await getDoc(doc(db, 'products', item.id));
        if (!productSnap.exists() || !productSnap.data().isAvailable) {
          throw new Error(`"${item.name}" is sold out`);
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
        customerName: tableNumber ? `Table ${tableNumber}` : 'Guest',
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
      
      const existingHistory = localStorage.getItem('myOrders');
      let orderHistory = [];
      try {
        orderHistory = existingHistory ? JSON.parse(existingHistory) : [];
        if (!Array.isArray(orderHistory)) orderHistory = [];
      } catch (e) { orderHistory = []; }
      
      const updatedHistory = [...orderHistory, docRef.id];
      localStorage.setItem('myOrders', JSON.stringify(updatedHistory));

      await new Promise(resolve => setTimeout(resolve, 2000));

      setBillDetails(billData);
      setOrderPlaced(true);
      clearCart();
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Placement failed');
    } finally {
      setPlacingOrder(false);
    }
  };

  if (placingOrder) {
    return (
      <div className="fixed inset-0 bg-white z-[100] flex flex-col items-center justify-center p-8 text-center animate-in fade-in duration-500">
        <div className="relative mb-12">
          <div className="w-32 h-32 border-4 border-indigo-100 border-t-indigo-600 rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center text-indigo-600">
            <ChefHat size={48} className="animate-bounce" />
          </div>
        </div>
        <h2 className="text-3xl font-black text-gray-900 tracking-tighter uppercase mb-4">Securing your meal</h2>
        <p className="text-gray-400 font-bold text-xs uppercase tracking-[0.2em] animate-pulse">Handshaking with Kitchen...</p>
      </div>
    );
  }

  if (orderPlaced) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8 text-center animate-in fade-in zoom-in-95 duration-700">
        <div className="relative mb-10 group">
          <div className="absolute inset-0 bg-emerald-500/20 blur-3xl rounded-full group-hover:scale-150 transition-transform duration-1000" />
          <div className="relative w-28 h-28 bg-emerald-500 text-white rounded-[2.5rem] flex items-center justify-center shadow-2xl shadow-emerald-500/40 transform rotate-6 hover:rotate-0 transition-all duration-500">
            <CheckCircle2 size={64} strokeWidth={2.5} />
          </div>
        </div>
        <h1 className="text-4xl font-black text-gray-900 tracking-tighter uppercase leading-none mb-4">It's a Date!</h1>
        <p className="text-gray-500 font-medium max-w-xs mx-auto mb-10">We've received your order. Our culinary team is already working their magic.</p>
        <Card className="w-full max-w-sm border-dashed border-2 border-indigo-100 bg-indigo-50/20 rounded-[2.5rem] mb-10 overflow-hidden relative" padding="p-8">
          <div className="flex justify-between items-center mb-6 pb-6 border-b border-indigo-100 border-dashed">
            <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest">Order ID</span>
            <span className="font-black text-indigo-600 tracking-tight">#{billDetails?.invoiceNumber}</span>
          </div>
          <div className="space-y-4">
            {billDetails?.items.map((item, i) => (
              <div key={i} className="flex justify-between text-xs font-bold">
                <span className="text-gray-600 uppercase tracking-tight">{item.name} <span className="text-gray-400 ml-1">×{item.quantity}</span></span>
                <span className="text-gray-900">₹{(item.price * item.quantity).toLocaleString()}</span>
              </div>
            ))}
          </div>
          <div className="pt-6 mt-6 border-t border-indigo-100 border-dashed text-right">
            <span className="text-[10px] text-gray-400 font-black uppercase tracking-widest block mb-1">Total</span>
            <span className="text-3xl font-black text-indigo-600 tracking-tighter leading-none">₹{billDetails?.totalAmount?.toLocaleString()}</span>
          </div>
        </Card>
        <div className="flex flex-col gap-4 w-full max-w-xs">
          <Button onClick={() => navigate('/track-order')} className="w-full py-5 rounded-2xl shadow-2xl shadow-indigo-200 text-xs font-black uppercase tracking-widest">Track Status</Button>
          <Button onClick={() => navigate('/menu/main')} variant="secondary" className="w-full py-4 rounded-2xl text-[10px] font-black uppercase tracking-widest text-gray-400">Keep Browsing</Button>
        </div>
      </div>
    );
  }

  const totals = calculateTotals();

  return (
    <div className="min-h-screen bg-gray-50/30 pb-44">
      {/* Sticky Header */}
      <header className="sticky top-0 z-40 bg-white/80 backdrop-blur-xl border-b border-gray-100 px-6 py-6 flex items-center justify-between">
        <div className="flex items-center gap-5">
          <button onClick={() => navigate(-1)} className="w-10 h-10 flex items-center justify-center bg-gray-50 rounded-xl active:scale-90 transition-all">
            <ArrowLeft size={20} strokeWidth={2.5} />
          </button>
          <div>
            <h1 className="text-xl font-black text-gray-900 tracking-tighter uppercase leading-none">Checkout</h1>
            <p className="text-[9px] text-gray-400 font-black uppercase tracking-widest mt-1">Review your order</p>
          </div>
        </div>
        <div className="flex items-center gap-2 px-3 py-1.5 bg-indigo-50 rounded-lg border border-indigo-100">
          <MapPin size={12} className="text-indigo-600" />
          <span className="text-[10px] font-black text-indigo-600 uppercase">Table {tableNumber || 'N/A'}</span>
        </div>
      </header>

      <div className="p-6 space-y-8 max-w-2xl mx-auto">
        {/* Order Items List */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 ml-1">
            <Utensils size={18} className="text-gray-400" />
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Ordered Items</h2>
          </div>
          <Card className="rounded-[2.5rem] border-none shadow-[0_20px_50px_rgba(0,0,0,0.02)]" padding="p-0 overflow-hidden">
            <div className="divide-y divide-gray-50">
              {cart.map((item) => (
                <div key={item.id} className="p-6 flex items-center justify-between group bg-white hover:bg-gray-50/50 transition-colors">
                  <div className="flex items-center gap-5">
                    <div className="w-12 h-12 bg-gray-50 rounded-2xl flex items-center justify-center font-black text-gray-300 text-xs">
                      {item.quantity}×
                    </div>
                    <div>
                      <h4 className="text-sm font-black text-gray-900 uppercase tracking-tight">{item.name}</h4>
                      <p className="text-[10px] text-gray-400 font-bold tracking-widest">₹{item.price.toLocaleString()} each</p>
                    </div>
                  </div>
                  <p className="font-black text-gray-900 tracking-tighter">₹{(item.price * item.quantity).toLocaleString()}</p>
                </div>
              ))}
            </div>
          </Card>
        </section>

        {/* Special Instructions */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 ml-1">
            <Sparkles size={18} className="text-gray-400" />
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Chef Instructions</h2>
          </div>
          <textarea
            placeholder="e.g. Less spicy, No onion, allergens..."
            className="w-full p-6 bg-white border border-transparent rounded-[2rem] focus:ring-4 focus:ring-indigo-100 outline-none text-sm font-medium min-h-[120px] transition-all shadow-[0_15px_35px_rgba(0,0,0,0.02)]"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </section>

        {/* Bill Breakdown */}
        <section className="space-y-4">
          <div className="flex items-center gap-3 ml-1">
            <Receipt size={18} className="text-gray-400" />
            <h2 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Bill Details</h2>
          </div>
          <Card className="p-8 rounded-[2.5rem] border-none shadow-[0_20px_50px_rgba(0,0,0,0.03)] bg-white" padding="p-8">
            <div className="space-y-4">
              <div className="flex justify-between text-xs font-bold text-gray-500 uppercase tracking-tight">
                <span>Subtotal</span>
                <span className="text-gray-900">₹{calculateSubtotal().toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-[10px] font-bold text-gray-400 uppercase tracking-widest">
                <span>GST (CGST + SGST)</span>
                <span>₹{(totals.cgst + totals.sgst).toLocaleString()}</span>
              </div>
              <div className="pt-6 mt-2 border-t border-gray-100 flex justify-between items-end">
                <div className="flex flex-col">
                  <span className="text-[10px] text-indigo-400 font-black uppercase tracking-[0.2em] leading-none mb-1.5">Grand Total</span>
                  <span className="text-4xl font-black text-indigo-600 tracking-tighter leading-none">₹{totals.totalAmount?.toLocaleString()}</span>
                </div>
                <div className="flex items-center gap-2 text-emerald-500 font-black text-[10px] uppercase tracking-widest bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-100">
                  <ShieldCheck size={14} />
                  Secure
                </div>
              </div>
            </div>
          </Card>
        </section>

        {/* Payment Policy */}
        <div className="bg-linear-to-br from-gray-900 to-indigo-900 p-8 rounded-[2.5rem] text-white flex gap-6 items-start shadow-xl shadow-indigo-100">
          <div className="w-12 h-12 bg-white/10 rounded-2xl flex items-center justify-center shrink-0 border border-white/5 backdrop-blur-md">
            <CreditCard size={24} className="text-indigo-300" />
          </div>
          <div>
            <h4 className="text-sm font-black uppercase tracking-widest mb-1.5">Pay Post-Meal</h4>
            <p className="text-[10px] text-indigo-200 font-bold leading-relaxed opacity-70 tracking-tight">
              Enjoy your meal first. Settle the bill at the reception desk before leaving.
            </p>
          </div>
        </div>
      </div>

      {/* Sticky Bottom Bar */}
      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white/90 backdrop-blur-2xl border-t border-gray-100 z-50">
        <div className="max-w-2xl mx-auto flex items-center justify-between gap-6">
          <div className="hidden @[400px]:flex flex-col">
            <span className="text-[9px] text-gray-400 font-black uppercase tracking-widest leading-none mb-1.5">Total Amount</span>
            <span className="text-2xl font-black text-gray-900 tracking-tighter leading-none">₹{totals.totalAmount?.toLocaleString()}</span>
          </div>
          <Button 
            className="flex-1 py-5 rounded-2xl shadow-2xl shadow-indigo-200 flex items-center justify-center gap-4 group active:scale-95 text-xs font-black uppercase tracking-widest"
            onClick={handlePlaceOrder}
            disabled={placingOrder || cart.length === 0}
          >
            Place Order
            <ArrowRight size={18} className="group-hover:translate-x-1 transition-transform" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
