-- Add colour-aware inventory while preserving existing variants and order history.
alter table public.product_variants
  add column color text not null default 'Default'
  check (length(trim(color)) between 1 and 50);

alter table public.product_variants
  drop constraint if exists product_variants_product_id_size_key;

alter table public.product_variants
  add constraint product_variants_product_size_color_key unique (product_id, size, color);

alter table public.order_items
  add column color text not null default 'Default';

create or replace function public.place_order(p_items jsonb, p_shipping jsonb, p_payment text, p_request_id uuid)
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
  if v_count <> jsonb_array_length(p_items) then raise exception 'Duplicate or missing options in bag.'; end if;
  for v_item in select value from jsonb_array_elements(p_items) order by value->>'variant_id' loop
    if coalesce(v_item.value->>'quantity','') !~ '^([1-9]|10)$' then raise exception 'Quantity must be between 1 and 10.'; end if;
    select pv.id,pv.stock,p.price,p.active into v_variant from public.product_variants pv join public.products p on p.id=pv.product_id
      where pv.id=(v_item.value->>'variant_id')::uuid for update of pv,p;
    if not found or not v_variant.active then raise exception 'A product is no longer available.'; end if;
    if v_variant.stock < (v_item.value->>'quantity')::integer then raise exception 'A selected option is out of stock. Please update your bag.'; end if;
    v_total := v_total + v_variant.price*(v_item.value->>'quantity')::integer;
  end loop;
  v_shipping := case when v_total >= v_settings.free_shipping_threshold then 0 else v_settings.shipping_fee end;
  insert into public.orders(user_id,request_id,customer_name,email,phone,address,city,postal_code,notes,subtotal,shipping_fee,total,payment_method,bank_details)
    values(v_uid,p_request_id,trim(p_shipping->>'name'),v_email,p_shipping->>'phone',trim(p_shipping->>'address'),trim(p_shipping->>'city'),p_shipping->>'postal_code',coalesce(p_shipping->>'notes',''),v_total,v_shipping,v_total+v_shipping,p_payment,
      case when p_payment='bank_transfer' then jsonb_build_object('bank_name',v_settings.bank_name,'bank_account_name',v_settings.bank_account_name,'bank_account_number',v_settings.bank_account_number,'bank_branch',v_settings.bank_branch) else null end) returning id into v_id;
  for v_item in select value from jsonb_array_elements(p_items) loop
    insert into public.order_items(order_id,variant_id,product_name,size,color,quantity,unit_price,image_url)
      select v_id,pv.id,p.name,pv.size,pv.color,(v_item.value->>'quantity')::integer,p.price,p.image_url from public.product_variants pv join public.products p on p.id=pv.product_id where pv.id=(v_item.value->>'variant_id')::uuid;
    update public.product_variants set stock=stock-(v_item.value->>'quantity')::integer where id=(v_item.value->>'variant_id')::uuid;
  end loop;
  return v_id;
end; $$;

create or replace function public.save_product(p_id uuid, p_product jsonb, p_variants jsonb) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_id uuid := coalesce(p_id,gen_random_uuid()); v_row jsonb; v_size text; v_color text;
begin
  if not public.is_staff() then raise exception 'Staff access required.'; end if;
  if p_product is null or p_variants is null or jsonb_typeof(p_variants)<>'array' or jsonb_array_length(p_variants) not between 1 and 100 then raise exception 'Add at least one colour and size.'; end if;
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
    v_color := trim(v_row->>'color');
    if length(v_size) not between 1 and 20 or length(v_color) not between 1 and 50
      or coalesce(v_row->>'stock','') !~ '^[0-9]{1,6}$'
      or (v_row->>'stock')::integer > 100000 then raise exception 'Invalid colour, size, or stock.'; end if;
    insert into public.product_variants(product_id,size,color,stock) values(v_id,v_size,v_color,(v_row->>'stock')::integer)
      on conflict(product_id,size,color) do update set stock=excluded.stock;
  end loop;
  update public.product_variants pv set stock=0
    where pv.product_id=v_id and not exists(
      select 1 from jsonb_array_elements(p_variants) row_data
      where trim(row_data->>'size')=pv.size and trim(row_data->>'color')=pv.color
    );
  insert into public.audit_log(actor_id,action,target_id) values(auth.uid(),'product_saved',v_id::text);
  return v_id;
end; $$;

