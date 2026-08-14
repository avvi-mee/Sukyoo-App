-- Ecommerce: catalog, orders with the ordered-by/belongs-to/payer actor
-- split (needed for assisted shopping + family co-ordering), and payments
-- reconciled off Razorpay webhooks only — never off client-reported success.

create type public.ordered_by_role as enum ('self', 'family', 'ops_agent');
create type public.order_status as enum ('pending', 'paid', 'fulfilled', 'cancelled');
create type public.payment_status as enum ('created', 'captured', 'failed', 'refunded');

-- ---------------------------------------------------------------------------
-- Catalog (browsable, Sukyoo/vendor-managed — no client writes in v1)
-- ---------------------------------------------------------------------------

create table public.product_categories (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique,
  name text not null,
  icon text
);

create table public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.product_categories (id),
  vendor_org_id uuid references public.organizations (id),
  name text not null,
  description text,
  price numeric(10, 2) not null,
  image_url text,
  is_subscription_eligible boolean not null default false,
  is_active boolean not null default true
);

create index products_category_idx on public.products (category_id);

create table public.service_listings (
  id uuid primary key default gen_random_uuid(),
  vendor_org_id uuid references public.organizations (id),
  category text not null, -- 'home_repair' | 'domestic_help' | 'tech_support' | 'legal_financial'
  name text not null,
  description text,
  price_label text, -- free-text, e.g. "Starting at ₹299" — vendor-fulfilled, not a fixed catalog price
  is_active boolean not null default true
);

-- ---------------------------------------------------------------------------
-- Orders — three actor columns, not two, so assisted shopping and family
-- co-ordering are representable: whose account this is (belongs_to), who
-- actually placed it (ordered_by — self / a linked family member / an ops
-- agent doing assisted shopping), and whose payment method was charged
-- (payer, which can differ from both — e.g. family pays for senior's order).
-- ---------------------------------------------------------------------------

create table public.orders (
  id uuid primary key default gen_random_uuid(),
  belongs_to_user_id uuid not null references public.profiles (id),
  ordered_by_user_id uuid not null references public.profiles (id),
  ordered_by_role public.ordered_by_role not null,
  payer_user_id uuid not null references public.profiles (id),
  status public.order_status not null default 'pending',
  subtotal numeric(10, 2) not null default 0,
  created_at timestamptz not null default now()
);

create index orders_belongs_to_idx on public.orders (belongs_to_user_id, created_at desc);
create index orders_ordered_by_idx on public.orders (ordered_by_user_id, created_at desc);

create table public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id) on delete cascade,
  product_id uuid not null references public.products (id),
  quantity int not null check (quantity > 0),
  unit_price numeric(10, 2) not null
);

create index order_items_order_idx on public.order_items (order_id);

create table public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders (id),
  payer_user_id uuid not null references public.profiles (id),
  razorpay_order_id text unique,
  razorpay_payment_id text,
  amount numeric(10, 2) not null,
  status public.payment_status not null default 'created',
  method text,
  created_at timestamptz not null default now()
);

create index payments_order_idx on public.payments (order_id);

create table public.product_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  product_id uuid not null references public.products (id),
  frequency_days int not null default 30,
  next_order_date date not null default (current_date + 30),
  is_active boolean not null default true,
  unique (user_id, product_id)
);

-- Rate snapshotted at transaction time — commission percentages change over
-- time, historical rows must keep the rate that actually applied.
create table public.commission_ledger (
  id uuid primary key default gen_random_uuid(),
  source_type text not null, -- 'order' | 'doctor_booking' | ...
  source_id uuid not null,
  gross_amount numeric(10, 2) not null,
  commission_amount numeric(10, 2) not null,
  rate_snapshot numeric(5, 2) not null,
  partner_org_id uuid references public.organizations (id),
  payout_status text not null default 'pending',
  created_at timestamptz not null default now(),
  unique (source_type, source_id)
);

-- ---------------------------------------------------------------------------
-- create_order(): the actor-model gate. Infers the caller's role itself
-- rather than trusting a client-supplied role string — self if ordering for
-- their own account, ops_agent if the caller's profile says so, family only
-- if an active 'order' permission_grant exists. Anyone else is denied.
-- ---------------------------------------------------------------------------

create or replace function public.create_order(
  p_belongs_to_user_id uuid,
  p_items jsonb, -- [{"product_id": "...", "quantity": 2}, ...]
  p_payer_user_id uuid default null
) returns public.orders
language plpgsql
security definer
set search_path = public
as $$
declare
  v_role public.ordered_by_role;
  v_order public.orders;
  v_item jsonb;
  v_product public.products;
  v_subtotal numeric(10, 2) := 0;
begin
  if auth.uid() = p_belongs_to_user_id then
    v_role := 'self';
  elsif exists (select 1 from profiles where id = auth.uid() and role = 'ops_agent') then
    v_role := 'ops_agent';
  elsif has_permission(auth.uid(), p_belongs_to_user_id, 'order', null) then
    v_role := 'family';
  else
    raise exception 'not authorized';
  end if;

  insert into orders (belongs_to_user_id, ordered_by_user_id, ordered_by_role, payer_user_id)
  values (p_belongs_to_user_id, auth.uid(), v_role, coalesce(p_payer_user_id, auth.uid()))
  returning * into v_order;

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_product from products where id = (v_item ->> 'product_id')::uuid and is_active;
    if v_product.id is null then
      raise exception 'product not found or inactive';
    end if;

    insert into order_items (order_id, product_id, quantity, unit_price)
    values (v_order.id, v_product.id, (v_item ->> 'quantity')::int, v_product.price);

    v_subtotal := v_subtotal + v_product.price * (v_item ->> 'quantity')::int;
  end loop;

  update orders set subtotal = v_subtotal where id = v_order.id returning * into v_order;
  return v_order;
end;
$$;

grant execute on function public.create_order(uuid, jsonb, uuid) to authenticated;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.product_categories enable row level security;
alter table public.products enable row level security;
alter table public.service_listings enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.product_subscriptions enable row level security;
alter table public.commission_ledger enable row level security;

create policy "product_categories_select_all" on public.product_categories for select using (true);
create policy "products_select_active" on public.products for select using (is_active);
create policy "service_listings_select_active" on public.service_listings for select using (is_active);

create policy "orders_select_participant" on public.orders for select using (
  belongs_to_user_id = auth.uid() or ordered_by_user_id = auth.uid()
);

create policy "order_items_select_participant" on public.order_items for select using (
  exists (
    select 1 from orders o
    where o.id = order_items.order_id and (o.belongs_to_user_id = auth.uid() or o.ordered_by_user_id = auth.uid())
  )
);

-- Payments are readable by the participant, but only ever written by the
-- razorpay-order / razorpay-webhook Edge Functions via service role — no
-- insert/update policy for authenticated here, on purpose.
create policy "payments_select_participant" on public.payments for select using (
  payer_user_id = auth.uid()
  or exists (
    select 1 from orders o
    where o.id = payments.order_id and (o.belongs_to_user_id = auth.uid() or o.ordered_by_user_id = auth.uid())
  )
);

create policy "product_subscriptions_own" on public.product_subscriptions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- commission_ledger: no policies at all — internal finance data, service
-- role (which bypasses RLS) only.
