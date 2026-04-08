-- migrations/003_add_group_chat_support.sql
alter table chat_threads 
add column type text default 'individual',
add column metadata jsonb default '{}'::jsonb;
