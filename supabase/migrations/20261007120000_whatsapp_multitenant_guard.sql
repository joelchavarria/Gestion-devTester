-- One Meta phone number can belong to only one tenant inbox.
create unique index if not exists whatsapp_accounts_phone_number_id_unique
  on public.whatsapp_accounts (phone_number_id)
  where phone_number_id is not null;
