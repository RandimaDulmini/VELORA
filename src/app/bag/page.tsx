import { Bag } from '@/components/bag';
import { getSettings, getProducts } from '@/lib/data';
export const metadata = { title: 'Your shopping bag' };
export default async function Page() {
  const [settings, products] = await Promise.all([getSettings(), getProducts()]);
  return <Bag settings={settings} products={products} />;
}
