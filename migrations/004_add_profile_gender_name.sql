-- Add full_name and gender to profiles
alter table profiles 
add column if not exists full_name text,
add column if not exists gender text check (gender in ('male', 'female'));

-- Update RLS to ensure users can update their own profile
-- (Policy already exists as "users own profile" but verifying)
