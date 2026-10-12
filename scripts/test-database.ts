import { PGlite } from '@electric-sql/pglite';
import { readFileSync, readdirSync } from 'node:fs';
import assert from 'node:assert/strict';

// Execute the real migration against embedded PostgreSQL. Supabase-owned schemas are stubbed only.
const db = new PGlite();
await db.exec(`
  create role anon; create role authenticated;
  create schema auth; create schema storage;
  create table auth.users(id uuid primary key,email text,email_confirmed_at timestamptz);
  create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub',true),'')::uuid; $$;
  grant usage on schema auth,public,storage to anon,authenticated;
  grant execute on function auth.uid() to anon,authenticated;
  create table storage.buckets(id text primary key,name text,public boolean,file_size_limit bigint,allowed_mime_types text[]);
  create table storage.objects(id uuid default gen_random_uuid(),bucket_id text,name text);
  alter table storage.objects enable row level security;
  grant select,insert on storage.objects to authenticated;
  create function storage.foldername(text) returns text[] language sql as $$ select string_to_array($1,'/'); $$;
`);
for (const migration of readdirSync('supabase/migrations')
  .filter((file) => file.endsWith('.sql'))
  .sort())
  await db.exec(readFileSync(`supabase/migrations/${migration}`, 'utf8'));
await db.exec(readFileSync('supabase/seed.sql', 'utf8'));
const customer = '20000000-0000-4000-8000-000000000001';
const other = '20000000-0000-4000-8000-000000000002';
const admin = '20000000-0000-4000-8000-000000000003';
const superAdmin = '20000000-0000-4000-8000-000000000004';
for (const [id, email] of [
  [customer, 'customer@test.local'],
  [other, 'other@test.local'],
  [admin, 'admin@test.local'],
  [superAdmin, 'super@test.local'],
])
  await db.query('insert into auth.users values($1,$2,now())', [id, email]);
await db.query(
  "insert into public.staff_members(user_id,email,role) values ($1,'admin@test.local','admin'),($2,'super@test.local','super_admin')",
  [admin, superAdmin],
);
async function asUser(id: string) {
  await db.exec('reset role');
  await db.query("select set_config('request.jwt.claim.sub',$1,false)", [id]);
  await db.exec('set role authenticated');
}
async function mustFail(fn: () => Promise<unknown>, pattern: RegExp) {
  await assert.rejects(fn, pattern);
}
let count = 0;
async function check(name: string, fn: () => Promise<void>) {
  await fn();
  count++;
  console.log(`PASS ${name}`);
}
const shipping = {
  name: 'Test Customer',
  phone: '0771234567',
  address: '12 Flower Road',
  city: 'Colombo',
  postal_code: '00700',
  notes: '',
};
const variant = '10000000-0000-4000-8000-000000000001';
async function place(
  payment = 'cod',
  items = [{ variant_id: variant, quantity: 1 }],
  requestId = crypto.randomUUID(),
) {
  return (
    await db.query<{ id: string }>(
      'select public.place_order($1::jsonb,$2::jsonb,$3,$4::uuid) id',
      [JSON.stringify(items), JSON.stringify(shipping), payment, requestId],
    )
  ).rows[0].id;
}
let order = '';
await check('anonymous checkout and staff functions are denied', async () => {
  await db.exec('set role anon');
  await mustFail(() => place(), /permission denied/);
  await mustFail(
    () => db.query("select public.set_staff_role('other@test.local','admin')"),
    /permission denied/,
  );
  await db.exec('reset role');
});
await check('customers cannot elevate roles or alter products directly', async () => {
  await asUser(customer);
  await mustFail(
    () => db.query("select public.set_staff_role('other@test.local','super_admin')"),
    /Super admin/,
  );
  await mustFail(() => db.query('update public.products set price=1'), /permission denied/);
  await mustFail(
    () =>
      db.query(
        "insert into public.staff_members values($1,'customer@test.local','super_admin',now())",
        [customer],
      ),
    /permission denied/,
  );
});
await check('order totals come from the database and stock is reserved once', async () => {
  const key = crypto.randomUUID();
  order = await place(
    'cod',
    [{ variant_id: variant, quantity: 2, price: 1 } as { variant_id: string; quantity: number }],
    key,
  );
  const again = await place('cod', [{ variant_id: variant, quantity: 2 }], key);
  assert.equal(order, again);
  const o = (
    await db.query<{ subtotal: number; total: number }>(
      'select subtotal,total from public.orders where id=$1',
      [order],
    )
  ).rows[0];
  assert.equal(Number(o.subtotal), 17800);
  assert.equal(Number(o.total), 17800);
  assert.equal(
    (
      await db.query<{ stock: number }>('select stock from public.product_variants where id=$1', [
        variant,
      ])
    ).rows[0].stock,
    8,
  );
  const item = (
    await db.query<{ color: string }>('select color from public.order_items where order_id=$1', [
      order,
    ])
  ).rows[0];
  assert.equal(item.color, 'Default');
});
await check('overselling and duplicate variants roll back without changing inventory', async () => {
  await mustFail(() => place('cod', [{ variant_id: variant, quantity: 10 }]), /stock/);
  await mustFail(
    () =>
      place('cod', [
        { variant_id: variant, quantity: 1 },
        { variant_id: variant, quantity: 1 },
      ]),
    /Duplicate/,
  );
  assert.equal(
    (
      await db.query<{ stock: number }>('select stock from public.product_variants where id=$1', [
        variant,
      ])
    ).rows[0].stock,
    8,
  );
});
await check('customers only see their own orders and items', async () => {
  await asUser(other);
  assert.equal((await db.query('select * from public.orders where id=$1', [order])).rows.length, 0);
  assert.equal(
    (await db.query('select * from public.order_items where order_id=$1', [order])).rows.length,
    0,
  );
  await mustFail(
    () => db.query("select public.update_order_status($1,'confirmed')", [order]),
    /Staff access/,
  );
});
await check('admins can manage orders but cannot manage staff or bank settings', async () => {
  await asUser(admin);
  assert.equal((await db.query('select * from public.orders where id=$1', [order])).rows.length, 1);
  await mustFail(
    () => db.query("select public.set_staff_role('other@test.local','admin')"),
    /Super admin/,
  );
  await mustFail(() => db.query("select public.save_store_settings('{}')"), /Super admin/);
  await db.query("select public.update_order_status($1,'confirmed')", [order]);
});
await check('cancelling restores stock only once and prevents reopening', async () => {
  await db.query("select public.update_order_status($1,'cancelled')", [order]);
  await db.query("select public.update_order_status($1,'cancelled')", [order]);
  assert.equal(
    (
      await db.query<{ stock: number }>('select stock from public.product_variants where id=$1', [
        variant,
      ])
    ).rows[0].stock,
    10,
  );
  await mustFail(
    () => db.query("select public.update_order_status($1,'confirmed')", [order]),
    /not allowed/,
  );
});
await check('super admins manage verified team members and cannot remove themselves', async () => {
  await asUser(superAdmin);
  await db.query("select public.set_staff_role('other@test.local','admin')");
  await mustFail(
    () => db.query("select public.set_staff_role('super@test.local','remove')"),
    /own role/,
  );
  await db.query("select public.set_staff_role('other@test.local','remove')");
});
await check('bank transfers need real configured details', async () => {
  await asUser(customer);
  await mustFail(() => place('bank_transfer'), /unavailable/);
  await asUser(superAdmin);
  await db.query('select public.save_store_settings($1::jsonb)', [
    JSON.stringify({
      shipping_fee: 450,
      free_shipping_threshold: 15000,
      bank_name: 'Test Bank',
      bank_account_name: 'VELORA',
      bank_account_number: '123456789',
      bank_branch: 'Colombo',
      bank_transfer_enabled: true,
      footer_size_guide_enabled: true,
      footer_size_guide_label: 'Find your size',
      footer_orders_enabled: true,
      footer_orders_label: 'Track my orders',
      footer_contact_enabled: false,
      footer_contact_label: 'Talk to us',
    }),
  ]);
  const footer = (
    await db.query<{
      footer_size_guide_label: string;
      footer_orders_label: string;
      footer_contact_enabled: boolean;
    }>(
      'select footer_size_guide_label,footer_orders_label,footer_contact_enabled from public.store_settings where id=true',
    )
  ).rows[0];
  assert.equal(footer.footer_size_guide_label, 'Find your size');
  assert.equal(footer.footer_orders_label, 'Track my orders');
  assert.equal(footer.footer_contact_enabled, false);
});
let bankOrder = '';
let receipt = '';
await check('bank details are snapshotted; unapproved transfers cannot be dispatched', async () => {
  await asUser(customer);
  bankOrder = await place('bank_transfer');
  const row = (
    await db.query<{ bank_details: { bank_account_number: string }; total: number }>(
      'select bank_details,total from public.orders where id=$1',
      [bankOrder],
    )
  ).rows[0];
  assert.equal(row.bank_details.bank_account_number, '123456789');
  assert.equal(Number(row.total), 9350);
  await asUser(admin);
  await mustFail(
    () => db.query("select public.update_order_status($1,'confirmed')", [bankOrder]),
    /Approve/,
  );
  await mustFail(
    () => db.query("select public.update_order_status($1,'shipped')", [bankOrder]),
    /not allowed/,
  );
});
await check('receipt files are private and bound to the customer and order', async () => {
  await asUser(other);
  receipt = `${customer}/${bankOrder}/receipt.webp`;
  await mustFail(
    () =>
      db.query("insert into storage.objects(bucket_id,name) values('payment-receipts',$1)", [
        receipt,
      ]),
    /row-level security/,
  );
  await asUser(customer);
  await db.query("insert into storage.objects(bucket_id,name) values('payment-receipts',$1)", [
    receipt,
  ]);
  await db.query('select public.attach_receipt($1,$2)', [bankOrder, receipt]);
  await asUser(other);
  assert.equal(
    (
      await db.query(
        "select * from storage.objects where bucket_id='payment-receipts' and name=$1",
        [receipt],
      )
    ).rows.length,
    0,
  );
  await asUser(customer);
  await mustFail(
    () => db.query("select public.review_payment($1,true,'')", [bankOrder]),
    /Staff access/,
  );
});
await check('receipt rejection allows a replacement and requires a reason', async () => {
  await asUser(admin);
  await mustFail(
    () => db.query("select public.review_payment($1,false,'')", [bankOrder]),
    /reason/,
  );
  await db.query("select public.review_payment($1,false,'Reference is not visible')", [bankOrder]);
  await asUser(customer);
  const replacement = `${customer}/${bankOrder}/replacement.webp`;
  await db.query("insert into storage.objects(bucket_id,name) values('payment-receipts',$1)", [
    replacement,
  ]);
  await db.query('select public.attach_receipt($1,$2)', [bankOrder, replacement]);
});
await check(
  'approval confirms payment and allows fulfilment, but blocks paid cancellation',
  async () => {
    await asUser(admin);
    await db.query("select public.review_payment($1,true,'Matched in bank account')", [bankOrder]);
    await mustFail(
      () => db.query("select public.update_order_status($1,'cancelled')", [bankOrder]),
      /Paid orders/,
    );
    await db.query("select public.update_order_status($1,'shipped')", [bankOrder]);
    await db.query("select public.update_order_status($1,'delivered')", [bankOrder]);
    const row = (
      await db.query<{ status: string; payment_status: string }>(
        'select status,payment_status from public.orders where id=$1',
        [bankOrder],
      )
    ).rows[0];
    assert.equal(row.status, 'delivered');
    assert.equal(row.payment_status, 'paid');
  },
);
await check('database audit trail records payment decisions and staff changes', async () => {
  await asUser(superAdmin);
  const rows = (await db.query<{ action: string }>('select action from public.audit_log')).rows;
  assert(rows.some((r) => r.action === 'payment_reviewed'));
  assert(rows.some((r) => r.action === 'staff_role_changed'));
});
await check(
  'admins can save a product and rejected size updates roll back the entire edit',
  async () => {
    const product = {
      slug: 'test-linen-shirt',
      name: 'Test linen shirt',
      description: 'A test product',
      category: 'men',
      clothing_type: 'Tops',
      price: 5000,
      compare_at_price: null,
      image_url: '/images/product-placeholder.svg',
      featured: false,
      is_new: true,
      active: true,
    };
    await asUser(customer);
    await mustFail(
      () =>
        db.query('select public.save_product(null,$1::jsonb,$2::jsonb)', [
          JSON.stringify(product),
          JSON.stringify([{ color: 'Navy', size: 'M', stock: 3 }]),
        ]),
      /Staff access/,
    );
    await asUser(admin);
    const id = (
      await db.query<{ id: string }>('select public.save_product(null,$1::jsonb,$2::jsonb) id', [
        JSON.stringify(product),
        JSON.stringify([{ color: 'Navy', size: 'M', stock: 3 }]),
      ])
    ).rows[0].id;
    await mustFail(
      () =>
        db.query('select public.save_product($1,$2::jsonb,$3::jsonb)', [
          id,
          JSON.stringify({ ...product, price: 1 }),
          JSON.stringify([{ color: 'Navy', size: 'M', stock: -1 }]),
        ]),
      /Invalid colour, size, or stock/,
    );
    assert.equal(
      Number(
        (await db.query<{ price: number }>('select price from public.products where id=$1', [id]))
          .rows[0].price,
      ),
      5000,
    );
    await db.query('select public.save_product($1,$2::jsonb,$3::jsonb)', [
      id,
      JSON.stringify({ ...product, active: false }),
      JSON.stringify([{ color: 'Navy', size: 'M', stock: 3 }]),
    ]);
    await asUser(customer);
    assert.equal(
      (await db.query('select * from public.products where id=$1', [id])).rows.length,
      0,
    );
    assert.equal(
      (await db.query('select * from public.product_variants where product_id=$1', [id])).rows
        .length,
      0,
    );
  },
);
await check(
  'COD is paid only after delivery and payment state cannot be forged by customers',
  async () => {
    await asUser(other);
    const id = await place();
    await mustFail(
      () => db.query("update public.orders set payment_status='paid' where id=$1", [id]),
      /permission denied/,
    );
    await asUser(admin);
    await db.query("select public.update_order_status($1,'confirmed')", [id]);
    await db.query("select public.update_order_status($1,'shipped')", [id]);
    assert.equal(
      (
        await db.query<{ payment_status: string }>(
          'select payment_status from public.orders where id=$1',
          [id],
        )
      ).rows[0].payment_status,
      'pending',
    );
    await asUser(customer);
    await mustFail(
      () => db.query("select public.confirm_order_received($1,5,'Not my order')", [id]),
      /Invalid order/,
    );
    await asUser(other);
    await db.query("select public.confirm_order_received($1,5,'Everything arrived safely')", [id]);
    const received = (
      await db.query<{
        status: string;
        payment_status: string;
        received_at: string;
        review_rating: number;
        review_text: string;
      }>(
        'select status,payment_status,received_at,review_rating,review_text from public.orders where id=$1',
        [id],
      )
    ).rows[0];
    assert.equal(received.status, 'delivered');
    assert.equal(received.payment_status, 'paid');
    assert(received.received_at);
    assert.equal(received.review_rating, 5);
    assert.equal(received.review_text, 'Everything arrived safely');
    await mustFail(
      () => db.query("select public.confirm_order_received($1,4,'Trying twice')", [id]),
      /already been received/,
    );
  },
);
await check('database enforces hourly order limits for verified users', async () => {
  await asUser(other);
  for (let i = 0; i < 4; i++) await place();
  await mustFail(() => place(), /Order limit/);
});
await db.close();
console.log(`\n${count} database security and commerce checks passed.`);
