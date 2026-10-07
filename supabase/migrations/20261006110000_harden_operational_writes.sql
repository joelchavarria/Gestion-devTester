-- Operational writes go through authenticated application routes using the
-- service-role client only after server-side authorization. This prevents an
-- authenticated browser user from bypassing workflow and role checks through
-- direct PostgREST calls.
do $$
declare
  table_name text;
begin
  foreach table_name in array array[
    'company_settings', 'whatsapp_accounts', 'message_templates', 'service_zones', 'customers', 'customer_addresses',
    'conversations', 'messages', 'driver_profiles', 'vehicles', 'driver_shifts', 'fuel_logs', 'maintenance_records',
    'orders', 'order_status_events', 'order_assignments', 'cash_drawer_transactions', 'gps_locations', 'route_alerts',
    'delivery_proofs', 'incidents', 'incident_events', 'notifications', 'audit_logs', 'order_routes'
  ] loop
    execute format('drop policy if exists "Company members can insert %1$s" on public.%1$I', table_name);
    execute format('drop policy if exists "Company members can update %1$s" on public.%1$I', table_name);
  end loop;
end;
$$;

drop policy if exists "Company members can insert order routes" on public.order_routes;
drop policy if exists "Company members can update order routes" on public.order_routes;

-- Membership/role changes are also server-mediated; reading memberships remains
-- available so a session can be routed to the correct admin or driver surface.
drop policy if exists "Admins manage members" on public.company_members;
