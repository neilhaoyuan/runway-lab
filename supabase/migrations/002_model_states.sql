create table public.model_states (
  user_id uuid primary key references auth.users(id) on delete cascade,
  state_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.model_states enable row level security;

revoke all on table public.model_states from anon;
grant select, insert, update, delete on table public.model_states to authenticated;

create policy "users can read their own model"
on public.model_states for select to authenticated
using ((select auth.uid()) = user_id);

create policy "users can create their own model"
on public.model_states for insert to authenticated
with check ((select auth.uid()) = user_id);

create policy "users can update their own model"
on public.model_states for update to authenticated
using ((select auth.uid()) = user_id)
with check ((select auth.uid()) = user_id);

create policy "users can delete their own model"
on public.model_states for delete to authenticated
using ((select auth.uid()) = user_id);
