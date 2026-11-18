-- Applied to Supabase DEV on 2026-11-18. Keep in source control for review.
-- Existing users only: never creates auth.users and never exposes service-role keys.
create or replace function public.ttrail_admin_register_existing_user(
 p_email text,p_name text,p_sex text,p_size text,p_tcenter boolean,p_role text)
returns boolean language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 if auth.uid() is null or not public.ttrail_is_admin() then raise exception 'Acceso no autorizado'; end if;
 if p_name is null or length(trim(p_name))<2 or p_sex not in ('H','M')
    or p_size not in ('XS','S','M') or p_role not in ('athlete','coach','admin')
 then raise exception 'Datos de atleta no válidos'; end if;
 select id into target from auth.users where lower(email)=lower(trim(p_email));
 if target is null then return false; end if;
 insert into public.ttrail_athletes(id,display_name,sex,season_size,tcenter_enabled,role)
 values(target,trim(p_name),p_sex,p_size,p_tcenter,p_role)
 on conflict(id) do update set display_name=excluded.display_name,
 sex=excluded.sex,season_size=excluded.season_size,tcenter_enabled=excluded.tcenter_enabled,role=excluded.role;
 return true;
end $$;
revoke all on function public.ttrail_admin_register_existing_user(text,text,text,text,boolean,text) from public,anon;
grant execute on function public.ttrail_admin_register_existing_user(text,text,text,text,boolean,text) to authenticated;

drop index if exists public.tc_one_track_week;
create unique index tc_one_track_week on public.ttrail_tc_entries
(athlete_id,date_trunc('week',activity_date::timestamp))
where kind='TRK' and status <> 'rejected';
drop index if exists public.tc_one_class_per_day;
create unique index tc_one_class_per_day on public.ttrail_tc_entries
(athlete_id,kind,activity_date)
where kind in ('TTR','TR') and status <> 'rejected';
drop index if exists public.tc_one_event;
create unique index tc_one_event on public.ttrail_tc_entries
(athlete_id,event_id,kind)
where event_id is not null and status <> 'rejected';
create unique index if not exists ttrail_one_approved_challenge_mark
on public.ttrail_challenge_entries(athlete_id,challenge_id)
where status='approved';
