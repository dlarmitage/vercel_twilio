-- Phone numbers table
create table if not exists phone_numbers (
    id uuid primary key default gen_random_uuid(),
    number text not null unique,
    created_at timestamptz not null default now()
);

-- Calls table
create table if not exists calls (
    id uuid primary key default gen_random_uuid(),
    phone_number_id uuid references phone_numbers(id) on delete cascade,
    twilio_call_sid text unique,
    started_at timestamptz not null default now(),
    ended_at timestamptz,
    summary text
);

-- Messages table
create table if not exists messages (
    id uuid primary key default gen_random_uuid(),
    call_id uuid references calls(id) on delete cascade,
    twilio_message_sid text unique,
    direction text check (direction in ('inbound','outbound')) not null,
    body text not null,
    sent_at timestamptz not null default now(),
    status text
);

-- Enable Row Level Security (RLS)
alter table phone_numbers enable row level security;
alter table calls enable row level security;
alter table messages enable row level security;

-- Example RLS policy: allow all access for now (customize as needed)
create policy "Allow all" on phone_numbers for all using (true);
create policy "Allow all" on calls for all using (true);
create policy "Allow all" on messages for all using (true);
