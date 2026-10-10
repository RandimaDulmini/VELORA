'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Heart, Search, ShoppingBag, UserRound, ArrowUpRight } from 'lucide-react';
import { useStore } from './store-provider';
import { categories } from '@/lib/utils';
export function Header({ staff, signedIn }: { staff: boolean; signedIn: boolean }) {
  const { bag, wishlist } = useStore();
  const path = usePathname();
  return (
    <>
      <div className="reference-promo">
        Island-wide delivery · Free gift wrap on every order · Cash on delivery & bank transfer
      </div>
      <header className="site-header reference-header">
        <div className="reference-tabs">
          <Link href="/" className={path === '/' ? 'on' : ''}>
            Fashion
          </Link>
          <Link href="/shop?category=accessories">Accessories</Link>
          <Link href="/account">My orders</Link>
          <div className="header-icons">
            <Link
              href={signedIn ? '/account' : '/auth'}
              className="icon-button"
              aria-label="My account"
            >
              <UserRound />
            </Link>
            <Link
              href="/wishlist"
              className="icon-button"
              aria-label={`Wishlist, ${wishlist.length} items`}
            >
              <Heart />
              <span className="count">{wishlist.length}</span>
            </Link>
            <Link
              href="/bag"
              className="icon-button"
              aria-label={`Shopping bag, ${bag.reduce((n, i) => n + i.quantity, 0)} items`}
            >
              <ShoppingBag />
              <span className="count">{bag.reduce((n, i) => n + i.quantity, 0)}</span>
            </Link>
          </div>
        </div>
        <div className="reference-head">
          <Link href="/" className="wordmark reference-logo" aria-label="VELORA home">
            VELORA<span>CLOTHING</span>
          </Link>
          <nav className="reference-nav" aria-label="Main navigation">
            {categories.map(([key, label]) => (
              <Link
                key={key}
                href={`/shop?category=${key}`}
                className={key === 'sale' ? 'sale-link' : ''}
              >
                {label}
              </Link>
            ))}
          </nav>
          <form action="/shop" method="get" className="reference-search" role="search">
            <input
              name="q"
              placeholder="Search the store"
              aria-label="Search the store"
              maxLength={150}
            />
            <button aria-label="Submit search">
              <Search size={19} />
            </button>
          </form>
        </div>
        {staff && !path.startsWith('/admin') && (
          <Link className="staff-shortcut" href="/admin">
            Open store management <ArrowUpRight size={14} />
          </Link>
        )}
      </header>
    </>
  );
}
