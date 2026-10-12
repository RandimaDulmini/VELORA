-- Let super admins manage the three customer-help links shown in the storefront footer.
alter table public.store_settings
  add column footer_size_guide_enabled boolean not null default true,
  add column footer_size_guide_label text not null default 'Size guide'
    check (length(trim(footer_size_guide_label)) between 1 and 40),
  add column footer_orders_enabled boolean not null default true,
  add column footer_orders_label text not null default 'My orders'
    check (length(trim(footer_orders_label)) between 1 and 40),
  add column footer_contact_enabled boolean not null default true,
  add column footer_contact_label text not null default 'Contact us'
    check (length(trim(footer_contact_label)) between 1 and 40);

create or replace function public.save_store_settings(p_settings jsonb) returns void
language plpgsql security definer set search_path = '' as $$
begin
  if not public.is_super_admin() then raise exception 'Super admin access required.'; end if;
  if (p_settings->>'bank_transfer_enabled')::boolean and (coalesce(length(trim(p_settings->>'bank_name')),0)<2 or coalesce(length(trim(p_settings->>'bank_account_name')),0)<2 or coalesce(length(trim(p_settings->>'bank_account_number')),0)<4) then raise exception 'Complete the bank details before enabling transfers.'; end if;
  if (p_settings ? 'footer_size_guide_label' and coalesce(length(trim(p_settings->>'footer_size_guide_label')),0) not between 1 and 40)
    or (p_settings ? 'footer_orders_label' and coalesce(length(trim(p_settings->>'footer_orders_label')),0) not between 1 and 40)
    or (p_settings ? 'footer_contact_label' and coalesce(length(trim(p_settings->>'footer_contact_label')),0) not between 1 and 40)
    then raise exception 'Customer link labels must be between 1 and 40 characters.';
  end if;
  update public.store_settings set
    shipping_fee=(p_settings->>'shipping_fee')::numeric,
    free_shipping_threshold=(p_settings->>'free_shipping_threshold')::numeric,
    bank_name=left(p_settings->>'bank_name',100),
    bank_account_name=left(p_settings->>'bank_account_name',100),
    bank_account_number=left(p_settings->>'bank_account_number',50),
    bank_branch=left(p_settings->>'bank_branch',100),
    bank_transfer_enabled=(p_settings->>'bank_transfer_enabled')::boolean,
    footer_size_guide_enabled=coalesce((p_settings->>'footer_size_guide_enabled')::boolean,footer_size_guide_enabled),
    footer_size_guide_label=case when p_settings ? 'footer_size_guide_label' then trim(p_settings->>'footer_size_guide_label') else footer_size_guide_label end,
    footer_orders_enabled=coalesce((p_settings->>'footer_orders_enabled')::boolean,footer_orders_enabled),
    footer_orders_label=case when p_settings ? 'footer_orders_label' then trim(p_settings->>'footer_orders_label') else footer_orders_label end,
    footer_contact_enabled=coalesce((p_settings->>'footer_contact_enabled')::boolean,footer_contact_enabled),
    footer_contact_label=case when p_settings ? 'footer_contact_label' then trim(p_settings->>'footer_contact_label') else footer_contact_label end
    where id=true;
  insert into public.audit_log(actor_id,action) values(auth.uid(),'store_settings_changed');
end; $$;
