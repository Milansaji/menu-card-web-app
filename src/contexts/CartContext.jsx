import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export function useCart() {
  return useContext(CartContext);
}

export function CartProvider({ children }) {
  const [cart, setCart] = useState(() => JSON.parse(localStorage.getItem('currentCart') || '[]'));
  const [totalItems, setTotalItems] = useState(0);
  const [tableNumber, setTableNumber] = useState(() => localStorage.getItem('currentTable'));

  useEffect(() => {
    localStorage.setItem('currentCart', JSON.stringify(cart));
    const count = cart.reduce((acc, item) => acc + item.quantity, 0);
    setTotalItems(count);
  }, [cart]);

  useEffect(() => {
    if (tableNumber) {
      localStorage.setItem('currentTable', tableNumber);
    } else {
      localStorage.removeItem('currentTable');
    }
  }, [tableNumber]);

  function addToCart(product) {
    setCart(prevCart => {
      const existingItem = prevCart.find(item => item.id === product.id);
      if (existingItem) {
        return prevCart.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  }

  function removeFromCart(productId) {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  }

  function updateQuantity(productId, quantity) {
    if (quantity < 1) {
      removeFromCart(productId);
      return;
    }
    setCart(prevCart =>
      prevCart.map(item =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  }

  function clearCart() {
    setCart([]);
  }

  const value = {
    cart,
    totalItems,
    tableNumber,
    setTableNumber,
    addToCart,
    removeFromCart,
    updateQuantity,
    clearCart
  };

  return (
    <CartContext.Provider value={value}>
      {children}
    </CartContext.Provider>
  );
}
