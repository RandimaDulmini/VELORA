import { getProducts } from '@/lib/data';
import { Catalogue } from '@/components/catalogue';
export const metadata = { title: 'Shop the collection' };
export default async function Shop({
  searchParams,
}: {
  searchParams: Promise<{ category?: string; search?: string; q?: string }>;
}) {
  const params = await searchParams;
  const products = await getProducts();
  return (
    <div className="page-shell">
      <div className="breadcrumb">
        <a href="/">Home</a>
        <span>/</span>The collection
      </div>
      <Catalogue
        key={`${params.category || 'all'}:${params.q || ''}`}
        products={products}
        initialCategory={params.category}
        focusSearch={!!params.search}
        initialSearch={params.q || ''}
      />
    </div>
  );
}
