create extension if not exists "pgcrypto";

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  starting_cash numeric(16,2) not null check (starting_cash >= 0),
  created_at timestamptz not null default now()
);

create table public.historical_months (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  month date not null,
  revenue numeric(16,2) not null check (revenue >= 0),
  payroll numeric(16,2) not null check (payroll >= 0),
  cloud numeric(16,2) not null check (cloud >= 0),
  marketing numeric(16,2) not null check (marketing >= 0),
  software numeric(16,2) not null check (software >= 0),
  other_expenses numeric(16,2) not null check (other_expenses >= 0),
  ending_cash numeric(16,2) not null,
  unique(company_id, month)
);

create table public.scenarios (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 120),
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.scenario_assumptions (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null unique references public.scenarios(id) on delete cascade,
  assumptions_json jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.scenario_results (
  id uuid primary key default gen_random_uuid(),
  scenario_id uuid not null references public.scenarios(id) on delete cascade,
  month date not null,
  revenue numeric(16,2) not null,
  expenses numeric(16,2) not null,
  net_cash_flow numeric(16,2) not null,
  ending_cash numeric(16,2) not null,
  calculation_version text not null default 'v1',
  unique(scenario_id, month)
);

create index historical_months_company_month_idx on public.historical_months(company_id, month);
create index scenarios_company_idx on public.scenarios(company_id);
create index scenario_results_scenario_month_idx on public.scenario_results(scenario_id, month);

alter table public.companies enable row level security;
alter table public.historical_months enable row level security;
alter table public.scenarios enable row level security;
alter table public.scenario_assumptions enable row level security;
alter table public.scenario_results enable row level security;

create policy "company owners can manage companies" on public.companies for all using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "company owners can manage historical months" on public.historical_months for all using (exists (select 1 from public.companies c where c.id = company_id and c.user_id = auth.uid())) with check (exists (select 1 from public.companies c where c.id = company_id and c.user_id = auth.uid()));
create policy "company owners can manage scenarios" on public.scenarios for all using (exists (select 1 from public.companies c where c.id = company_id and c.user_id = auth.uid())) with check (exists (select 1 from public.companies c where c.id = company_id and c.user_id = auth.uid()));
create policy "company owners can manage assumptions" on public.scenario_assumptions for all using (exists (select 1 from public.scenarios s join public.companies c on c.id = s.company_id where s.id = scenario_id and c.user_id = auth.uid())) with check (exists (select 1 from public.scenarios s join public.companies c on c.id = s.company_id where s.id = scenario_id and c.user_id = auth.uid()));
create policy "company owners can manage results" on public.scenario_results for all using (exists (select 1 from public.scenarios s join public.companies c on c.id = s.company_id where s.id = scenario_id and c.user_id = auth.uid())) with check (exists (select 1 from public.scenarios s join public.companies c on c.id = s.company_id where s.id = scenario_id and c.user_id = auth.uid()));
