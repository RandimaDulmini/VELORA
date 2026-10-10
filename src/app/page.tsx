import Link from 'next/link';
import { getProducts } from '@/lib/data';
import { Catalogue } from '@/components/catalogue';
export default async function Home() {
  const products = await getProducts();
  return (
    <>
      <section className="reference-hero">
        <h1>Soft colours, made to be worn.</h1>
        <p>
          Fresh pieces for women, men, teens and kids. Pick your size and shop with cash on delivery
          or bank transfer.
        </p>
        <div className="inline-actions">
          <Link href="/shop?category=new" className="button">
            Shop new arrivals
          </Link>
          <a href="#featured" className="button secondary">
            See featured pieces
          </a>
        </div>
      </section>
      <div className="page-shell reference-store">
        <div className="breadcrumb">
          <Link href="/">Home</Link>
          <span>›</span>All Products
        </div>
        <Catalogue products={products} showFeatured />
      </div>
    </>
  );
}
