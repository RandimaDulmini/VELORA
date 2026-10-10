'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, ShoppingBag, Package, Users, Settings, ArrowUpRight } from 'lucide-react';
export function AdminNav({ superAdmin }: { superAdmin: boolean }) {
  const path = usePathname();
  return (
    <nav className="admin-nav" aria-label="Store management">
      <Link href="/admin" className={path === '/admin' ? 'active' : ''}>
        <LayoutDashboard size={17} />
        Overview
      </Link>
      <Link href="/admin/products" className={path.startsWith('/admin/products') ? 'active' : ''}>
        <ShoppingBag size={17} />
        Products
      </Link>
      <Link href="/admin/orders" className={path.startsWith('/admin/orders') ? 'active' : ''}>
        <Package size={17} />
        Orders & payments
      </Link>
      {superAdmin && (
        <>
          <Link href="/admin/team" className={path === '/admin/team' ? 'active' : ''}>
            <Users size={17} />
            Team
          </Link>
          <Link href="/admin/settings" className={path === '/admin/settings' ? 'active' : ''}>
            <Settings size={17} />
            Store settings
          </Link>
        </>
      )}
      <Link href="/">
        View store <ArrowUpRight size={15} />
      </Link>
    </nav>
  );
}
