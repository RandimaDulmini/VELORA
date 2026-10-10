'use client';
import Link from 'next/link';
import { Heart } from 'lucide-react';
import { useStore } from './store-provider';
import { ProductCard } from './product-card';
import type { Product } from '@/lib/types';
export function Wishlist({ products }: { products: Product[] }) {
  const { wishlist, ready } = useStore();
  const items = products.filter((p) => wishlist.includes(p.id));
  return (
    <div className="page-shell">
      <div className="page-heading">
        <span className="eyebrow">SAVED FOR A LITTLE LATER</span>
        <h1>
          Your <em>wishlist.</em>
        </h1>
        <p>A collection of pieces that caught your eye.</p>
      </div>
      {!ready ? (
        <p>Loading your wishlist…</p>
      ) : items.length ? (
        <div className="product-grid home-products">
          {items.map((p) => (
            <ProductCard key={p.id} product={p} />
          ))}
        </div>
      ) : (
        <div className="empty-state">
          <Heart size={35} />
          <h2>Keep your favourites close.</h2>
          <p>Tap the heart on any piece to save it here.</p>
          <Link href="/shop" className="button">
            Explore the collection
          </Link>
        </div>
      )}
    </div>
  );
}
