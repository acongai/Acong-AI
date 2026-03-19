-- Add has_consented flag to profiles
alter table profiles add column if not exists has_consented boolean default false;
