-- =====================================================================
-- PistaYa · Projecte 2 · Fase II · Grup 8
-- Capa de persistència: PostgreSQL (Supabase)
-- Executar sencer a Supabase > SQL Editor.
-- =====================================================================

create extension if not exists btree_gist;

-- ---------------------------------------------------------------------
-- 1. Taules
-- ---------------------------------------------------------------------

-- Persones usuàries (perfil públic de cada compte de Supabase Auth)
create table if not exists public.usuaris (
  id         uuid primary key references auth.users (id) on delete cascade,
  nom        text not null check (char_length(nom) between 2 and 80),
  email      text not null unique,
  telefon    text check (telefon is null or telefon ~ '^[0-9 +]{9,15}$'),
  rol        text not null default 'usuari' check (rol in ('usuari', 'admin')),
  creat_el   timestamptz not null default now()
);

-- Instal·lacions esportives
create table if not exists public.installacions (
  id         bigint generated always as identity primary key,
  nom        text not null unique check (char_length(nom) between 3 and 80),
  adreca     text not null check (char_length(adreca) between 5 and 120),
  ciutat     text not null check (char_length(ciutat) between 2 and 60),
  obertura   time not null default '08:00',
  tancament  time not null default '23:00',
  creat_el   timestamptz not null default now(),
  check (tancament > obertura)
);

-- Pistes de cada instal·lació
create table if not exists public.pistes (
  id             bigint generated always as identity primary key,
  installacio_id bigint not null references public.installacions (id) on delete restrict,
  nom            text not null check (char_length(nom) between 2 and 60),
  esport         text not null check (esport in ('padel', 'tennis', 'futbol', 'basquet')),
  tipus          text not null check (tipus in ('coberta', 'exterior')),
  preu_hora      numeric(6, 2) not null check (preu_hora > 0 and preu_hora <= 200),
  activa         boolean not null default true,
  creat_el       timestamptz not null default now(),
  unique (installacio_id, nom)
);

-- Reserves: relaciona persones usuàries i pistes
create table if not exists public.reserves (
  id          bigint generated always as identity primary key,
  usuari_id   uuid not null references public.usuaris (id) on delete cascade,
  pista_id    bigint not null references public.pistes (id) on delete restrict,
  inici       timestamptz not null,
  fi          timestamptz not null,
  estat       text not null default 'confirmada' check (estat in ('confirmada', 'cancel·lada')),
  preu_total  numeric(7, 2) not null check (preu_total >= 0),
  creat_el    timestamptz not null default now(),
  check (fi > inici),
  check (fi - inici between interval '1 hour' and interval '2 hours'),
  -- Regla de negoci (última barrera): dues reserves confirmades de la mateixa
  -- pista no es poden solapar en el temps.
  constraint reserves_sense_solapament exclude using gist (
    pista_id with =,
    tstzrange(inici, fi) with &&
  ) where (estat = 'confirmada')
);

create index if not exists idx_pistes_installacio on public.pistes (installacio_id);
create index if not exists idx_reserves_usuari on public.reserves (usuari_id);
create index if not exists idx_reserves_pista_inici on public.reserves (pista_id, inici);

-- ---------------------------------------------------------------------
-- 2. Funcions auxiliars
-- ---------------------------------------------------------------------

-- Retorna true si la persona connectada és administradora.
create or replace function public.es_admin()
returns boolean
language sql stable security definer set search_path = public
as $$
  select exists (select 1 from public.usuaris where id = auth.uid() and rol = 'admin');
$$;

-- Franges ocupades d'una pista en un dia (sense dades personals).
create or replace function public.franges_ocupades(p_pista bigint, p_dia date)
returns table (id bigint, inici timestamptz, fi timestamptz)
language sql stable security definer set search_path = public
as $$
  select r.id, r.inici, r.fi
  from public.reserves r
  where r.pista_id = p_pista
    and r.estat = 'confirmada'
    and r.inici < ((p_dia + 1)::timestamp at time zone 'Europe/Madrid')
    and r.fi    > (p_dia::timestamp at time zone 'Europe/Madrid')
  order by r.inici;
$$;

-- Crea el perfil automàticament quan algú es registra (contrasenya o GitHub).
create or replace function public.crear_perfil()
returns trigger
language plpgsql security definer set search_path = public
as $$
declare
  v_nom text;
begin
  v_nom := trim(left(coalesce(new.raw_user_meta_data ->> 'nom',
                              new.raw_user_meta_data ->> 'full_name',
                              new.raw_user_meta_data ->> 'user_name',
                              split_part(new.email, '@', 1), ''), 80));
  if char_length(v_nom) < 2 then
    v_nom := 'Usuari ' || v_nom;
  end if;
  insert into public.usuaris (id, nom, email)
  values (new.id, v_nom, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists en_crear_usuari on auth.users;
create trigger en_crear_usuari
  after insert on auth.users
  for each row execute function public.crear_perfil();

-- Ningú (excepte admin) pot canviar-se el rol.
create or replace function public.protegir_rol()
returns trigger
language plpgsql security definer set search_path = public
as $$
begin
  -- auth.uid() és null quan s'executa des de l'SQL Editor (administració).
  if new.rol <> old.rol and auth.uid() is not null and not public.es_admin() then
    raise exception 'No tens permís per canviar el rol';
  end if;
  return new;
end;
$$;

drop trigger if exists abans_actualitzar_usuari on public.usuaris;
create trigger abans_actualitzar_usuari
  before update on public.usuaris
  for each row execute function public.protegir_rol();

-- ---------------------------------------------------------------------
-- 3. Autorització: Row Level Security (RLS)
-- ---------------------------------------------------------------------

alter table public.usuaris       enable row level security;
alter table public.installacions enable row level security;
alter table public.pistes        enable row level security;
alter table public.reserves      enable row level security;

-- usuaris
drop policy if exists usuaris_select on public.usuaris;
create policy usuaris_select on public.usuaris for select to authenticated
  using (id = auth.uid() or public.es_admin());
drop policy if exists usuaris_update on public.usuaris;
create policy usuaris_update on public.usuaris for update to authenticated
  using (id = auth.uid() or public.es_admin())
  with check (id = auth.uid() or public.es_admin());
drop policy if exists usuaris_delete on public.usuaris;
create policy usuaris_delete on public.usuaris for delete to authenticated
  using (public.es_admin());

-- installacions: lectura pública, escriptura només admin
drop policy if exists installacions_select on public.installacions;
create policy installacions_select on public.installacions for select to anon, authenticated
  using (true);
drop policy if exists installacions_admin on public.installacions;
create policy installacions_admin on public.installacions for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- pistes: lectura pública, escriptura només admin
drop policy if exists pistes_select on public.pistes;
create policy pistes_select on public.pistes for select to anon, authenticated
  using (true);
drop policy if exists pistes_admin on public.pistes;
create policy pistes_admin on public.pistes for all to authenticated
  using (public.es_admin()) with check (public.es_admin());

-- reserves: cadascú les seves; admin totes
drop policy if exists reserves_select on public.reserves;
create policy reserves_select on public.reserves for select to authenticated
  using (usuari_id = auth.uid() or public.es_admin());
drop policy if exists reserves_insert on public.reserves;
create policy reserves_insert on public.reserves for insert to authenticated
  with check (usuari_id = auth.uid());
drop policy if exists reserves_update on public.reserves;
create policy reserves_update on public.reserves for update to authenticated
  using (usuari_id = auth.uid() or public.es_admin())
  with check (usuari_id = auth.uid() or public.es_admin());
drop policy if exists reserves_delete on public.reserves;
create policy reserves_delete on public.reserves for delete to authenticated
  using (usuari_id = auth.uid() or public.es_admin());

grant execute on function public.franges_ocupades(bigint, date) to anon, authenticated;
grant execute on function public.es_admin() to authenticated;

-- ---------------------------------------------------------------------
-- 4. Dades de prova
-- ---------------------------------------------------------------------

insert into public.installacions (nom, adreca, ciutat, obertura, tancament) values
  ('Pàdel Club Nord', 'Carrer de la Riera, 12', 'Sabadell', '08:00', '23:00'),
  ('Poliesportiu Can Mas', 'Avinguda del Parc, 45', 'Terrassa', '09:00', '22:00'),
  ('Club Tennis Sant Joan', 'Passeig de Sant Joan, 3', 'Cerdanyola del Vallès', '08:00', '22:00')
on conflict (nom) do nothing;

insert into public.pistes (installacio_id, nom, esport, tipus, preu_hora, activa)
select i.id, p.nom, p.esport, p.tipus, p.preu, p.activa
from (values
  ('Pàdel Club Nord', 'Pista 1', 'padel', 'coberta', 12.00, true),
  ('Pàdel Club Nord', 'Pista 2', 'padel', 'coberta', 12.00, true),
  ('Pàdel Club Nord', 'Pista 3', 'padel', 'exterior', 9.00, false),
  ('Poliesportiu Can Mas', 'Futbol 7', 'futbol', 'exterior', 40.00, true),
  ('Poliesportiu Can Mas', 'Bàsquet A', 'basquet', 'coberta', 20.00, true),
  ('Club Tennis Sant Joan', 'Central', 'tennis', 'exterior', 10.00, true),
  ('Club Tennis Sant Joan', 'Pista 2', 'tennis', 'coberta', 14.00, true)
) as p(installacio, nom, esport, tipus, preu, activa)
join public.installacions i on i.nom = p.installacio
on conflict (installacio_id, nom) do nothing;

-- Per fer admin una persona (després de registrar-se):
-- update public.usuaris set rol = 'admin' where email = 'correu@exemple.com';
