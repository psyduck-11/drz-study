-- ==============================================================================
-- Living Wiki - Supabase Database Schema & Storage Configuration
-- ==============================================================================

-- 1. Create Core Tables

create table if not exists subjects (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  created_at timestamptz default now()
);

create table if not exists sources (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid references subjects(id) on delete cascade not null,
  file_name text not null,
  file_url text not null,
  created_at timestamptz default now()
);

create table if not exists wiki_sections (
  id uuid primary key default gen_random_uuid(),
  subject_id uuid references subjects(id) on delete cascade not null,
  title text not null,
  order_index int not null default 0,
  content_markdown text not null,
  updated_at timestamptz default now()
);

-- 2. Indexes for Fast Traversal & Ordering

create index if not exists idx_sources_subject_id on sources(subject_id);
create index if not exists idx_wiki_sections_subject_id_order on wiki_sections(subject_id, order_index asc);

-- 3. Row Level Security (RLS) Policies
-- Designed for personal / unified access while maintaining Supabase best practices

alter table subjects enable row level security;
alter table sources enable row level security;
alter table wiki_sections enable row level security;

-- Policies for subjects
drop policy if exists "Allow public read on subjects" on subjects;
create policy "Allow public read on subjects" on subjects
  for select using (true);

drop policy if exists "Allow public insert on subjects" on subjects;
create policy "Allow public insert on subjects" on subjects
  for insert with check (true);

drop policy if exists "Allow public update on subjects" on subjects;
create policy "Allow public update on subjects" on subjects
  for update using (true);

drop policy if exists "Allow public delete on subjects" on subjects;
create policy "Allow public delete on subjects" on subjects
  for delete using (true);

-- Policies for sources
drop policy if exists "Allow public read on sources" on sources;
create policy "Allow public read on sources" on sources
  for select using (true);

drop policy if exists "Allow public insert on sources" on sources;
create policy "Allow public insert on sources" on sources
  for insert with check (true);

drop policy if exists "Allow public delete on sources" on sources;
create policy "Allow public delete on sources" on sources
  for delete using (true);

-- Policies for wiki_sections
drop policy if exists "Allow public read on wiki_sections" on wiki_sections;
create policy "Allow public read on wiki_sections" on wiki_sections
  for select using (true);

drop policy if exists "Allow public insert on wiki_sections" on wiki_sections;
create policy "Allow public insert on wiki_sections" on wiki_sections
  for insert with check (true);

drop policy if exists "Allow public update on wiki_sections" on wiki_sections;
create policy "Allow public update on wiki_sections" on wiki_sections
  for update using (true);

drop policy if exists "Allow public delete on wiki_sections" on wiki_sections;
create policy "Allow public delete on wiki_sections" on wiki_sections
  for delete using (true);

-- 4. Storage Bucket Configuration: wiki-assets
-- Enable storage extension if needed and insert public bucket

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'wiki-assets',
  'wiki-assets',
  true,
  52428800, -- 50 MB limit
  null       -- Allow PDFs, images (png, jpg, webp)
)
on conflict (id) do update set
  public = true,
  file_size_limit = 52428800;

-- Storage RLS policies for wiki-assets bucket
drop policy if exists "Public Access for wiki-assets" on storage.objects;
create policy "Public Access for wiki-assets" on storage.objects
  for select using (bucket_id = 'wiki-assets');

drop policy if exists "Allow uploads to wiki-assets" on storage.objects;
create policy "Allow uploads to wiki-assets" on storage.objects
  for insert with check (bucket_id = 'wiki-assets');

drop policy if exists "Allow updates in wiki-assets" on storage.objects;
create policy "Allow updates in wiki-assets" on storage.objects
  for update using (bucket_id = 'wiki-assets');

drop policy if exists "Allow deletes in wiki-assets" on storage.objects;
create policy "Allow deletes in wiki-assets" on storage.objects
  for delete using (bucket_id = 'wiki-assets');
