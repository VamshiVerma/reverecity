-- Server-side police aggregates (avoids the API's 1000-row cap).
create or replace function public.police_stats(since date, until date, streets text[] default null)
returns json language sql stable as $$
  with base as (
    select * from public.police_logs
    where log_date between since and until
      and (streets is null or exists (select 1 from unnest(streets) s where location_street ilike '%' || s || '%'))
  )
  select json_build_object(
    'total', (select count(*) from base),
    'by_category', coalesce((select json_agg(x order by x.n desc) from (select call_type_category k, count(*) n from base group by 1) x), '[]'),
    'by_street', coalesce((select json_agg(x order by x.n desc) from (select location_street k, count(*) n from base where location_street is not null group by 1 order by 2 desc limit 10) x), '[]'),
    'by_hour', coalesce((select json_agg(x order by x.n desc) from (select left(time_24h,2) k, count(*) n from base group by 1 order by 2 desc limit 6) x), '[]'),
    'by_day', coalesce((select json_agg(x order by x.k) from (select log_date k, count(*) n from base group by 1) x), '[]'),
    'notable', coalesce((select json_agg(x) from (
        select call_number, log_date, time_24h, call_reason, action, call_type_category, action_category, location_street
        from base
        where call_type_category in ('VIOLENCE_THREATS','DOMESTIC','THEFT_PROPERTY','CRASH','SUSPICIOUS','DISTURBANCE') or action_category = 'ARREST'
        order by timestamp desc limit 25) x), '[]'),
    'sources', coalesce((select json_agg(distinct source_url) from base), '[]')
  );
$$;
