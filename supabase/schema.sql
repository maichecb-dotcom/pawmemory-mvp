create table if not exists public.pet_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.pet_profiles enable row level security;

create policy "Users can read their own pet profile"
  on public.pet_profiles
  for select
  using (auth.uid() = user_id);

create policy "Users can insert their own pet profile"
  on public.pet_profiles
  for insert
  with check (auth.uid() = user_id);

create policy "Users can update their own pet profile"
  on public.pet_profiles
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

create or replace function public.set_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists set_pet_profiles_updated_at on public.pet_profiles;

create trigger set_pet_profiles_updated_at
  before update on public.pet_profiles
  for each row
  execute function public.set_updated_at();
