-- Let super admins publish an editable size chart and contact details.
alter table public.store_settings
  add column size_guide_intro text not null default 'Use this chart as a general guide. Product measurements and fit can vary by style, so contact us if you need help choosing.'
    check (length(trim(size_guide_intro)) between 1 and 1000),
  add column size_guide_chart jsonb not null default '[{"size":"XS","bust":"81–84","waist":"63–66","hips":"86–89"},{"size":"S","bust":"86–89","waist":"68–71","hips":"91–94"},{"size":"M","bust":"91–94","waist":"73–76","hips":"96–99"},{"size":"L","bust":"96–101","waist":"78–83","hips":"101–106"},{"size":"XL","bust":"103–108","waist":"85–90","hips":"108–113"},{"size":"XXL","bust":"110–116","waist":"92–98","hips":"115–121"}]'::jsonb
    check (jsonb_typeof(size_guide_chart) = 'array' and jsonb_array_length(size_guide_chart) between 1 and 20),
  add column contact_intro text not null default 'Questions about your fit, a piece you love, or an order? Get in touch and include your order number if you have one.'
    check (length(contact_intro) <= 1000),
  add column contact_email text not null default '' check (length(contact_email) <= 254),
  add column contact_phone text not null default '' check (length(contact_phone) <= 30),
  add column contact_whatsapp text not null default '' check (length(contact_whatsapp) <= 30),
  add column contact_address text not null default '' check (length(contact_address) <= 500),
  add column contact_hours text not null default '' check (length(contact_hours) <= 300);

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
  if p_settings ? 'size_guide_intro' and coalesce(length(trim(p_settings->>'size_guide_intro')),0) not between 1 and 1000 then
    raise exception 'Add a size-guide introduction of up to 1,000 characters.';
  end if;
  if p_settings ? 'size_guide_chart' then
    if jsonb_typeof(p_settings->'size_guide_chart') is distinct from 'array' then
      raise exception 'The size chart is invalid.';
    end if;
    if jsonb_array_length(p_settings->'size_guide_chart') not between 1 and 20 then
      raise exception 'Add between 1 and 20 size-chart rows.';
    end if;
    if exists (
      select 1 from jsonb_array_elements(p_settings->'size_guide_chart') item(value)
      where jsonb_typeof(item.value) <> 'object'
        or coalesce(length(trim(item.value->>'size')),0) not between 1 and 20
        or coalesce(length(trim(item.value->>'bust')),0) not between 1 and 20
        or coalesce(length(trim(item.value->>'waist')),0) not between 1 and 20
        or coalesce(length(trim(item.value->>'hips')),0) not between 1 and 20
    ) then raise exception 'Complete every value in the size chart.';
    end if;
  end if;
  if (p_settings ? 'contact_intro' and length(p_settings->>'contact_intro') > 1000)
    or (p_settings ? 'contact_email' and length(trim(p_settings->>'contact_email')) > 254)
    or (p_settings ? 'contact_phone' and length(trim(p_settings->>'contact_phone')) > 30)
    or (p_settings ? 'contact_whatsapp' and length(trim(p_settings->>'contact_whatsapp')) > 30)
    or (p_settings ? 'contact_address' and length(p_settings->>'contact_address') > 500)
    or (p_settings ? 'contact_hours' and length(p_settings->>'contact_hours') > 300)
    then raise exception 'One or more contact details are too long.';
  end if;
  if p_settings ? 'contact_email' and trim(p_settings->>'contact_email') <> '' and trim(p_settings->>'contact_email') !~* '^[^[:space:]@]+@[^[:space:]@]+\.[^[:space:]@]+$' then
    raise exception 'Enter a valid contact email address.';
  end if;
  if (p_settings ? 'contact_phone' and trim(p_settings->>'contact_phone') <> '' and trim(p_settings->>'contact_phone') !~ '^\+?[0-9 ()-]{7,30}$')
    or (p_settings ? 'contact_whatsapp' and trim(p_settings->>'contact_whatsapp') <> '' and trim(p_settings->>'contact_whatsapp') !~ '^\+?[0-9 ()-]{7,30}$') then
    raise exception 'Enter a valid contact number.';
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
    footer_contact_label=case when p_settings ? 'footer_contact_label' then trim(p_settings->>'footer_contact_label') else footer_contact_label end,
    size_guide_intro=case when p_settings ? 'size_guide_intro' then trim(p_settings->>'size_guide_intro') else size_guide_intro end,
    size_guide_chart=case when p_settings ? 'size_guide_chart' then p_settings->'size_guide_chart' else size_guide_chart end,
    contact_intro=case when p_settings ? 'contact_intro' then trim(p_settings->>'contact_intro') else contact_intro end,
    contact_email=case when p_settings ? 'contact_email' then trim(p_settings->>'contact_email') else contact_email end,
    contact_phone=case when p_settings ? 'contact_phone' then trim(p_settings->>'contact_phone') else contact_phone end,
    contact_whatsapp=case when p_settings ? 'contact_whatsapp' then trim(p_settings->>'contact_whatsapp') else contact_whatsapp end,
    contact_address=case when p_settings ? 'contact_address' then trim(p_settings->>'contact_address') else contact_address end,
    contact_hours=case when p_settings ? 'contact_hours' then trim(p_settings->>'contact_hours') else contact_hours end
    where id=true;
  insert into public.audit_log(actor_id,action) values(auth.uid(),'store_settings_changed');
end; $$;
