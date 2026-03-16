-- profiles
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  free_credits_granted boolean default false,
  signup_ip text,
  signup_fingerprint text,
  signup_user_agent text,
  status text default 'active'
);

-- wallets
create table wallets (
  id uuid primary key default gen_random_uuid(),
  user_id uuid unique references profiles(id) on delete cascade,
  balance integer default 0 check (balance >= 0),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- credit_ledger
create table credit_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  wallet_id uuid references wallets(id),
  type text not null check (type in ('grant','purchase','debit','refund','admin_adjustment')),
  amount integer not null,
  balance_after integer not null,
  reference_type text check (reference_type in ('message','regenerate','payment','refund','free_trial','admin')),
  reference_id uuid,
  note text,
  created_at timestamptz default now()
);

-- chat_threads
create table chat_threads (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  title text,
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  last_message_at timestamptz,
  status text default 'active'
);

-- chat_messages
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid references chat_threads(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  role text not null check (role in ('user','assistant','system')),
  content_text text,
  content_type text default 'text' check (content_type in ('text','system')),
  status text default 'sent' check (status in ('sent','pending','generating','awaiting_payment','completed','failed')),
  parent_message_id uuid references chat_messages(id),
  metadata jsonb,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- message_attachments
create table message_attachments (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references chat_messages(id) on delete cascade,
  thread_id uuid references chat_threads(id) on delete cascade,
  user_id uuid references profiles(id) on delete set null,
  file_type text,
  mime_type text,
  storage_path text,
  public_url text,
  file_name text,
  file_size integer,
  metadata jsonb,
  created_at timestamptz default now()
);

-- payments
create table payments (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade,
  provider text default 'mayar',
  package_code text not null,
  amount_idr integer not null,
  credits_to_add integer not null,
  external_payment_id text,
  external_invoice_id text,
  status text default 'pending' check (status in ('pending','paid','failed','expired')),
  created_at timestamptz default now(),
  updated_at timestamptz default now(),
  paid_at timestamptz
);

-- payment_events
create table payment_events (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid references payments(id),
  provider text,
  external_event_id text unique,
  event_type text,
  payload jsonb,
  processed boolean default false,
  processed_at timestamptz,
  created_at timestamptz default now()
);

-- abuse_signals
create table abuse_signals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete set null,
  fingerprint text,
  ip text,
  signal_type text,
  signal_value text,
  metadata jsonb,
  created_at timestamptz default now()
);

-- indexes
create index on credit_ledger (user_id, created_at desc);
create index on chat_threads (user_id, last_message_at desc);
create index on chat_messages (thread_id, created_at asc);
create index on payments (user_id, created_at desc);
create index on payment_events (external_event_id);
create index on abuse_signals (fingerprint, ip);

-- RLS
alter table profiles enable row level security;
alter table wallets enable row level security;
alter table credit_ledger enable row level security;
alter table chat_threads enable row level security;
alter table chat_messages enable row level security;
alter table message_attachments enable row level security;
alter table payments enable row level security;
alter table payment_events enable row level security;
alter table abuse_signals enable row level security;

-- RLS policies (users access own rows only)
create policy "users own profile" on profiles for all using (auth.uid() = id);
create policy "users own wallet" on wallets for all using (auth.uid() = user_id);
create policy "users own ledger" on credit_ledger for select using (auth.uid() = user_id);
create policy "users own threads" on chat_threads for all using (auth.uid() = user_id);
create policy "users own messages" on chat_messages for all using (auth.uid() = user_id);
create policy "users own attachments" on message_attachments for all using (auth.uid() = user_id);
create policy "users own payments" on payments for select using (auth.uid() = user_id);
