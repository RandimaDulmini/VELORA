'use client';
import { useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Heart, Truck, ShieldCheck, Ruler, PackageCheck } from 'lucide-react';
import type { Product } from '@/lib/types';
import { money, visibleVariants } from '@/lib/utils';
import { useStore } from './store-provider';
export function ProductDetail({ product: p }: { product: Product }) {
  const options = visibleVariants(p);
  const colors = [...new Set(options.map((variant) => variant.color || 'Default'))];
  const [color, setColor] = useState(colors.length === 1 ? colors[0] : '');
  const [size, setSize] = useState('');
  const [error, setError] = useState('');
  const { add, wishlist, toggleWish } = useStore();
  const variants = color ? options.filter((variant) => (variant.color || 'Default') === color) : [];
  const showColors = colors.length > 1 || colors[0] !== 'Default';
  return (
    <div className="product-detail">
      <div className="detail-photo">
        <img src={p.image_url} alt={p.name} style={{ objectPosition: p.image_position }} />
        {p.is_new && <span className="badge">THE NEW EDIT</span>}
      </div>
      <div className="detail-copy">
        <span className="eyebrow">
          VELORA / {p.category} / {p.clothing_type}
        </span>
        <h1>{p.name}</h1>
        <div className="detail-price">
          {money(p.price)} {p.compare_at_price && <s>{money(p.compare_at_price)}</s>}
        </div>
        <p className="detail-description">{p.description}</p>
        {showColors && (
          <>
            <div className="size-label">
              <span>Select your colour {color && `— ${color}`}</span>
            </div>
            <div className="size-options large" role="group" aria-label="Available colours">
              {colors.map((option) => (
                <button
                  key={option}
                  disabled={
                    !options.some(
                      (variant) => (variant.color || 'Default') === option && variant.stock > 0,
                    )
                  }
                  aria-pressed={color === option}
                  className={color === option ? 'active' : ''}
                  onClick={() => {
                    setColor(option);
                    setSize('');
                    setError('');
                  }}
                >
                  {option}
                </button>
              ))}
            </div>
          </>
        )}
        <div className="size-label">
          <span>Select your size {size && `— ${size}`}</span>
          <Link href="/info/size-guide">
            <Ruler size={15} /> Size guide
          </Link>
        </div>
        <div className="size-options large">
          {variants.map((v) => (
            <button
              key={v.id}
              disabled={!v.stock}
              aria-pressed={size === v.size}
              className={size === v.size ? 'active' : ''}
              onClick={() => {
                setSize(v.size);
                setError('');
              }}
            >
              {v.size}
            </button>
          ))}
        </div>
        <p className="muted small">
          {!color
            ? 'Select a colour to see available sizes.'
            : size
              ? `${variants.find((v) => v.size === size)?.stock} available in this option`
              : 'Select a size to check availability.'}
        </p>
        <div className="detail-actions">
          <button
            className="button"
            disabled={options.every((v) => !v.stock)}
            onClick={() => {
              if (!color) {
                setError('Please choose your colour first.');
                return;
              }
              if (!size) {
                setError('Please choose your size first.');
                return;
              }
              add(p, size, color);
            }}
          >
            {options.every((v) => !v.stock) ? 'Sold out' : 'Add to bag'}
            <ArrowRight size={17} />
          </button>
          <button
            className="button secondary"
            aria-label="Save to wishlist"
            aria-pressed={wishlist.includes(p.id)}
            onClick={() => toggleWish(p.id)}
          >
            <Heart size={19} fill={wishlist.includes(p.id) ? 'currentColor' : 'none'} />
          </button>
        </div>
        {error && (
          <p className="form-error" role="alert">
            {error}
          </p>
        )}
        <Link className="text-link" href="/bag">
          View your bag <ArrowRight size={14} />
        </Link>
        <div className="detail-promises">
          <p>
            <Truck size={18} /> Delivery across Sri Lanka
          </p>
          <p>
            <ShieldCheck size={18} /> Cash on delivery or bank transfer
          </p>
          <p>
            <PackageCheck size={18} /> Carefully packed, just for you
          </p>
        </div>
        <details open>
          <summary>About this piece</summary>
          <p>
            Part of our curated imported collection. Colours can vary slightly between your screen
            and the garment. Check the garment label for fabric and care instructions.
          </p>
        </details>
        <details>
          <summary>Delivery & exchanges</summary>
          <p>
            Delivery is usually 2–4 working days after confirmation. Bank transfers are dispatched
            after payment approval.{' '}
            <Link href="/info/delivery">Read delivery & exchange information.</Link>
          </p>
        </details>
      </div>
    </div>
  );
}
