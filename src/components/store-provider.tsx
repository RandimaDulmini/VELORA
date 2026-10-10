'use client';
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import type { Product } from '@/lib/types';
type BagItem = {
  variantId: string;
  productId: string;
  name: string;
  size: string;
  color?: string;
  price: number;
  image: string;
  quantity: number;
};
type StoreContextType = {
  bag: BagItem[];
  wishlist: string[];
  ready: boolean;
  add: (p: Product, size: string, color?: string) => void;
  update: (id: string, quantity: number) => void;
  clear: () => void;
  toggleWish: (id: string) => void;
  notice: string;
};
const Context = createContext<StoreContextType | null>(null);
export function StoreProvider({ children }: { children: ReactNode }) {
  const [bag, setBag] = useState<BagItem[]>([]);
  const [wishlist, setWishlist] = useState<string[]>([]);
  const [ready, setReady] = useState(false);
  const [notice, setNotice] = useState('');
  useEffect(() => {
    try {
      const b = JSON.parse(localStorage.getItem('velora.bag.v1') || '[]');
      const w = JSON.parse(localStorage.getItem('velora.wishlist.v1') || '[]');
      if (Array.isArray(b))
        setBag(
          b
            .filter(
              (x) =>
                x &&
                typeof x.variantId === 'string' &&
                typeof x.name === 'string' &&
                typeof x.size === 'string' &&
                typeof x.image === 'string' &&
                Number.isFinite(x.price) &&
                Number.isInteger(x.quantity) &&
                x.quantity > 0 &&
                x.quantity <= 10,
            )
            .slice(0, 30),
        );
      if (Array.isArray(w)) setWishlist(w.filter((x) => typeof x === 'string'));
    } catch {}
    setReady(true);
  }, []);
  useEffect(() => {
    if (ready) {
      try {
        localStorage.setItem('velora.bag.v1', JSON.stringify(bag));
        localStorage.setItem('velora.wishlist.v1', JSON.stringify(wishlist));
      } catch {}
    }
  }, [bag, wishlist, ready]);
  useEffect(() => {
    if (notice) {
      const timer = setTimeout(() => setNotice(''), 3500);
      return () => clearTimeout(timer);
    }
  }, [notice]);
  function add(p: Product, size: string, color = 'Default') {
    const variant = p.variants.find((v) => v.size === size && (v.color || 'Default') === color);
    if (!variant || variant.stock < 1) return;
    const old = bag.find((i) => i.variantId === variant.id);
    if (old && old.quantity >= Math.min(10, variant.stock)) {
      setNotice('You have reached the available quantity for this size.');
      return;
    }
    if (!old && bag.length >= 30) {
      setNotice('Your bag can hold up to 30 different sizes.');
      return;
    }
    setBag((items) => {
      const existing = items.find((i) => i.variantId === variant.id);
      return existing
        ? items.map((i) => (i.variantId === variant.id ? { ...i, quantity: i.quantity + 1 } : i))
        : [
            ...items,
            {
              variantId: variant.id,
              productId: p.id,
              name: p.name,
              size,
              color: variant.color,
              price: p.price,
              image: p.image_url,
              quantity: 1,
            },
          ];
    });
    setNotice(`${p.name} added to your bag.`);
  }
  function update(id: string, quantity: number) {
    setBag((items) =>
      quantity < 1
        ? items.filter((i) => i.variantId !== id)
        : items.map((i) => (i.variantId === id ? { ...i, quantity: Math.min(10, quantity) } : i)),
    );
  }
  function toggleWish(id: string) {
    setWishlist((items) => (items.includes(id) ? items.filter((x) => x !== id) : [...items, id]));
  }
  return (
    <Context.Provider
      value={{ bag, wishlist, ready, add, update, clear: () => setBag([]), toggleWish, notice }}
    >
      {children}
      <div className={`toast ${notice ? 'visible' : ''}`} role="status">
        {notice}
      </div>
    </Context.Provider>
  );
}
export function useStore() {
  const context = useContext(Context);
  if (!context) throw new Error('StoreProvider is required');
  return context;
}
