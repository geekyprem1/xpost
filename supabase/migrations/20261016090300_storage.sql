insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('uploads', 'uploads', false, 10485760, array['image/png', 'image/jpeg', 'image/webp']),
  ('exports', 'exports', false, 20971520, array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4']),
  ('assets', 'assets', true, null, null)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
