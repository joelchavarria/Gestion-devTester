-- Seed only reusable operational defaults. Demo UI data remains in src/lib/demo-data.ts.
-- Companies are created through the onboarding workflow so that their owner is an auth user.

comment on table public.orders is 'Operational orders. Cancellation after purchase is configurable per company.';
comment on table public.gps_locations is 'Location is captured only while a driver has accepted active orders.';
