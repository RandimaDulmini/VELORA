'use client';
import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { ActionForm } from './action-form';
import { saveProduct } from '@/app/actions/store';
import type { Product } from '@/lib/types';
import { ImageUpload } from './image-upload';
export function ProductForm({ product: p }: { product?: Product }) {
  const [name, setName] = useState(p?.name || '');
  const [slug, setSlug] = useState(p?.slug || '');
  const hasNamedColors = p?.variants.some((v) => v.color && v.color !== 'Default') ?? false;
  const existingVariants = p?.variants
    .filter((v) => !hasNamedColors || (v.color && v.color !== 'Default'))
    .map((v) => ({
      color: v.color === 'Default' ? '' : v.color || '',
      size: v.size,
      stock: v.stock,
    }));
  const [variants, setVariants] = useState(
    existingVariants?.length
      ? existingVariants
      : [
          { color: '', size: 'S', stock: 0 },
          { color: '', size: 'M', stock: 0 },
          { color: '', size: 'L', stock: 0 },
        ],
  );
  return (
    <ActionForm action={saveProduct} submit="Save product" className="product-form">
      <input type="hidden" name="id" value={p?.id || ''} />
      <input
        type="hidden"
        name="image_url"
        value={p?.image_url || '/images/product-placeholder.svg'}
      />
      <input type="hidden" name="variants" value={JSON.stringify(variants)} />
      <div className="admin-form-grid">
        <section className="panel">
          <h2>Product details</h2>
          <label>
            Product name
            <input
              name="name"
              required
              minLength={2}
              maxLength={150}
              value={name}
              onChange={(e) => {
                setName(e.target.value);
                if (!p)
                  setSlug(
                    e.target.value
                      .toLowerCase()
                      .replace(/[^a-z0-9]+/g, '-')
                      .replace(/^-|-$/g, ''),
                  );
              }}
            />
          </label>
          <label>
            URL slug
            <input
              name="slug"
              required
              pattern="[a-z0-9]+(-[a-z0-9]+)*"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
            />
          </label>
          <label>
            Description
            <textarea
              name="description"
              required
              rows={5}
              maxLength={5000}
              defaultValue={p?.description}
            />
          </label>
          <div className="form-grid">
            <label>
              Collection
              <select name="category" defaultValue={p?.category || 'women'}>
                {['women', 'men', 'teen', 'kids', 'accessories'].map((c) => (
                  <option key={c}>{c}</option>
                ))}
              </select>
            </label>
            <label>
              Clothing type
              <select name="clothing_type" defaultValue={p?.clothing_type || 'Tops'}>
                {['Tops', 'Bottoms', 'Dresses & kurtas', 'Sets', 'Layers', 'Accessories'].map(
                  (t) => (
                    <option key={t}>{t}</option>
                  ),
                )}
              </select>
            </label>
            <label>
              Selling price (LKR)
              <input
                type="number"
                name="price"
                required
                min="0.01"
                max="10000000"
                step="0.01"
                defaultValue={p?.price}
              />
            </label>
            <label>
              Original price (optional)
              <input
                type="number"
                name="compare_at_price"
                min="0.01"
                max="10000000"
                step="0.01"
                defaultValue={p?.compare_at_price || ''}
              />
            </label>
          </div>
        </section>
        <section className="panel">
          <h2>Photography & visibility</h2>
          {p && <img className="admin-preview-image" src={p.image_url} alt={p.name} />}
          <label>
            Product photograph
            <ImageUpload name="image" />
          </label>
          <p className="small muted">
            JPG, PNG or WebP, up to 4 MB. Uploaded images are resized and stored in Supabase.
          </p>
          <label className="check-line">
            <input name="active" type="checkbox" defaultChecked={p?.active ?? true} />
            Published on the storefront
          </label>
          <label className="check-line">
            <input name="featured" type="checkbox" defaultChecked={p?.featured ?? false} />
            Featured on the home page
          </label>
          <label className="check-line">
            <input name="is_new" type="checkbox" defaultChecked={p?.is_new ?? true} />
            New arrival
          </label>
          <p className="small muted">
            Uncheck “Published” to hide this product without losing order history.
          </p>
        </section>
        <section className="panel span-2">
          <h2>Sizes & inventory</h2>
          <p className="muted">
            Add each available size and its stock. Colour is optional—leave it blank when a product
            has no colour choices.
          </p>
          <div className="variant-grid">
            <div className="variant-header" aria-hidden="true">
              <span>Colour (optional)</span>
              <span>Size</span>
              <span>Stock</span>
              <span />
            </div>
            {variants.map((v, i) => (
              <div className="variant-row" key={i}>
                <label className="variant-color">
                  <span className="variant-field-label">Colour (optional)</span>
                  <input
                    aria-label={`Colour ${i + 1}`}
                    value={v.color}
                    maxLength={50}
                    placeholder="No colour"
                    onChange={(e) =>
                      setVariants((rows) =>
                        rows.map((r, j) => (j === i ? { ...r, color: e.target.value } : r)),
                      )
                    }
                  />
                </label>
                <label>
                  <span className="variant-field-label">Size</span>
                  <input
                    required
                    aria-label={`Size ${i + 1}`}
                    value={v.size}
                    maxLength={20}
                    onChange={(e) =>
                      setVariants((rows) =>
                        rows.map((r, j) => (j === i ? { ...r, size: e.target.value } : r)),
                      )
                    }
                  />
                </label>
                <label>
                  <span className="variant-field-label">Stock</span>
                  <input
                    required
                    aria-label={`Stock for size ${v.size}`}
                    type="number"
                    min={0}
                    max={100000}
                    value={v.stock}
                    onChange={(e) =>
                      setVariants((rows) =>
                        rows.map((r, j) => (j === i ? { ...r, stock: Number(e.target.value) } : r)),
                      )
                    }
                  />
                </label>
                <button
                  type="button"
                  className="icon-button"
                  disabled={variants.length === 1}
                  onClick={() => setVariants((rows) => rows.filter((_, j) => j !== i))}
                  aria-label={`Remove ${v.color ? `${v.color} ` : ''}size ${v.size}`}
                >
                  <Trash2 size={17} />
                </button>
              </div>
            ))}
          </div>
          <button
            className="text-link"
            type="button"
            disabled={variants.length >= 100}
            onClick={() =>
              setVariants((rows) => [
                ...rows,
                { color: rows.at(-1)?.color || '', size: '', stock: 0 },
              ])
            }
          >
            <Plus size={15} />
            Add size
          </button>
          <p className="small muted">
            Removing an existing option sets its stock to zero so previous orders keep their
            records.
          </p>
        </section>
      </div>
    </ActionForm>
  );
}
