-- Let customers confirm delivery and leave one review for their order.
alter table public.orders
  add column received_at timestamptz,
  add column review_rating smallint check (review_rating between 1 and 5),
  add column review_text text check (review_text is null or length(trim(review_text)) between 3 and 1000),
  add column review_created_at timestamptz,
  add constraint order_review_complete check (
    (received_at is null and review_rating is null and review_text is null and review_created_at is null)
    or
    (received_at is not null and review_rating is not null and review_text is not null and review_created_at is not null)
  );

create function public.confirm_order_received(p_order_id uuid, p_rating integer, p_review text)
returns void language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_order public.orders%rowtype;
begin
  if v_uid is null then raise exception 'Please sign in to confirm this order.'; end if;

  select * into v_order from public.orders where id=p_order_id for update;
  if not found or v_order.user_id <> v_uid then raise exception 'Invalid order.'; end if;
  if v_order.received_at is not null then raise exception 'This order has already been received.'; end if;
  if v_order.status not in ('shipped','delivered') then
    raise exception 'Only shipped or delivered orders can be marked as received.';
  end if;
  if p_rating is null or p_rating not between 1 and 5
    or length(trim(coalesce(p_review,''))) not between 3 and 1000 then
    raise exception 'Please provide a rating and short review.';
  end if;

  update public.orders
    set status='delivered',
        received_at=now(),
        review_rating=p_rating,
        review_text=trim(p_review),
        review_created_at=now(),
        payment_status=case when payment_method='cod' then 'paid' else payment_status end
    where id=p_order_id;

  insert into public.audit_log(actor_id,action,target_id,details)
    values(v_uid,'order_received',p_order_id::text,jsonb_build_object('rating',p_rating));
end; $$;

revoke execute on function public.confirm_order_received(uuid,integer,text) from public,anon;
grant execute on function public.confirm_order_received(uuid,integer,text) to authenticated;

