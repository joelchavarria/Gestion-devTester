-- QR gateway is the default self-service channel. Meta Cloud remains available
-- as an optional provider, but it no longer blocks a new company's onboarding.
alter table public.whatsapp_accounts
  drop constraint if exists whatsapp_accounts_provider_check;

alter table public.whatsapp_accounts
  add constraint whatsapp_accounts_provider_check
  check (provider in ('qr_gateway', 'meta_cloud', 'mock'));

alter table public.whatsapp_accounts
  alter column provider set default 'qr_gateway';

-- Keep the public onboarding entry point self-service: every new tenant gets
-- an isolated QR session by default. Meta Cloud remains an optional migration.
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
  values (new_company_id, 'qr_gateway', 'disconnected');

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

update public.whatsapp_accounts
set provider = 'qr_gateway', updated_at = now()
where provider = 'meta_cloud'
  and connection_status = 'disconnected'
  and phone_number_id is null
  and encrypted_access_token is null;
