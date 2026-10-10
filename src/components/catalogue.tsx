'use client';
import { useMemo, useState, type CSSProperties } from 'react';
import { Search, X } from 'lucide-react';
import { ProductCard } from './product-card';
import { categories, visibleVariants } from '@/lib/utils';
import type { Product } from '@/lib/types';
const inCategory = (p: Product, key: string) =>
  key === 'all' ||
  (key === 'new' ? p.is_new : key === 'sale' ? !!p.compare_at_price : p.category === key);
export function Catalogue({
  products,
  initialCategory = 'all',
  initialSearch = '',
  focusSearch = false,
  showFeatured = false,
}: {
  products: Product[];
  initialCategory?: string;
  initialSearch?: string;
  focusSearch?: boolean;
  showFeatured?: boolean;
}) {
  const [category, setCategory] = useState(initialCategory);
  const [search, setSearch] = useState(initialSearch);
  const [sizes, setSizes] = useState<string[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [price, setPrice] = useState('all');
  const [sort, setSort] = useState('new');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(12);
  const [columns, setColumns] = useState(3);
  const clothingTypes = [...new Set(products.map((p) => p.clothing_type))];
  const availableSizes = [
    ...new Set(products.flatMap((p) => visibleVariants(p).map((v) => v.size))),
  ];
  const filtered = useMemo(
    () =>
      products
        .filter(
          (p) =>
            inCategory(p, category) &&
            `${p.name} ${p.category}`.toLowerCase().includes(search.toLowerCase()) &&
            (!sizes.length ||
              visibleVariants(p).some((v) => sizes.includes(v.size) && v.stock > 0)) &&
            (!types.length || types.includes(p.clothing_type)) &&
            (price === 'all' ||
              (price === 'under'
                ? p.price < 5000
                : price === 'mid'
                  ? p.price >= 5000 && p.price <= 10000
                  : p.price > 10000)),
        )
        .sort((a, b) =>
          sort === 'low'
            ? a.price - b.price
            : sort === 'high'
              ? b.price - a.price
              : sort === 'new'
                ? b.created_at.localeCompare(a.created_at)
                : Number(b.featured) - Number(a.featured),
        ),
    [products, category, search, sizes, types, price, sort],
  );
  const pages = Math.max(1, Math.ceil(filtered.length / perPage));
  const currentPage = Math.min(page, pages);
  const featured = products.filter((p) => p.featured).slice(0, 4);
  const title = categories.find((c) => c[0] === category)?.[1] || 'All Products';
  function reset() {
    setCategory('all');
    setSearch('');
    setSizes([]);
    setTypes([]);
    setPrice('all');
    setPage(1);
  }
  return (
    <div className="catalogue reference-catalogue">
      <div className="catalogue-layout">
        <aside className="filters">
          <div className="filter-section">
            <h3>Categories</h3>
            {categories.map(([key, label]) => (
              <button
                key={key}
                className={`category-filter ${category === key ? 'active' : ''}`}
                onClick={() => {
                  setCategory(key);
                  setPage(1);
                }}
              >
                {label}
                <span>{products.filter((p) => inCategory(p, key)).length}</span>
              </button>
            ))}
          </div>
          <div className="filter-section">
            <h3>Clothing type</h3>
            <div className="filter-chips">
              {clothingTypes.map((t) => (
                <label key={t}>
                  <input
                    type="checkbox"
                    checked={types.includes(t)}
                    onChange={() => {
                      setTypes((values) =>
                        values.includes(t) ? values.filter((v) => v !== t) : [...values, t],
                      );
                      setPage(1);
                    }}
                  />
                  <span>{t}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="filter-section">
            <h3>Size</h3>
            <div className="filter-chips">
              {availableSizes.map((s) => (
                <label key={s}>
                  <input
                    type="checkbox"
                    checked={sizes.includes(s)}
                    onChange={() => {
                      setSizes((values) =>
                        values.includes(s) ? values.filter((v) => v !== s) : [...values, s],
                      );
                      setPage(1);
                    }}
                  />
                  <span>{s}</span>
                </label>
              ))}
            </div>
          </div>
          <div className="filter-section">
            <h3>Price (LKR)</h3>
            {[
              ['all', 'All prices'],
              ['under', 'Under 5,000'],
              ['mid', '5,000 – 10,000'],
              ['over', 'Over 10,000'],
            ].map(([value, label]) => (
              <label className="radio-line" key={value}>
                <input
                  type="radio"
                  name="price"
                  checked={price === value}
                  onChange={() => {
                    setPrice(value);
                    setPage(1);
                  }}
                />
                {label}
              </label>
            ))}
          </div>
          <button className="text-link" onClick={reset}>
            Clear all filters <X size={13} />
          </button>
        </aside>
        <div className="catalogue-content">
          {showFeatured && featured.length > 0 && (
            <section id="featured" className="reference-featured">
              <h2>Featured products</h2>
              <p>A few favourites from the VELORA collection.</p>
              <div className="product-grid home-products">
                {featured.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            </section>
          )}
          {showFeatured ? (
            <h2 className="catalogue-title">{title}</h2>
          ) : (
            <h1 className="catalogue-title">{title}</h1>
          )}
          <div className="catalogue-toolbar">
            <div className="view-controls">
              <span>View as</span>
              {[1, 2, 3, 4].map((n) => (
                <button
                  key={n}
                  aria-label={`${n} ${n === 1 ? 'column' : 'columns'}`}
                  aria-pressed={columns === n}
                  className={columns === n ? 'active' : ''}
                  onClick={() => setColumns(n)}
                >
                  {'▯'.repeat(n)}
                </button>
              ))}
            </div>
            <label className="sort-label">
              Items per page
              <select
                aria-label="Items per page"
                value={perPage}
                onChange={(e) => {
                  setPerPage(Number(e.target.value));
                  setPage(1);
                }}
              >
                {[8, 12, 20].map((n) => (
                  <option key={n}>{n}</option>
                ))}
              </select>
            </label>
            <label className="sort-label">
              Sort by
              <select
                aria-label="Sort products"
                value={sort}
                onChange={(e) => {
                  setSort(e.target.value);
                  setPage(1);
                }}
              >
                <option value="new">Date, new to old</option>
                <option value="low">Price, low to high</option>
                <option value="high">Price, high to low</option>
                <option value="featured">Featured first</option>
              </select>
            </label>
            <label className="catalogue-search">
              <Search size={17} />
              <input
                placeholder="Search products"
                aria-label="Search products"
                value={search}
                autoFocus={focusSearch}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </label>
          </div>
          <p className="catalogue-count">{filtered.length} products</p>
          {filtered.length ? (
            <div
              className="product-grid catalogue-grid"
              style={{ '--catalogue-columns': columns } as CSSProperties}
            >
              {filtered.slice((currentPage - 1) * perPage, currentPage * perPage).map((p) => (
                <ProductCard key={p.id} product={p} />
              ))}
            </div>
          ) : (
            <div className="empty-state">
              <Search size={32} />
              <h2>No matching products</h2>
              <p>No pieces match these filters. Try a different search or size.</p>
              <button className="button" onClick={reset}>
                Explore all pieces
              </button>
            </div>
          )}
          {pages > 1 && (
            <nav className="pagination" aria-label="Product pages">
              {Array.from({ length: pages }, (_, i) => (
                <button
                  key={i}
                  aria-current={currentPage === i + 1 ? 'page' : undefined}
                  className={currentPage === i + 1 ? 'active' : ''}
                  onClick={() => {
                    setPage(i + 1);
                    document
                      .querySelector('.catalogue-title')
                      ?.scrollIntoView({ behavior: 'smooth', block: 'start' });
                  }}
                >
                  {i + 1}
                </button>
              ))}
            </nav>
          )}
        </div>
      </div>
    </div>
  );
}
