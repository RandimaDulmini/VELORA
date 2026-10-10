-- 1. Register on your website and verify your email.
-- 2. Replace the email below, then run this once as database owner in Supabase SQL Editor.
insert into public.staff_members(user_id,email,role)
select id,email,'super_admin'::public.staff_role from auth.users
where lower(email)=lower('thilokyaangeesa@gmaill.com') and email_confirmed_at is not null
on conflict(user_id) do update set role='super_admin';
-- Confirm exactly the intended account appears. Subsequent staff management uses /admin/team.
select email,role from public.staff_members;
