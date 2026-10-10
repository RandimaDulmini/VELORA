import { requireStaff } from '@/lib/auth';
import { getOrders } from '@/lib/data';
import { AdminOrders } from '@/components/admin-orders';
export default async function Page() {
  await requireStaff();
  return <AdminOrders orders={await getOrders()} />;
}
