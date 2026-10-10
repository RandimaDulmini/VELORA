import fs from 'node:fs';
import path from 'node:path';
const source = fs.readFileSync('VELORA _ Online Clothing Store (4).html', 'utf8');
fs.mkdirSync('public/images', { recursive: true });
fs.mkdirSync('src/data', { recursive: true });
fs.mkdirSync('supabase', { recursive: true });
const products = JSON.parse(source.match(/var P = (\[[\s\S]*?\])\.map/)[1]);
const images = JSON.parse(source.match(/var IMG=(\{[\s\S]*?\});/)[1]);
function save(data, name) {
  const [, ext, bytes] = data.match(/^data:image\/(\w+);base64,(.*)$/);
  const file = `/images/${name}.${ext === 'jpeg' ? 'jpg' : ext}`;
  fs.writeFileSync(path.join('public', file), Buffer.from(bytes, 'base64'));
  return file;
}
save(source.match(/url\((data:image\/jpeg;base64,[^)]+)\)/)[1], 'original-hero');
const types = (n) =>
  /Set|Pyjama|Co-ord/.test(n)
    ? 'Sets'
    : /Jacket|Cardigan/.test(n)
      ? 'Layers'
      : /Dress|Frock|Kurta|Kurti|Gown|Dungaree/.test(n)
        ? 'Dresses & kurtas'
        : /Blouse|Shirt|Tee|T-Shirt|Hoodie|Top/.test(n)
          ? 'Tops'
          : /Jeans|Skirt|Trousers|Pants|Shorts/.test(n)
            ? 'Bottoms'
            : 'Accessories';
const data = products.map((p, i) => {
  const slug = p[0].toLowerCase().replace(/[^a-z0-9]+/g, '-');
  const id = `00000000-0000-4000-8000-${String(i + 1).padStart(12, '0')}`;
  let image = images[p[0]] ? save(images[p[0]][0], slug) : '/images/product-placeholder.svg';
  return {
    id,
    slug,
    name: p[0],
    category: p[1],
    price: p[2],
    compare_at_price: p[3] || null,
    description: `Meet the ${p[0]}. An effortless addition to your everyday wardrobe, selected for the VELORA collection. Choose your usual size or contact us for help finding your fit.`,
    clothing_type: types(p[0]),
    image_url: image,
    image_position: images[p[0]]?.[1] || 'center',
    featured: [0, 1, 5, 9].includes(i),
    is_new: !!p[6],
    active: true,
    created_at: new Date(Date.UTC(2026, 8, 1 + i)).toISOString(),
    variants: p[4].map((size, j) => ({
      id: `10000000-0000-4000-8000-${String(i * 10 + j + 1).padStart(12, '0')}`,
      product_id: id,
      size,
      stock: 10,
    })),
  };
});
fs.writeFileSync('src/data/products.json', JSON.stringify(data, null, 2));
const quote = (x) =>
  x === null
    ? 'null'
    : typeof x === 'boolean' || typeof x === 'number'
      ? String(x)
      : `'${String(x).replaceAll("'", "''")}'`;
const keys = Object.keys(data[0]).filter((k) => k !== 'variants');
const sql =
  '-- Optional sample catalogue imported from your HTML. Review products and stock before launch.\n' +
  data
    .map(
      (p) =>
        `insert into public.products (${keys.join(',')}) values (${keys.map((k) => quote(p[k])).join(',')}) on conflict (id) do nothing;\n` +
        p.variants
          .map(
            (v) =>
              `insert into public.product_variants (id,product_id,size,stock) values (${Object.values(v).map(quote).join(',')}) on conflict (id) do nothing;`,
          )
          .join('\n'),
    )
    .join('\n');
fs.writeFileSync('supabase/seed.sql', sql);
console.log(
  `Imported ${data.length} products and ${Object.keys(images).length} original product photos.`,
);
