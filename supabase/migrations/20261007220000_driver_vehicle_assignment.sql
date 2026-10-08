alter table public.driver_profiles
  add column if not exists assigned_vehicle_id uuid references public.vehicles(id) on delete set null;

create unique index if not exists one_driver_per_assigned_vehicle
  on public.driver_profiles(assigned_vehicle_id)
  where assigned_vehicle_id is not null;

comment on column public.driver_profiles.assigned_vehicle_id is
  'Vehicle reserved by operations for this driver. A vehicle can only be assigned to one driver.';
