import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { CartItem, Product } from "../types";

type CartContextValue = {
  items: CartItem[];
  addItem: (product: Product, qty?: number) => void;
  updateQty: (id: string, qty: number) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  count: number;
  subtotal: number;
};

const CartContext = createContext<CartContextValue | undefined>(undefined);

const storageKey = "rustshop_cart";

const loadCart = (): CartItem[] => {
  try {
    const raw = localStorage.getItem(storageKey);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const CartProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    setItems(loadCart());
  }, []);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify(items));
  }, [items]);

  const addItem = (product: Product, qty = 1) => {
    setItems((prev) => {
      const existing = prev.find((item) => item.id === product.id);
      if (existing) {
        return prev.map((item) => (item.id === product.id ? { ...item, qty: item.qty + qty } : item));
      }
      return [
        ...prev,
        {
          id: product.id,
          title: product.name || product.title || "Item",
          price: product.price,
          priceFormatted: product.priceFormatted,
          image: product.image,
          qty
        }
      ];
    });
  };

  const updateQty = (id: string, qty: number) => {
    setItems((prev) => prev.map((item) => (item.id === id ? { ...item, qty: Math.max(1, qty) } : item)));
  };

  const removeItem = (id: string) => {
    setItems((prev) => prev.filter((item) => item.id !== id));
  };

  const clear = () => setItems([]);

  const count = useMemo(() => items.reduce((sum, item) => sum + item.qty, 0), [items]);
  const subtotal = useMemo(() => items.reduce((sum, item) => sum + item.price * item.qty, 0), [items]);

  return (
    <CartContext.Provider value={{ items, addItem, updateQty, removeItem, clear, count, subtotal }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used within CartProvider");
  return ctx;
};
