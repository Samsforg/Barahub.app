-- ============================================================
-- Barahub — Schéma complet Supabase
-- À exécuter dans : Dashboard Supabase → SQL Editor → New query
-- ============================================================

-- PROFILES ---------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users on delete cascade,
  phone text,
  full_name text not null,
  username text,
  avatar_url text,
  location text,
  is_artisan boolean not null default false,
  phone_verified boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Création automatique du profil à l'inscription
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, phone, is_artisan)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', 'Utilisateur'),
    nullif(new.raw_user_meta_data->>'phone', ''),
    coalesce((new.raw_user_meta_data->>'is_artisan')::boolean, false)
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- CATEGORIES -------------------------------------------------
create table if not exists public.categories (
  id int generated always as identity primary key,
  name text not null unique,
  icon text not null default '🔧',
  description text
);

insert into public.categories (name, icon) values
  ('Électricien', '⚡'),
  ('Plombier', '💧'),
  ('Menuisier', '🪵'),
  ('Climatisation', '❄️'),
  ('Serrurier', '🔒'),
  ('Maçon', '🧱'),
  ('Peintre', '🎨'),
  ('Mécanicien', '🚗'),
  ('Coiffure', '💈'),
  ('Couture', '🧵'),
  ('Jardinage', '🌿'),
  ('Carreleur', '🔷'),
  ('Soudeur', '🔥'),
  ('Vitrier', '🪟'),
  ('Frigoriste', '🧊')
on conflict (name) do nothing;

-- ARTISANS ---------------------------------------------------
create table if not exists public.artisans (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  category_id int references public.categories(id),
  description text,
  status text not null default 'offline'
    check (status in ('online','offline','busy')),
  rating numeric(3,2) not null default 0,
  review_count int not null default 0,
  services text[] not null default '{}',
  specialties text[] not null default '{}',
  work_images text[] not null default '{}',
  hourly_rate numeric(10,2),
  commune text,
  verified boolean not null default false,
  years_experience int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- SERVICES ---------------------------------------------------
create table if not exists public.services (
  id bigint generated always as identity primary key,
  category_id int not null references public.categories(id) on delete cascade,
  name text not null,
  description text,
  base_price numeric(10,2)
);

-- MESSAGES ---------------------------------------------------
create table if not exists public.messages (
  id bigint generated always as identity primary key,
  from_user_id uuid not null references public.profiles(id) on delete cascade,
  to_user_id uuid not null references public.profiles(id) on delete cascade,
  content text not null,
  read boolean not null default false,
  created_at timestamptz not null default now()
);

-- QUOTE REQUESTS ----------------------------------------------
create table if not exists public.quote_requests (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete cascade,
  artisan_id bigint not null references public.artisans(id) on delete cascade,
  service_type text not null,
  description text not null,
  address text,
  budget numeric(12,2),
  status text not null default 'pending'
    check (status in ('pending','accepted','rejected','completed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- REVIEWS ----------------------------------------------------
create table if not exists public.reviews (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  artisan_id bigint not null references public.artisans(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  comment text,
  created_at timestamptz not null default now(),
  unique (user_id, artisan_id)
);

-- Mise à jour auto du rating de l'artisan
create or replace function public.update_artisan_rating()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  update public.artisans a
  set rating = sub.avg_rating,
      review_count = sub.cnt
  from (
    select artisan_id, round(avg(rating)::numeric, 2) as avg_rating, count(*) as cnt
    from public.reviews
    where artisan_id = coalesce(new.artisan_id, old.artisan_id)
    group by artisan_id
  ) sub
  where a.id = sub.artisan_id;
  return coalesce(new, old);
end;
$$;

create or replace trigger reviews_after_change
  after insert or delete on public.reviews
  for each row execute function public.update_artisan_rating();

-- URGENT REQUESTS ---------------------------------------------
create table if not exists public.urgent_requests (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  problem_type text not null,
  description text not null,
  commune text not null,
  phone text not null,
  status text not null default 'pending'
    check (status in ('pending','assigned','resolved')),
  created_at timestamptz not null default now()
);

-- MOBILE PAYMENTS ---------------------------------------------
create table if not exists public.mobile_payments (
  id bigint generated always as identity primary key,
  user_id uuid references public.profiles(id) on delete set null,
  quote_request_id bigint references public.quote_requests(id) on delete set null,
  provider text not null check (provider in ('orange_money','wave','mtn_momo')),
  amount numeric(12,2) not null,
  phone text not null,
  status text not null default 'pending'
    check (status in ('pending','success','failed')),
  reference text unique,
  created_at timestamptz not null default now()
);

-- NOTIFICATIONS -----------------------------------------------
create table if not exists public.notifications (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text not null,
  type text not null default 'info'
    check (type in ('info','quote','message','payment','urgent')),
  read boolean not null default false,
  data jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================
alter table public.profiles        enable row level security;
alter table public.categories      enable row level security;
alter table public.artisans        enable row level security;
alter table public.services        enable row level security;
alter table public.messages        enable row level security;
alter table public.quote_requests  enable row level security;
alter table public.reviews         enable row level security;
alter table public.urgent_requests enable row level security;
alter table public.mobile_payments enable row level security;
alter table public.notifications   enable row level security;

-- profiles : lecture publique (noms/avatars des artisans), écriture par soi-même
create policy "profiles_select" on public.profiles for select using (true);
create policy "profiles_insert" on public.profiles for insert with check (id = auth.uid());
create policy "profiles_update" on public.profiles for update using (id = auth.uid());

-- categories / services : lecture publique, écriture via dashboard uniquement
create policy "categories_select" on public.categories for select using (true);
create policy "services_select"   on public.services   for select using (true);

-- artisans : lecture publique, modification par le propriétaire
create policy "artisans_select" on public.artisans for select using (true);
create policy "artisans_insert" on public.artisans for insert with check (user_id = auth.uid());
create policy "artisans_update" on public.artisans for update using (user_id = auth.uid());

-- messages : participants uniquement
create policy "messages_select" on public.messages
  for select using (from_user_id = auth.uid() or to_user_id = auth.uid());
create policy "messages_insert" on public.messages
  for insert with check (from_user_id = auth.uid());

-- devis : visible par le demandeur ou l'artisan concerné
create policy "quotes_select" on public.quote_requests
  for select using (
    user_id = auth.uid()
    or artisan_id in (select id from public.artisans where user_id = auth.uid())
  );
create policy "quotes_insert" on public.quote_requests
  for insert with check (user_id = auth.uid());
create policy "quotes_update" on public.quote_requests
  for update using (
    artisan_id in (select id from public.artisans where user_id = auth.uid())
    or user_id = auth.uid()
  );

-- avis : lecture publique, 1 avis max par utilisateur et artisan
create policy "reviews_select" on public.reviews for select using (true);
create policy "reviews_insert" on public.reviews
  for insert with check (user_id = auth.uid());

-- urgences : insertion libre (même anonyme), lecture par son auteur
create policy "urgent_insert" on public.urgent_requests
  for insert with check (true);
create policy "urgent_select" on public.urgent_requests
  for select using (user_id = auth.uid() or user_id is null);

-- paiements : propriétaire uniquement
create policy "payments_select" on public.mobile_payments
  for select using (user_id = auth.uid());
create policy "payments_insert" on public.mobile_payments
  for insert with check (user_id = auth.uid());

-- notifications : propriétaire uniquement
create policy "notifications_select" on public.notifications
  for select using (user_id = auth.uid());
create policy "notifications_update" on public.notifications
  for update using (user_id = auth.uid());
