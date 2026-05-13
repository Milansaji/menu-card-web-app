import React, { useState, useEffect } from 'react';
import { useCart } from '../../contexts/CartContext';
import { db } from '../../firebase/firebase';
import { doc, getDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';
import { CheckCircle2, Receipt, ArrowLeft, Loader2, Hash } from 'lucide-react';
import Button from '../../components/Button';
import Card from '../../components/Card';
import { toast } from 'react-hot-toast';

const Checkout = () => {
  const { cart, clearCart, tableNumber } = useCart();
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
      const docSnap = await getDoc(doc(db, 'settings', 'config'));
      if (docSnap.exists()) setSettings(docSnap.data());
    };
    fetchSettings();
  }, []);

  if (!settings && !orderPlaced) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-gray-100 rounded-lg animate-pulse" />
        <div className="h-48 bg-gray-100 rounded-3xl animate-pulse" />
        <div className="h-32 bg-gray-100 rounded-3xl animate-pulse" />
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
    if (!settings) return toast.error('Error loading settings. Please try again.');
    if (isOffline) return toast.error('You are offline. Please check your connection.');
    
    try {
      setLoading(true);
      
      // 1. PRICE VERIFICATION (Anti-Tampering)
      // Re-fetch items from DB to ensure prices are correct
      const verifiedItems = [];
      let verifiedSubtotal = 0;
      let totalTax = 0;

      for (const item of cart) {
        const productSnap = await getDoc(doc(db, 'products', item.id));
        if (!productSnap.exists() || !productSnap.data().isAvailable) {
          throw new Error(`Item ${item.name} is no longer available.`);
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

      // 2. ROBUST INVOICE GENERATION
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
        status: 'pending'
      };

      const docRef = await addDoc(collection(db, 'bills'), billData);
      
      const previousOrders = JSON.parse(localStorage.getItem('myOrders') || '[]');
      localStorage.setItem('myOrders', JSON.stringify([...previousOrders, docRef.id]));

      setBillDetails(billData);
      setOrderPlaced(true);
      clearCart();
      toast.success('Order placed successfully!');
    } catch (error) {
      console.error(error);
      toast.error(error.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  if (orderPlaced) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center animate-in zoom-in duration-500">
        <div className="w-24 h-24 bg-green-100 text-green-600 rounded-full flex items-center justify-center mb-6">
          <CheckCircle2 size={56} />
        </div>
        <h1 className="text-3xl font-black text-gray-900 tracking-tight">Order Placed!</h1>
        <p className="text-gray-500 mt-2 mb-8">Your order has been sent to the kitchen. Please wait while we prepare your meal.</p>
        
        <Card className="w-full max-w-sm border-dashed border-2 border-gray-200 bg-gray-50 mb-8" padding="p-6">
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200 border-dashed">
            <span className="text-sm text-gray-500 font-medium">Invoice Number</span>
            <span className="font-bold text-gray-900">#{billDetails?.invoiceNumber}</span>
          </div>
          <div className="space-y-2">
            {billDetails?.items.map((item, i) => (
              <div key={i} className="flex justify-between text-sm">
                <span className="text-gray-600">{item.name} x {item.quantity}</span>
                <span className="font-medium text-gray-900">₹{item.price * item.quantity}</span>
              </div>
            ))}
          </div>
          <div className="pt-4 mt-4 border-t border-gray-200 border-dashed">
            <div className="flex justify-between text-xl font-black text-indigo-600">
              <span>Total Paid</span>
              <span>₹{billDetails?.totalAmount?.toFixed(2)}</span>
            </div>
          </div>
        </Card>

        <Button onClick={() => navigate('/menu/main')} variant="outline" className="px-8">
          Back to Menu
        </Button>
      </div>
    );
  }

  const totals = calculateTotals();

  return (
    <div className="p-6 space-y-6 animate-in slide-in-from-right-4 duration-500 pb-32">
      {isOffline && (
        <div className="bg-red-500 text-white p-3 rounded-2xl text-center text-sm font-bold animate-pulse">
          You are currently offline. Some features may not work.
        </div>
      )}
      <header className="flex items-center gap-4">
        <button onClick={() => navigate(-1)} className="p-2 hover:bg-gray-100 rounded-full">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-2xl font-black tracking-tight">Order Summary</h1>
      </header>

      <Card className="space-y-4" padding="p-6">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <Receipt className="text-indigo-600" size={20} />
          Bill Breakdown
        </h2>
        <div className="space-y-3">
          <div className="flex justify-between text-gray-600">
            <span>Items Total</span>
            <span className="font-medium">₹{calculateSubtotal()}</span>
          </div>
          {settings && (
            <>
              <div className="flex justify-between text-gray-500 text-sm">
                <span>CGST</span>
                <span>₹{totals.cgst?.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-gray-500 text-sm">
                <span>SGST</span>
                <span>₹{totals.sgst?.toFixed(2)}</span>
              </div>
            </>
          )}
          <div className="flex justify-between text-xl font-black text-gray-900 pt-4 border-t border-gray-100">
            <span>Amount to Pay</span>
            <span className="text-indigo-600">₹{totals.totalAmount?.toFixed(2)}</span>
          </div>
        </div>
      </Card>
      
      {/* Suggestions */}
      <Card className="space-y-3" padding="p-6">
        <h2 className="font-bold text-gray-900 flex items-center gap-2">
          <Hash className="text-indigo-600" size={20} />
          Special Instructions
        </h2>
        <textarea
          placeholder="e.g. Make it extra spicy, No onions, etc."
          className="w-full p-4 bg-gray-50 border-none rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-sm min-h-[100px] shadow-inner"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />
      </Card>

      <div className="bg-indigo-50 p-4 rounded-2xl flex gap-3 items-start">
        <div className="p-1.5 bg-indigo-100 text-indigo-600 rounded-lg">
          <Receipt size={16} />
        </div>
        <div>
          <h4 className="text-sm font-bold text-indigo-900">Payment Notice</h4>
          <p className="text-xs text-indigo-700 mt-1 leading-relaxed">
            Please pay the amount at the counter after finishing your meal. Show your invoice number for quick processing.
          </p>
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 p-6 bg-white border-t border-gray-100 z-50">
        <Button 
          className="w-full py-4 text-lg font-black shadow-xl shadow-indigo-100 flex items-center justify-center gap-3"
          onClick={handlePlaceOrder}
          disabled={loading || cart.length === 0}
        >
          {loading ? (
            <>
              <Loader2 className="animate-spin" size={20} />
              Processing...
            </>
          ) : (
            'Confirm Order'
          )}
        </Button>
      </div>
    </div>
  );
};

export default Checkout;
