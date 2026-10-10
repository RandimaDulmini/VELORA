'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Heart, ShoppingBag } from 'lucide-react';
import type { Product } from '@/lib/types';
import { money } from '@/lib/utils';
import { useStore } from './store-provider';
export function ProductCard({
  product: p,
  priority = false,
}: {
  product: Product;
  priority?: boolean;
}) {
  const { wishlist, toggleWish, add } = useStore();
  const colors = [...new Set(p.variants.map((variant) => variant.color || 'Default'))];
  const [color, setColor] = useState(colors.length === 1 ? colors[0] : '');
  const [size, setSize] = useState('');
  const [error, setError] = useState('');
  const soldOut = p.variants.every((v) => v.stock === 0);
  const variants = color
    ? p.variants.filter((variant) => (variant.color || 'Default') === color)
    : [];
  const showColors = colors.length > 1 || colors[0] !== 'Default';
  return (
    <article className="product-card">
      <div className="product-image">
        <Link href={`/product/${p.slug}`} tabIndex={-1}>
          <img
            src={p.image_url}
            alt={p.name}
            loading={priority ? 'eager' : 'lazy'}
            style={{ objectPosition: p.image_position }}
          />
        </Link>
        <div className="product-badges">
          {p.compare_at_price ? (
            <span className="badge sale">Sale</span>
          ) : p.is_new ? (
            <span className="badge">New</span>
          ) : null}
          {soldOut && <span className="badge">Sold out</span>}
        </div>
        <button
          className={`wish-button ${wishlist.includes(p.id) ? 'selected' : ''}`}
          onClick={() => toggleWish(p.id)}
          aria-label={`${wishlist.includes(p.id) ? 'Remove' : 'Save'} ${p.name} ${wishlist.includes(p.id) ? 'from' : 'to'} wishlist`}
          aria-pressed={wishlist.includes(p.id)}
        >
          <Heart size={17} fill={wishlist.includes(p.id) ? 'currentColor' : 'none'} />
        </button>
      </div>
      <div className="product-info">
        <Link href={`/product/${p.slug}`}>
          <h3>{p.name}</h3>
        </Link>
        <div className="product-price">
          {money(p.price)} {p.compare_at_price && <s>{money(p.compare_at_price)}</s>}
        </div>
        {showColors && (
          <label className="card-color">
            Colour
            <select
              aria-label={`Colour for ${p.name}`}
              value={color}
              onChange={(event) => {
                setColor(event.target.value);
                setSize('');
                setError('');
              }}
            >
              <option value="">Choose colour</option>
              {colors.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </label>
        )}
        <p className="card-availability">Available sizes: tap to choose</p>
        <div className="card-sizes" role="group" aria-label={`Sizes for ${p.name}`}>
          {variants.map((v) => (
            <button
              key={v.id}
              disabled={!v.stock}
              className={size === v.size ? 'active' : ''}
              aria-pressed={size === v.size}
              onClick={() => {
                setSize(v.size);
                setError('');
              }}
            >
              {v.size}
            </button>
          ))}
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <button
          className="card-order"
          disabled={soldOut}
          onClick={() => {
            if (!color) {
              setError('Please choose a colour first.');
              return;
            }
            if (!size) {
              setError('Please choose a size first.');
              return;
            }
            add(p, size, color);
            setError('');
          }}
        >
          <ShoppingBag size={16} />
          {soldOut ? 'Sold out' : 'Add to bag'}
        </button>
      </div>
    </article>
  );
}
