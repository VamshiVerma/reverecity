insert into storage.buckets (id, name, public) values ('police-log-archive', 'police-log-archive', true)
on conflict (id) do nothing;
