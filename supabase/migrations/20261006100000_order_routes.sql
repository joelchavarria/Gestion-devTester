create table public.order_routes (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  order_id uuid not null unique references public.orders(id) on delete cascade,
  driver_id uuid references public.driver_profiles(id) on delete set null,
  origin_latitude numeric(10,7) not null,
  origin_longitude numeric(10,7) not null,
  destination_latitude numeric(10,7) not null,
  destination_longitude numeric(10,7) not null,
  encoded_polyline text not null,
  distance_m integer,
  duration_s integer,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index order_routes_company_idx on public.order_routes(company_id);
create index order_routes_driver_idx on public.order_routes(driver_id);

create trigger set_order_routes_updated_at
before update on public.order_routes
for each row execute procedure public.set_updated_at();

alter table public.order_routes enable row level security;

create policy "Company members can read order routes"
on public.order_routes for select
using (public.is_company_member(company_id));

create policy "Company members can insert order routes"
on public.order_routes for insert
with check (public.is_company_member(company_id));

create policy "Company members can update order routes"
on public.order_routes for update
using (public.is_company_member(company_id))
with check (public.is_company_member(company_id));

grant select, insert, update, delete on public.order_routes to authenticated, service_role;

alter publication supabase_realtime add table public.order_routes;
