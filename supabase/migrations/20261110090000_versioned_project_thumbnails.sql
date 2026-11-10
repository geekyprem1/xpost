-- Immutable thumbnail objects keep rejected/concurrent saves from overwriting
-- the winning project's preview. Existing fixed-path thumbnails remain valid.
alter table public.projects
  drop constraint projects_thumbnail_path_own,
  add constraint projects_thumbnail_path_own check (
    thumbnail_path is null
    or thumbnail_path ~ (
      '^' || user_id::text || '/' || id::text || '/thumb(-[A-Za-z0-9]{1,16})?[.]webp$'
    )
  );
