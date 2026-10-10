import { notFound } from 'next/navigation';
import Link from 'next/link';
import { getProducts } from '@/lib/data';
import { ProductDetail } from '@/components/product-detail';
import { ProductCard } from '@/components/product-card';
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const p = (await getProducts()).find((p) => p.slug === slug);
  return { title: p?.name || 'Product not found', description: p?.description };
}
export default async function ProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const products = await getProducts();
  const p = products.find((p) => p.slug === slug);
  if (!p) notFound();
  return (
    <div className="page-shell">
      <div className="breadcrumb">
        <Link href="/">Home</Link>
        <span>/</span>
        <Link href={`/shop?category=${p.category}`}>{p.category}</Link>
        <span>/</span>
        {p.name}
      </div>
      <ProductDetail product={p} />
      <section className="related">
        <div className="section-heading">
          <div>
            <span className="eyebrow">COMPLETE YOUR EDIT</span>
            <h2>
              You might <em>also love.</em>
            </h2>
          </div>
        </div>
        <div className="product-grid home-products">
          {products
            .filter((x) => x.category === p.category && x.id !== p.id)
            .slice(0, 4)
            .map((x) => (
              <ProductCard key={x.id} product={x} />
            ))}
        </div>
      </section>
    </div>
  );
}
