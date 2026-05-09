create table if not exists public.pet_profiles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  state jsonb not null,
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  unique (user_id)
);

alter table public.pet_profiles enable row level security;

drop policy if exists "Users can read their own pet profile" on public.pet_profiles;
create policy "Users can read their own pet profile"
  on public.pet_profiles
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own pet profile" on public.pet_profiles;
create policy "Users can insert their own pet profile"
  on public.pet_profiles
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own pet profile" on public.pet_profiles;
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

create table if not exists public.reply_feedback (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  message_id text not null,
  feedback_value text not null,
  pet_name text,
  user_message text,
  pet_reply text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, message_id)
);

alter table public.reply_feedback enable row level security;

drop policy if exists "Users can read their own reply feedback" on public.reply_feedback;
create policy "Users can read their own reply feedback"
  on public.reply_feedback
  for select
  using (auth.uid() = user_id);

drop policy if exists "Users can insert their own reply feedback" on public.reply_feedback;
create policy "Users can insert their own reply feedback"
  on public.reply_feedback
  for insert
  with check (auth.uid() = user_id);

drop policy if exists "Users can update their own reply feedback" on public.reply_feedback;
create policy "Users can update their own reply feedback"
  on public.reply_feedback
  for update
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop trigger if exists set_reply_feedback_updated_at on public.reply_feedback;

create trigger set_reply_feedback_updated_at
  before update on public.reply_feedback
  for each row
  execute function public.set_updated_at();
