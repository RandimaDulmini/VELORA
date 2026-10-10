import { getProducts } from '@/lib/data';
import { Wishlist } from '@/components/wishlist';
export const metadata = { title: 'Your wishlist' };
export default async function Page() {
  return <Wishlist products={await getProducts()} />;
}
