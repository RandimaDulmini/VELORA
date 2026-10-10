import { notFound } from 'next/navigation';
import Link from 'next/link';
import { requireStaff } from '@/lib/auth';
import { getProducts } from '@/lib/data';
import { ProductForm } from '@/components/product-form';
export default async function Page({ params }: { params: Promise<{ id: string }> }) {
  await requireStaff();
  const { id } = await params;
  const product = id === 'new' ? undefined : (await getProducts(true)).find((p) => p.id === id);
  if (id !== 'new' && !product) notFound();
  return (
    <>
      <div className="breadcrumb">
        <Link href="/admin/products">Products</Link>
        <span>/</span>
        {product ? 'Edit product' : 'Add product'}
      </div>
      <ProductForm product={product} />
    </>
  );
}
