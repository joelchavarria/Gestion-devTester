-- DevTesters Delivery: multi-tenant operational schema.
-- Every operational row belongs to a company. RLS prevents cross-company access.

create extension if not exists pgcrypto;

create type public.app_role as enum ('owner', 'admin', 'supervisor', 'operator', 'driver');
create type public.service_type as enum ('delivery', 'errand', 'package');
create type public.order_status as enum (
  'new', 'awaiting_confirmation', 'confirmed', 'pending_assignment', 'assigned',
  'to_merchant', 'picking_up', 'to_customer', 'delivered', 'cancelled'
);
create type public.payment_method as enum ('cash', 'bank_transfer');
create type public.transfer_status as enum ('not_required', 'pending_validation', 'validated', 'rejected');
create type public.vehicle_status as enum ('active', 'in_maintenance', 'damaged', 'inactive');
create type public.shift_status as enum ('open', 'closed', 'blocked');
create type public.incident_status as enum ('open', 'in_review', 'resolved');
create type public.incident_priority as enum ('low', 'normal', 'medium', 'high', 'critical');
create type public.maintenance_status as enum ('planned', 'in_progress', 'completed', 'cancelled');

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.companies (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  display_name text not null,
  slug text not null unique,
  phone text,
  email text,
  city text not null default 'Granada, Nicaragua',
  currency_code char(3) not null default 'NIO',
  timezone text not null default 'America/Managua',
  logo_url text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.company_members (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  is_active boolean not null default true,
  invited_by uuid references auth.users(id),
  joined_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, user_id)
);

create table public.company_settings (
  company_id uuid primary key references public.companies(id) on delete cascade,
  business_hours jsonb not null default '{"monday":{"enabled":true,"from":"08:00","to":"21:00"},"tuesday":{"enabled":true,"from":"08:00","to":"21:00"},"wednesday":{"enabled":true,"from":"08:00","to":"21:00"},"thursday":{"enabled":true,"from":"08:00","to":"21:00"},"friday":{"enabled":true,"from":"08:00","to":"21:00"},"saturday":{"enabled":true,"from":"08:00","to":"21:00"},"sunday":{"enabled":true,"from":"08:00","to":"21:00"}}'::jsonb,
  maintenance_interval_km integer not null default 1500 check (maintenance_interval_km > 0),
  base_management_fee numeric(12,2) not null default 35 check (base_management_fee >= 0),
  route_deviation_threshold_m integer not null default 500 check (route_deviation_threshold_m > 0),
  otp_delivery_required boolean not null default true,
  gps_sharing_mode text not null default 'active_orders_only' check (gps_sharing_mode in ('active_orders_only', 'active_shift')),
  allow_operator_price_override boolean not null default true,
  cancellation_after_purchase_rule text not null default 'product_management_delivery' check (cancellation_after_purchase_rule in ('none', 'product_only', 'product_management', 'product_management_delivery', 'manual')),
  updated_at timestamptz not null default now()
);

create table public.whatsapp_accounts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null unique references public.companies(id) on delete cascade,
  provider text not null default 'meta_cloud' check (provider in ('meta_cloud', 'mock')),
  phone_number text,
  phone_number_id text,
  business_account_id text,
  connection_status text not null default 'disconnected' check (connection_status in ('disconnected', 'pending', 'connected', 'error')),
  encrypted_access_token text,
  welcome_message text not null default '¡Hola! ¿Qué deseas pedir hoy?',
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.message_templates (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  key text not null,
  name text not null,
  body text not null,
  is_active boolean not null default true,
  meta_template_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, key)
);

create table public.service_zones (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text,
  delivery_fee numeric(12,2) not null check (delivery_fee >= 0),
  minimum_fee numeric(12,2) not null default 0 check (minimum_fee >= 0),
  polygon_geojson jsonb,
  sort_order integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, name)
);

create table public.customers (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  full_name text not null,
  phone text not null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, phone)
);

create table public.customer_addresses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  label text,
  address_line text not null,
  reference text,
  zone_id uuid references public.service_zones(id) on delete set null,
  latitude numeric(10,7),
  longitude numeric(10,7),
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.conversations (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  customer_id uuid not null references public.customers(id) on delete cascade,
  whatsapp_conversation_id text,
  assignee_id uuid references auth.users(id) on delete set null,
  status text not null default 'open' check (status in ('open', 'waiting', 'resolved', 'archived')),
  last_message_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.messages (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  conversation_id uuid not null references public.conversations(id) on delete cascade,
  external_id text,
  direction text not null check (direction in ('inbound', 'outbound')),
  sender_type text not null check (sender_type in ('customer', 'user', 'system')),
  sender_user_id uuid references auth.users(id) on delete set null,
  body text,
  content_type text not null default 'text',
  media_path text,
  delivery_status text,
  sent_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (company_id, external_id)
);

create table public.driver_profiles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  member_id uuid not null unique references public.company_members(id) on delete cascade,
  license_number text,
  emergency_contact text,
  rating numeric(3,2) not null default 5 check (rating between 0 and 5),
  is_available boolean not null default false,
  invite_status text not null default 'pending' check (invite_status in ('pending', 'activated', 'disabled')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.vehicles (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  code text not null,
  plate text not null,
  make text not null,
  model text not null,
  model_year integer,
  color text,
  fuel_type text not null default 'gasolina_regular',
  current_odometer_km integer not null default 0 check (current_odometer_km >= 0),
  fuel_level_percent smallint check (fuel_level_percent between 0 and 100),
  status public.vehicle_status not null default 'active',
  next_maintenance_km integer,
  documents jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, code),
  unique (company_id, plate)
);

create table public.driver_shifts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  driver_id uuid not null references public.driver_profiles(id) on delete restrict,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  status public.shift_status not null default 'open',
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  start_odometer_km integer not null check (start_odometer_km >= 0),
  end_odometer_km integer check (end_odometer_km >= start_odometer_km),
  fuel_level_start smallint check (fuel_level_start between 0 and 100),
  fuel_level_end smallint check (fuel_level_end between 0 and 100),
  opening_cash numeric(12,2) not null default 0 check (opening_cash >= 0),
  closing_cash numeric(12,2),
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index one_open_shift_per_driver on public.driver_shifts(driver_id) where ended_at is null;
create unique index one_open_shift_per_vehicle on public.driver_shifts(vehicle_id) where ended_at is null;

create table public.fuel_logs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  shift_id uuid references public.driver_shifts(id) on delete set null,
  driver_id uuid not null references public.driver_profiles(id) on delete restrict,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  odometer_km integer not null check (odometer_km >= 0),
  liters numeric(10,3) not null check (liters > 0),
  amount numeric(12,2) not null check (amount >= 0),
  fuel_level_before smallint check (fuel_level_before between 0 and 100),
  fuel_level_after smallint check (fuel_level_after between 0 and 100),
  station_name text,
  receipt_path text,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.maintenance_records (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  vehicle_id uuid not null references public.vehicles(id) on delete restrict,
  kind text not null,
  status public.maintenance_status not null default 'planned',
  due_at_km integer,
  due_date date,
  completed_at timestamptz,
  odometer_km integer,
  cost numeric(12,2) not null default 0 check (cost >= 0),
  supplier text,
  notes text,
  approved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  order_number text not null,
  conversation_id uuid references public.conversations(id) on delete set null,
  customer_id uuid not null references public.customers(id) on delete restrict,
  address_id uuid references public.customer_addresses(id) on delete set null,
  service_type public.service_type not null,
  merchant_name text,
  merchant_address text,
  pickup_notes text,
  delivery_address text not null,
  delivery_reference text,
  delivery_latitude numeric(10,7),
  delivery_longitude numeric(10,7),
  zone_id uuid references public.service_zones(id) on delete set null,
  status public.order_status not null default 'new',
  priority smallint not null default 3 check (priority between 1 and 5),
  payment_method public.payment_method not null,
  transfer_status public.transfer_status not null default 'not_required',
  transfer_receipt_path text,
  transfer_validated_by uuid references auth.users(id) on delete set null,
  transfer_validated_at timestamptz,
  product_amount numeric(12,2) not null default 0 check (product_amount >= 0),
  management_fee numeric(12,2) not null default 0 check (management_fee >= 0),
  delivery_fee numeric(12,2) not null default 0 check (delivery_fee >= 0),
  adjustment_amount numeric(12,2) not null default 0,
  total_amount numeric(12,2) generated always as (product_amount + management_fee + delivery_fee + adjustment_amount) stored,
  amount_received numeric(12,2),
  change_due numeric(12,2) not null default 0 check (change_due >= 0),
  purchase_completed_at timestamptz,
  cancellation_reason text,
  cancellation_amount numeric(12,2) not null default 0 check (cancellation_amount >= 0),
  cancelled_by uuid references auth.users(id) on delete set null,
  cancelled_at timestamptz,
  delivery_otp_hash text,
  delivery_otp_expires_at timestamptz,
  delivery_otp_verified_at timestamptz,
  driver_id uuid references public.driver_profiles(id) on delete set null,
  assigned_at timestamptz,
  delivered_at timestamptz,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, order_number)
);

create table public.order_status_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status public.order_status,
  to_status public.order_status not null,
  actor_user_id uuid references auth.users(id) on delete set null,
  actor_type text not null check (actor_type in ('owner', 'admin', 'supervisor', 'operator', 'driver', 'system')),
  note text,
  created_at timestamptz not null default now()
);

create table public.order_assignments (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  driver_id uuid not null references public.driver_profiles(id) on delete restrict,
  assigned_by uuid references auth.users(id) on delete set null,
  accepted_at timestamptz,
  rejected_at timestamptz,
  rejection_reason text,
  unassigned_at timestamptz,
  created_at timestamptz not null default now()
);
create unique index one_active_assignment_per_order on public.order_assignments(order_id) where unassigned_at is null;

create table public.cash_drawer_transactions (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  shift_id uuid not null references public.driver_shifts(id) on delete cascade,
  driver_id uuid not null references public.driver_profiles(id) on delete restrict,
  order_id uuid references public.orders(id) on delete set null,
  kind text not null check (kind in ('opening_float', 'purchase', 'customer_payment', 'change_given', 'adjustment', 'closeout')),
  amount numeric(12,2) not null check (amount >= 0),
  direction text not null check (direction in ('in', 'out')),
  notes text,
  created_at timestamptz not null default now()
);

create table public.gps_locations (
  id bigint generated always as identity primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  driver_id uuid not null references public.driver_profiles(id) on delete cascade,
  order_id uuid references public.orders(id) on delete set null,
  latitude numeric(10,7) not null,
  longitude numeric(10,7) not null,
  accuracy_m numeric(8,2),
  speed_kmh numeric(8,2),
  heading numeric(8,2),
  captured_at timestamptz not null default now()
);

create table public.route_alerts (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  order_id uuid not null references public.orders(id) on delete cascade,
  driver_id uuid not null references public.driver_profiles(id) on delete cascade,
  kind text not null check (kind in ('route_deviation', 'late', 'location_offline')),
  threshold_m integer,
  distance_m integer,
  status text not null default 'open' check (status in ('open', 'acknowledged', 'resolved')),
  resolved_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  resolved_at timestamptz
);

create table public.delivery_proofs (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  order_id uuid not null unique references public.orders(id) on delete cascade,
  proof_type text not null check (proof_type in ('otp', 'photo', 'signature', 'recipient_name')),
  photo_path text,
  recipient_name text,
  recorded_by uuid references auth.users(id) on delete set null,
  recorded_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create table public.incidents (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  incident_number text not null,
  order_id uuid references public.orders(id) on delete set null,
  driver_id uuid references public.driver_profiles(id) on delete set null,
  title text not null,
  description text,
  priority public.incident_priority not null default 'normal',
  status public.incident_status not null default 'open',
  assignee_id uuid references auth.users(id) on delete set null,
  resolution text,
  reported_by uuid references auth.users(id) on delete set null,
  resolved_by uuid references auth.users(id) on delete set null,
  resolved_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, incident_number)
);

create table public.incident_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  incident_id uuid not null references public.incidents(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  body text not null,
  created_at timestamptz not null default now()
);

create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  user_id uuid references auth.users(id) on delete cascade,
  channel text not null check (channel in ('in_app', 'email', 'whatsapp')),
  kind text not null,
  title text not null,
  body text,
  payload jsonb not null default '{}'::jsonb,
  read_at timestamptz,
  sent_at timestamptz,
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id bigint generated always as identity primary key,
  company_id uuid not null references public.companies(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id uuid,
  before_data jsonb,
  after_data jsonb,
  created_at timestamptz not null default now()
);

create index orders_company_status_idx on public.orders(company_id, status, created_at desc);
create index orders_company_driver_idx on public.orders(company_id, driver_id, status);
create index messages_conversation_sent_idx on public.messages(conversation_id, sent_at);
create index locations_driver_time_idx on public.gps_locations(driver_id, captured_at desc);
create index locations_order_time_idx on public.gps_locations(order_id, captured_at desc) where order_id is not null;
create index incidents_company_status_idx on public.incidents(company_id, status, created_at desc);
create index fuel_company_vehicle_idx on public.fuel_logs(company_id, vehicle_id, recorded_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.raw_user_meta_data ->> 'phone'
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- This is the only public entry point that creates a tenant. It runs with
-- elevated privileges, but always assigns the new company to auth.uid().
-- A user can never create a company on behalf of a different account.
create or replace function public.create_company_onboarding(
  p_display_name text,
  p_phone text default null,
  p_city text default 'Granada, Nicaragua',
  p_currency_code text default 'NIO',
  p_management_fee numeric default 35
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  new_company_id uuid;
  normalized_name text;
  company_slug text;
begin
  if auth.uid() is null then
    raise exception 'Authentication is required';
  end if;

  normalized_name := btrim(p_display_name);
  if char_length(normalized_name) < 2 then
    raise exception 'Company name must contain at least 2 characters';
  end if;
  if coalesce(p_management_fee, 0) < 0 then
    raise exception 'Management fee cannot be negative';
  end if;

  company_slug := trim(both '-' from regexp_replace(lower(normalized_name), '[^a-z0-9]+', '-', 'g'));
  if company_slug = '' then
    company_slug := 'delivery';
  end if;
  company_slug := left(company_slug, 48) || '-' || left(replace(gen_random_uuid()::text, '-', ''), 8);

  insert into public.companies (legal_name, display_name, slug, phone, city, currency_code)
  values (normalized_name, normalized_name, company_slug, nullif(btrim(p_phone), ''), coalesce(nullif(btrim(p_city), ''), 'Granada, Nicaragua'), coalesce(nullif(upper(btrim(p_currency_code)), ''), 'NIO'))
  returning id into new_company_id;

  insert into public.company_members (company_id, user_id, role)
  values (new_company_id, auth.uid(), 'owner');

  insert into public.company_settings (company_id)
  values (new_company_id);

  insert into public.whatsapp_accounts (company_id, provider, connection_status)
  values (new_company_id, 'meta_cloud', 'disconnected');

  insert into public.service_zones (company_id, name, delivery_fee, sort_order)
  values
    (new_company_id, 'Granada Centro', 50, 10),
    (new_company_id, 'Granada Sur', 70, 20),
    (new_company_id, 'Granada Norte', 70, 30),
    (new_company_id, 'Zonas aledañas', 90, 40);

  insert into public.message_templates (company_id, key, name, body)
  values
    (new_company_id, 'welcome', 'Bienvenida', '¡Hola! Gracias por escribir a {{company_name}}. ¿Qué deseas solicitar hoy?'),
    (new_company_id, 'order_confirmed', 'Pedido confirmado', 'Tu pedido {{order_number}} fue confirmado. Te avisaremos cuando se asigne un motorizado.'),
    (new_company_id, 'driver_assigned', 'Motorizado asignado', 'Tu pedido {{order_number}} ya tiene motorizado asignado.'),
    (new_company_id, 'otp_ready', 'Código de entrega', 'Tu pedido {{order_number}} está por llegar. Solicita el código de entrega al administrador.'),
    (new_company_id, 'delivered', 'Pedido entregado', 'Tu pedido {{order_number}} fue entregado. ¡Gracias por preferirnos!');

  update public.company_settings
  set base_management_fee = p_management_fee,
      allow_operator_price_override = true
  where company_id = new_company_id;

  return new_company_id;
end;
$$;

grant execute on function public.create_company_onboarding(text, text, text, text, numeric) to authenticated;

create or replace function public.is_company_member(target_company_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.company_members member
    where member.company_id = target_company_id
      and member.user_id = auth.uid()
      and member.is_active = true
  );
$$;

create or replace function public.has_company_role(target_company_id uuid, allowed_roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.company_members member
    where member.company_id = target_company_id
      and member.user_id = auth.uid()
      and member.is_active = true
      and member.role = any(allowed_roles)
  );
$$;

do $$
declare
  item record;
begin
  for item in select unnest(array[
    'profiles', 'companies', 'company_members', 'company_settings', 'whatsapp_accounts', 'message_templates',
    'service_zones', 'customers', 'customer_addresses', 'conversations', 'messages', 'driver_profiles', 'vehicles',
    'driver_shifts', 'fuel_logs', 'maintenance_records', 'orders', 'order_status_events', 'order_assignments',
    'cash_drawer_transactions', 'gps_locations', 'route_alerts', 'delivery_proofs', 'incidents', 'incident_events',
    'notifications', 'audit_logs'
  ]) as table_name loop
    execute format('drop trigger if exists set_%I_updated_at on public.%I', item.table_name, item.table_name);
    if item.table_name not in ('messages', 'fuel_logs', 'order_status_events', 'order_assignments', 'cash_drawer_transactions', 'gps_locations', 'delivery_proofs', 'incident_events', 'notifications', 'audit_logs') then
      execute format('create trigger set_%I_updated_at before update on public.%I for each row execute procedure public.set_updated_at()', item.table_name, item.table_name);
    end if;
  end loop;
end;
$$;

alter table public.profiles enable row level security;
create policy "Profiles are visible to their owner" on public.profiles for select using (id = auth.uid());
create policy "Profiles can be updated by their owner" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

alter table public.companies enable row level security;
create policy "Members can view their companies" on public.companies for select using (public.is_company_member(id));
create policy "Admins manage their company" on public.companies for update using (public.has_company_role(id, array['owner', 'admin']::public.app_role[]));

alter table public.company_members enable row level security;
create policy "Members can view company members" on public.company_members for select using (public.is_company_member(company_id));
create policy "Admins manage members" on public.company_members for all using (public.has_company_role(company_id, array['owner', 'admin']::public.app_role[])) with check (public.has_company_role(company_id, array['owner', 'admin']::public.app_role[]));

do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'company_settings', 'whatsapp_accounts', 'message_templates', 'service_zones', 'customers', 'customer_addresses',
    'conversations', 'messages', 'driver_profiles', 'vehicles', 'driver_shifts', 'fuel_logs', 'maintenance_records',
    'orders', 'order_status_events', 'order_assignments', 'cash_drawer_transactions', 'gps_locations', 'route_alerts',
    'delivery_proofs', 'incidents', 'incident_events', 'notifications', 'audit_logs'
  ] loop
    execute format('alter table public.%I enable row level security', table_name);
    execute format('create policy "Company members can read %1$s" on public.%1$I for select using (public.is_company_member(company_id))', table_name);
    execute format('create policy "Company members can insert %1$s" on public.%1$I for insert with check (public.is_company_member(company_id))', table_name);
    execute format('create policy "Company members can update %1$s" on public.%1$I for update using (public.is_company_member(company_id)) with check (public.is_company_member(company_id))', table_name);
  end loop;
end;
$$;

-- Storage buckets stay private. Signed URLs are generated only from server-side application code.
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('delivery-proofs', 'delivery-proofs', false, 5242880, array['image/jpeg', 'image/png', 'application/pdf']),
  ('vehicle-documents', 'vehicle-documents', false, 5242880, array['image/jpeg', 'image/png', 'application/pdf']),
  ('transfer-receipts', 'transfer-receipts', false, 5242880, array['image/jpeg', 'image/png', 'application/pdf'])
on conflict (id) do nothing;

grant usage on schema public to anon, authenticated, service_role;
grant select, insert, update, delete on all tables in schema public to authenticated, service_role;
grant usage, select on all sequences in schema public to authenticated, service_role;

alter publication supabase_realtime add table public.orders, public.messages, public.gps_locations, public.notifications;
