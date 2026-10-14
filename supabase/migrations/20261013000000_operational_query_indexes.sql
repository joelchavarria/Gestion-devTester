-- Keep the operational screens fast as tenants accumulate orders, GPS points,
-- notifications and team members. All indexes are tenant-scoped so the common
-- company filters can use an index before sorting or limiting results.
create index if not exists company_members_user_active_joined_idx
  on public.company_members (user_id, is_active, joined_at desc);

create index if not exists orders_company_status_created_idx
  on public.orders (company_id, status, created_at desc);

create index if not exists orders_company_driver_status_idx
  on public.orders (company_id, driver_id, status, created_at desc);

create index if not exists gps_locations_company_captured_idx
  on public.gps_locations (company_id, captured_at desc);

create index if not exists route_alerts_company_status_created_idx
  on public.route_alerts (company_id, status, created_at desc);

create index if not exists notifications_company_channel_user_read_created_idx
  on public.notifications (company_id, channel, user_id, read_at, created_at desc);

create index if not exists driver_shifts_company_open_idx
  on public.driver_shifts (company_id, driver_id, started_at desc)
  where ended_at is null;

create index if not exists conversations_company_last_message_idx
  on public.conversations (company_id, last_message_at desc nulls last);
