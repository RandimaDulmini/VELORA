-- Run once in Supabase SQL Editor. All money is LKR; prices are database-authoritative.
create type public.staff_role as enum ('admin', 'super_admin');
create type public.order_status as enum ('pending', 'confirmed', 'shipped', 'delivered', 'cancelled');
create table public.staff_members (
  user_id uuid primary key references auth.users(id) on delete cascade,
  email text not null, role public.staff_role not null, created_at timestamptz not null default now()
);
create function public.is_staff() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.staff_members where user_id = auth.uid());
$$;
create function public.is_super_admin() returns boolean language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.staff_members where user_id = auth.uid() and role = 'super_admin');
$$;
create table public.products (
  id uuid primary key default gen_random_uuid(), slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(name) between 2 and 150), description text not null default '',
  category text not null check (category in ('women','men','teen','kids','accessories')),
  clothing_type text not null default 'Tops', price numeric(12,2) not null check (price > 0 and price <= 10000000),
  compare_at_price numeric(12,2) check (compare_at_price > price),
  image_url text not null default '/images/product-placeholder.svg', image_position text not null default 'center',
  featured boolean not null default false, is_new boolean not null default true, active boolean not null default true,
  created_at timestamptz not null default now()
);
create table public.product_variants (
  id uuid primary key default gen_random_uuid(), product_id uuid not null references public.products(id) on delete cascade,
  size text not null check (length(size) between 1 and 20), stock integer not null default 0 check (stock between 0 and 100000),
  unique(product_id,size)
);
create table public.store_settings (
  id boolean primary key default true check (id), shipping_fee numeric(12,2) not null default 450 check (shipping_fee >= 0),
  free_shipping_threshold numeric(12,2) not null default 15000 check (free_shipping_threshold >= 0),
  bank_name text not null default '', bank_account_name text not null default '', bank_account_number text not null default '',
  bank_branch text not null default '', bank_transfer_enabled boolean not null default false
);
insert into public.store_settings (id) values (true);
create table public.orders (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users(id),
  request_id uuid not null, customer_name text not null, email text not null, phone text not null,
  address text not null, city text not null, postal_code text not null, country text not null default 'Sri Lanka' check(country = 'Sri Lanka'),
  notes text not null default '', subtotal numeric(12,2) not null, shipping_fee numeric(12,2) not null,
  total numeric(12,2) not null, payment_method text not null check(payment_method in ('cod','bank_transfer')),
  payment_status text not null default 'pending' check(payment_status in ('pending','review','paid','rejected')),
  receipt_path text, payment_note text not null default '', bank_details jsonb,
  status public.order_status not null default 'pending', created_at timestamptz not null default now(),
  unique(user_id,request_id)
);
create table public.order_items (
  id uuid primary key default gen_random_uuid(), order_id uuid not null references public.orders(id) on delete cascade,
  variant_id uuid not null references public.product_variants(id), product_name text not null,
  size text not null, quantity integer not null check(quantity between 1 and 10), unit_price numeric(12,2) not null, image_url text not null
);
create table public.audit_log (
  id bigint generated always as identity primary key, actor_id uuid references auth.users(id),
  action text not null, target_id text, details jsonb, created_at timestamptz not null default now()
);
create index orders_user_created on public.orders(user_id,created_at desc);
create index orders_status_created on public.orders(status,created_at desc);
create index order_items_order on public.order_items(order_id);
create index variants_product on public.product_variants(product_id);
create index products_active_category on public.products(active,category);

alter table public.staff_members enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.store_settings enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.audit_log enable row level security;
create policy staff_read on public.staff_members for select to authenticated using(user_id = auth.uid() or public.is_super_admin());
create policy products_read on public.products for select using(active or public.is_staff());
create policy variants_read on public.product_variants for select using(exists(select 1 from public.products p where p.id = product_id and (p.active or public.is_staff())));
create policy settings_read on public.store_settings for select using(true);
create policy orders_read on public.orders for select to authenticated using(user_id = auth.uid() or public.is_staff());
create policy items_read on public.order_items for select to authenticated using(exists(select 1 from public.orders o where o.id = order_id and (o.user_id = auth.uid() or public.is_staff())));
create policy audit_read on public.audit_log for select to authenticated using(public.is_super_admin());
-- No client table writes: validated, permission-checked functions own mutations.
revoke all on public.staff_members, public.products, public.product_variants, public.store_settings, public.orders, public.order_items, public.audit_log from anon, authenticated;
grant select on public.products, public.product_variants, public.store_settings to anon, authenticated;
grant select on public.staff_members, public.orders, public.order_items, public.audit_log to authenticated;

create function public.place_order(p_items jsonb, p_shipping jsonb, p_payment text, p_request_id uuid)
returns uuid language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_id uuid; v_item record; v_variant record; v_total numeric := 0;
  v_shipping numeric; v_settings public.store_settings%rowtype; v_email text; v_count integer;
begin
  if v_uid is null then raise exception 'Please sign in to place an order.'; end if;
  perform pg_advisory_xact_lock(hashtextextended(v_uid::text, 0));
  select id into v_id from public.orders where user_id=v_uid and request_id=p_request_id;
  if v_id is not null then return v_id; end if;
  if p_request_id is null or p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 30 then raise exception 'Invalid shopping bag.'; end if;
  if (select count(*) from public.orders where user_id=v_uid and created_at > now()-interval '1 hour') >= 5 then raise exception 'Order limit reached. Please try again in an hour.'; end if;
  select email into v_email from auth.users where id=v_uid and email_confirmed_at is not null;
  if v_email is null then raise exception 'Verify your email before placing an order.'; end if;
  if p_shipping is null or coalesce(length(trim(p_shipping->>'name')),0) not between 2 and 100
    or coalesce(p_shipping->>'phone','') !~ '^(0[0-9]{9}|\+94[0-9]{9})$'
    or coalesce(length(trim(p_shipping->>'address')),0) not between 8 and 300
    or coalesce(length(trim(p_shipping->>'city')),0) not between 2 and 100
    or coalesce(p_shipping->>'postal_code','') !~ '^[0-9]{5}$'
    or length(coalesce(p_shipping->>'notes','')) > 500 then raise exception 'Please check your delivery details.'; end if;
  select * into strict v_settings from public.store_settings where id=true;
  if p_payment is null or p_payment not in ('cod','bank_transfer') then raise exception 'Invalid payment method.'; end if;
  if p_payment='bank_transfer' and (not v_settings.bank_transfer_enabled or v_settings.bank_account_number='' or v_settings.bank_name='' or v_settings.bank_account_name='') then raise exception 'Bank transfer is currently unavailable.'; end if;
  select count(distinct value->>'variant_id') into v_count from jsonb_array_elements(p_items);
  if v_count <> jsonb_array_length(p_items) then raise exception 'Duplicate or missing sizes in bag.'; end if;
  -- Consistent lock order prevents deadlocks across concurrent checkouts.
  for v_item in select value from jsonb_array_elements(p_items) order by value->>'variant_id' loop
    if coalesce(v_item.value->>'quantity','') !~ '^([1-9]|10)$' then raise exception 'Quantity must be between 1 and 10.'; end if;
    select pv.id,pv.stock,p.price,p.active into v_variant from public.product_variants pv join public.products p on p.id=pv.product_id
      where pv.id=(v_item.value->>'variant_id')::uuid for update of pv,p;
    if not found or not v_variant.active then raise exception 'A product is no longer available.'; end if;
    if v_variant.stock < (v_item.value->>'quantity')::integer then raise exception 'A selected size is out of stock. Please update your bag.'; end if;
    v_total := v_total + v_variant.price*(v_item.value->>'quantity')::integer;
  end loop;
  v_shipping := case when v_total >= v_settings.free_shipping_threshold then 0 else v_settings.shipping_fee end;
  insert into public.orders(user_id,request_id,customer_name,email,phone,address,city,postal_code,notes,subtotal,shipping_fee,total,payment_method,bank_details)
    values(v_uid,p_request_id,trim(p_shipping->>'name'),v_email,p_shipping->>'phone',trim(p_shipping->>'address'),trim(p_shipping->>'city'),p_shipping->>'postal_code',coalesce(p_shipping->>'notes',''),v_total,v_shipping,v_total+v_shipping,p_payment,
      case when p_payment='bank_transfer' then jsonb_build_object('bank_name',v_settings.bank_name,'bank_account_name',v_settings.bank_account_name,'bank_account_number',v_settings.bank_account_number,'bank_branch',v_settings.bank_branch) else null end) returning id into v_id;
  for v_item in select value from jsonb_array_elements(p_items) loop
    insert into public.order_items(order_id,variant_id,product_name,size,quantity,unit_price,image_url)
      select v_id,pv.id,p.name,pv.size,(v_item.value->>'quantity')::integer,p.price,p.image_url from public.product_variants pv join public.products p on p.id=pv.product_id where pv.id=(v_item.value->>'variant_id')::uuid;
    update public.product_variants set stock=stock-(v_item.value->>'quantity')::integer where id=(v_item.value->>'variant_id')::uuid;
  end loop;
  return v_id;
end; $$;

create function public.save_product(p_id uuid, p_product jsonb, p_variants jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid := coalesce(p_id,gen_random_uuid()); v_row jsonb; v_size text;
begin
  if not public.is_staff() then raise exception 'Staff access required.'; end if;
  if p_product is null or p_variants is null or jsonb_typeof(p_variants)<>'array' or jsonb_array_length(p_variants) not between 1 and 20 then raise exception 'Add at least one size.'; end if;
  if length(p_product->>'description') > 5000 then raise exception 'Description is too long.'; end if;
  if p_id is not null and not exists(select 1 from public.products where id=p_id) then raise exception 'Product not found.'; end if;
  if p_id is null then
    insert into public.products(id,slug,name,description,category,clothing_type,price,compare_at_price,image_url,featured,is_new,active)
      values(v_id,p_product->>'slug',p_product->>'name',p_product->>'description',p_product->>'category',p_product->>'clothing_type',(p_product->>'price')::numeric,(p_product->>'compare_at_price')::numeric,p_product->>'image_url',(p_product->>'featured')::boolean,(p_product->>'is_new')::boolean,(p_product->>'active')::boolean);
  else
    update public.products set slug=p_product->>'slug',name=p_product->>'name',description=p_product->>'description',category=p_product->>'category',clothing_type=p_product->>'clothing_type',price=(p_product->>'price')::numeric,compare_at_price=(p_product->>'compare_at_price')::numeric,image_url=p_product->>'image_url',featured=(p_product->>'featured')::boolean,is_new=(p_product->>'is_new')::boolean,active=(p_product->>'active')::boolean where id=v_id;
  end if;
  for v_row in select value from jsonb_array_elements(p_variants) loop
    v_size := trim(v_row->>'size');
    insert into public.product_variants(product_id,size,stock) values(v_id,v_size,(v_row->>'stock')::integer)
      on conflict(product_id,size) do update set stock=excluded.stock;
  end loop;
  -- Keep historical variants and order references; discontinued sizes become unavailable.
  update public.product_variants set stock=0 where product_id=v_id and size not in(select trim(value->>'size') from jsonb_array_elements(p_variants));
  insert into public.audit_log(actor_id,action,target_id) values(auth.uid(),'product_saved',v_id::text);
  return v_id;
end; $$;

create function public.set_staff_role(p_email text, p_role text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_user uuid; v_email text;
begin
  perform pg_advisory_xact_lock(901234);
  if not public.is_super_admin() then raise exception 'Super admin access required.'; end if;
  if p_role is null or p_role not in ('admin','super_admin','remove') then raise exception 'Invalid role.'; end if;
  select id,email into v_user,v_email from auth.users where lower(email)=lower(trim(p_email)) and email_confirmed_at is not null;
  if v_user is null then raise exception 'This person must register and verify their email first.'; end if;
  if v_user=auth.uid() then raise exception 'You cannot change your own role.'; end if;
  if p_role='remove' then delete from public.staff_members where user_id=v_user;
  else insert into public.staff_members(user_id,email,role) values(v_user,v_email,p_role::public.staff_role) on conflict(user_id) do update set role=excluded.role; end if;
  insert into public.audit_log(actor_id,action,target_id,details) values(auth.uid(),'staff_role_changed',v_user::text,jsonb_build_object('role',p_role));
end; $$;

create function public.update_order_status(p_id uuid,p_status public.order_status) returns void
language plpgsql security definer set search_path = '' as $$
declare v_order public.orders%rowtype; v_item record;
begin
  if not public.is_staff() then raise exception 'Staff access required.'; end if;
  select * into v_order from public.orders where id=p_id for update;
  if not found then raise exception 'Order not found.'; end if;
  if p_status=v_order.status then return; end if;
  if p_status is null or not ((v_order.status='pending' and p_status in ('confirmed','cancelled')) or (v_order.status='confirmed' and p_status in ('shipped','cancelled')) or (v_order.status='shipped' and p_status='delivered')) then raise exception 'This order status change is not allowed.'; end if;
  if p_status in ('confirmed','shipped','delivered') and v_order.payment_method='bank_transfer' and v_order.payment_status <> 'paid' then raise exception 'Approve the bank payment first.'; end if;
  if p_status='cancelled' then
    if v_order.payment_status='paid' then raise exception 'Paid orders require a refund handled by the store before cancellation. Contact the customer.'; end if;
    for v_item in select variant_id,quantity from public.order_items where order_id=p_id order by variant_id loop
      update public.product_variants set stock=stock+v_item.quantity where id=v_item.variant_id;
    end loop;
  end if;
  update public.orders set status=p_status,payment_status=case when p_status='delivered' and payment_method='cod' then 'paid' else payment_status end where id=p_id;
  insert into public.audit_log(actor_id,action,target_id,details) values(auth.uid(),'order_status_changed',p_id::text,jsonb_build_object('status',p_status));
end; $$;

create function public.attach_receipt(p_order_id uuid,p_path text) returns void
language plpgsql security definer set search_path = '' as $$
declare v_order public.orders%rowtype;
begin
  select * into v_order from public.orders where id=p_order_id and user_id=auth.uid() for update;
  if not found or v_order.payment_method<>'bank_transfer' or v_order.status<>'pending' or v_order.payment_status not in ('pending','rejected') then raise exception 'Receipt upload is not available for this order.'; end if;
  if p_path is null or p_path not like auth.uid()::text || '/' || p_order_id::text || '/%' or not exists(select 1 from storage.objects where bucket_id='payment-receipts' and name=p_path) then raise exception 'Receipt not found.'; end if;
  update public.orders set receipt_path=p_path,payment_status='review',payment_note='' where id=p_order_id;
  insert into public.audit_log(actor_id,action,target_id) values(auth.uid(),'receipt_uploaded',p_order_id::text);
end; $$;

create function public.review_payment(p_order_id uuid,p_approve boolean,p_note text default '') returns void
language plpgsql security definer set search_path = '' as $$
declare v_order public.orders%rowtype;
begin
  if not public.is_staff() then raise exception 'Staff access required.'; end if;
  select * into v_order from public.orders where id=p_order_id for update;
  if not found or v_order.status<>'pending' or v_order.payment_status<>'review' or v_order.receipt_path is null or p_approve is null then raise exception 'There is no receipt awaiting review.'; end if;
  if length(coalesce(p_note,''))>500 or (not p_approve and length(trim(coalesce(p_note,'')))<3) then raise exception 'Please give the customer a reason for rejection.'; end if;
  update public.orders set payment_status=case when p_approve then 'paid' else 'rejected' end,
    status=case when p_approve then 'confirmed'::public.order_status else status end,payment_note=coalesce(p_note,'') where id=p_order_id;
  insert into public.audit_log(actor_id,action,target_id,details) values(auth.uid(),'payment_reviewed',p_order_id::text,jsonb_build_object('approved',p_approve,'note',p_note));
end; $$;

create function public.save_store_settings(p_settings jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_super_admin() then raise exception 'Super admin access required.'; end if;
  if (p_settings->>'bank_transfer_enabled')::boolean and (coalesce(length(trim(p_settings->>'bank_name')),0)<2 or coalesce(length(trim(p_settings->>'bank_account_name')),0)<2 or coalesce(length(trim(p_settings->>'bank_account_number')),0)<4) then raise exception 'Complete the bank details before enabling transfers.'; end if;
  update public.store_settings set shipping_fee=(p_settings->>'shipping_fee')::numeric,free_shipping_threshold=(p_settings->>'free_shipping_threshold')::numeric,
    bank_name=left(p_settings->>'bank_name',100),bank_account_name=left(p_settings->>'bank_account_name',100),bank_account_number=left(p_settings->>'bank_account_number',50),bank_branch=left(p_settings->>'bank_branch',100),bank_transfer_enabled=(p_settings->>'bank_transfer_enabled')::boolean where id=true;
  insert into public.audit_log(actor_id,action) values(auth.uid(),'store_settings_changed');
end; $$;

-- Supabase Storage: catalogue is public; bank slips are private, read only by owner/staff.
insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values
  ('product-images','product-images',true,4194304,array['image/webp']),
  ('payment-receipts','payment-receipts',false,4194304,array['image/webp']);
create policy product_image_read on storage.objects for select using(bucket_id='product-images');
create policy product_image_insert on storage.objects for insert to authenticated with check(bucket_id='product-images' and public.is_staff());
create policy receipt_read on storage.objects for select to authenticated using(bucket_id='payment-receipts' and (public.is_staff() or (storage.foldername(name))[1]=auth.uid()::text));
create policy receipt_insert on storage.objects for insert to authenticated with check(
  bucket_id='payment-receipts' and (storage.foldername(name))[1]=auth.uid()::text
  and exists(select 1 from public.orders where id::text=(storage.foldername(name))[2] and user_id=auth.uid() and payment_method='bank_transfer' and status='pending' and payment_status in ('pending','rejected'))
);

revoke execute on function public.is_staff(),public.is_super_admin() from public;
grant execute on function public.is_staff(),public.is_super_admin() to anon,authenticated;
revoke execute on function public.place_order(jsonb,jsonb,text,uuid),public.save_product(uuid,jsonb,jsonb),public.set_staff_role(text,text),public.update_order_status(uuid,public.order_status),public.attach_receipt(uuid,text),public.review_payment(uuid,boolean,text),public.save_store_settings(jsonb) from public,anon;
grant execute on function public.place_order(jsonb,jsonb,text,uuid),public.save_product(uuid,jsonb,jsonb),public.set_staff_role(text,text),public.update_order_status(uuid,public.order_status),public.attach_receipt(uuid,text),public.review_payment(uuid,boolean,text),public.save_store_settings(jsonb) to authenticated;
