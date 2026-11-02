create or replace function public.police_daily()
returns table (log_date date, calls bigint, reports bigint, incidents bigint)
language sql stable as $$
  select log_date,
         count(*) as calls,
         count(*) filter (where action_category = 'REPORT') as reports,
         count(*) filter (where action_category = 'ARREST' or call_type_category in ('DOMESTIC','VIOLENCE_THREATS','THEFT_PROPERTY')) as incidents
  from public.police_logs group by log_date order by log_date
$$;
