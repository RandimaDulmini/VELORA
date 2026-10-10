'use client';
import Link from 'next/link';
import { useState } from 'react';
import { Plus, Search, ArrowUpRight } from 'lucide-react';
import { money, visibleVariants } from '@/lib/utils';
import type { Product } from '@/lib/types';
export function AdminProducts({ products }: { products: Product[] }) {
  const [search, setSearch] = useState('');
  const filtered = products.filter((p) => p.name.toLowerCase().includes(search.toLowerCase()));
  return (
    <>
      <div className="section-heading">
        <div>
          <h2>Your collection</h2>
          <p className="muted">Manage products, pricing and stock for every size.</p>
        </div>
        <Link className="button" href="/admin/products/new">
          <Plus size={16} />
          Add product
        </Link>
      </div>
      <label className="catalogue-search admin-search">
        <Search size={16} />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products"
          aria-label="Search products"
        />
      </label>
      <div className="panel table-scroll">
        <table>
          <thead>
            <tr>
              <th>Product</th>
              <th>Collection</th>
              <th>Price</th>
              <th>Stock</th>
              <th>Visibility</th>
              <th>Edit</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((p) => (
              <tr key={p.id}>
                <td>
                  <div className="table-product">
                    <img src={p.image_url} alt="" />
                    <strong>{p.name}</strong>
                  </div>
                </td>
                <td>{p.category}</td>
                <td>{money(p.price)}</td>
                <td>{visibleVariants(p).reduce((n, v) => n + v.stock, 0)}</td>
                <td>
                  <span className={`status-badge ${p.active ? 'confirmed' : 'cancelled'}`}>
                    {p.active ? 'Published' : 'Hidden'}
                  </span>
                </td>
                <td>
                  <Link aria-label={`Edit ${p.name}`} href={`/admin/products/${p.id}`}>
                    <ArrowUpRight size={19} />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {!filtered.length && <p className="muted">No products found.</p>}
      </div>
    </>
  );
}
