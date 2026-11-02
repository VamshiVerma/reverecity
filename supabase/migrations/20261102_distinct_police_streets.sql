create or replace function public.distinct_police_streets()
returns table (street text) language sql stable as $$
  select distinct split_part(location_street, ' + ', 1) as street
  from public.police_logs
  where location_street is not null and log_date >= (current_date - interval '400 days')
$$;
