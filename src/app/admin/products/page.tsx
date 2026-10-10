import { requireStaff } from '@/lib/auth';
import { getProducts } from '@/lib/data';
import { AdminProducts } from '@/components/admin-products';
export default async function Page() {
  await requireStaff();
  return <AdminProducts products={await getProducts(true)} />;
}
