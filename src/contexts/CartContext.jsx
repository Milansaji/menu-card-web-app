import React, { createContext, useContext, useState, useEffect, useMemo, useCallback } from 'react';

const CartContext = createContext();

export function useCart() {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart must be used within a CartProvider');
  return context;
}

export function CartProvider({ children }) {
  // Initialize state from localStorage
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('currentCart') || '[]'));
  const [tableNumber, setTableNumber] = useState(() => localStorage.getItem('currentTable'));
  const [isTableLocked, setIsTableLocked] = useState(() => localStorage.getItem('tableLocked') === 'true');

  // Sync with LocalStorage
  useEffect(() => {
    localStorage.setItem('currentCart', JSON.stringify(cart));
    // Lock the table if items are in the cart
    if (cart.length > 0 && !isTableLocked) {
      setIsTableLocked(true);
      localStorage.setItem('tableLocked', 'true');
    }
  }, [cart, isTableLocked]);

  useEffect(() => {
    if (tableNumber) {
      localStorage.setItem('currentTable', tableNumber);
    } else {
      localStorage.removeItem('currentTable');
    }
  }, [tableNumber]);

  // Performance: Memoize derived calculations
  const totalItems = useMemo(() => cart.reduce((acc, item) => acc + item.quantity, 0), [cart]);
  
  // Actions: Memoized to prevent child re-renders
  const addToCart = useCallback((product) => {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  }, []);

  const removeFromCart = useCallback((productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  }, []);

  const updateQuantity = useCallback((productId, quantity) => {
    setCart(prevCart => {
      if (quantity < 1) return prevCart.filter(item => item.id !== productId);
      return prevCart.map(item =>
        item.id === productId ? { ...item, quantity } : item
      );
    });
  }, []);

  const clearCart = useCallback(() => {
    setCart([]);
    setIsTableLocked(false);
    localStorage.removeItem('tableLocked');
  }, []);

  const updateTableNumber = useCallback((num) => {
    if (isTableLocked) return false; // Prevent hijacking mid-session
    setTableNumber(num);
    return true;
  }, [isTableLocked]);

  // Standardize the value object with useMemo
  const value = useMemo(() => ({
    cart,
    totalItems,
    tableNumber,
    isTableLocked,
    setTableNumber: updateTableNumber,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart
  }), [cart, totalItems, tableNumber, isTableLocked, updateTableNumber, addToCart, removeFromCart, updateQuantity, clearCart]);

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}
