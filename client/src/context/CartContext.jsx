import { createContext, useContext, useState } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const [items, setItems] = useState([]);

  const addItem = (product, quantity = 1, selectedExtras = []) => {
    setItems(prev => {
      const key = `${product.id}-${selectedExtras.map(e => `${e.id}:${e.quantity || 1}`).sort().join(',')}`;
      const existing = prev.find(item => `${item.product.id}-${item.selectedExtras.map(e => `${e.id}:${e.quantity || 1}`).sort().join(',')}` === key);
      if (existing) {
        return prev.map(item =>
          `${item.product.id}-${item.selectedExtras.map(e => `${e.id}:${e.quantity || 1}`).sort().join(',')}` === key
            ? { ...item, quantity: item.quantity + quantity }
            : item
        );
      }
      return [...prev, { product, quantity, selectedExtras }];
    });
  };

  const removeItem = (index) => {
    setItems(prev => prev.filter((_, i) => i !== index));
  };

  const updateQuantity = (index, quantity) => {
    if (quantity <= 0) {
      removeItem(index);
      return;
    }
    setItems(prev => prev.map((item, i) => i === index ? { ...item, quantity } : item));
  };

  const clearCart = () => setItems([]);

  const totalAmount = items.reduce((sum, item) => {
    const extrasTotal = item.selectedExtras.reduce((s, e) => s + parseFloat(e.price) * (e.quantity || 1), 0);
    return sum + (parseFloat(item.product.price) + extrasTotal) * item.quantity;
  }, 0);

  const totalItems = items.reduce((sum, item) => sum + item.quantity, 0);

  return (
    <CartContext.Provider value={{ items, addItem, removeItem, updateQuantity, clearCart, totalAmount, totalItems }}>
      {children}
    </CartContext.Provider>
  );
}

export const useCart = () => useContext(CartContext);
