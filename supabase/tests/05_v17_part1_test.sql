begin;

select plan(21);

-- ── user_styles: RLS isolation ──────────────────────────────────────────
insert into public.user_styles (user_id, name, style)
values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'B ka style', '{"aspect":"1:1"}');

set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';

select lives_ok(
  $$insert into public.user_styles (name, style) values ('A ka style', '{"aspect":"16:9"}')$$,
  'client apna style insert kar sakta hai (user_id default auth.uid())'
);
select is(
  (select user_id from public.user_styles where name = 'A ka style'),
  'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'::uuid,
  'default user_id = logged-in user'
);
select is((select count(*)::int from public.user_styles), 1, 'user A sirf apne styles dekhta hai');

select throws_ok(
  $$insert into public.user_styles (user_id, name, style) values ('bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'Fake', '{}')$$,
  '42501',
  'new row violates row-level security policy for table "user_styles"',
  'doosre user ke naam pe style insert nahi hota'
);

update public.user_styles set name = 'Hacked' where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
delete from public.user_styles where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';

select lives_ok(
  $$update public.user_styles set name = 'Renamed' where name = 'A ka style'$$,
  'apna style rename ho sakta hai'
);

select throws_ok(
  $$update public.user_styles set user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'$$,
  '42501',
  'permission denied for table user_styles',
  'user_id update nahi ho sakta (column grant)'
);

select throws_ok(
  $$insert into public.user_styles (name, style) values ('', '{}')$$,
  '23514',
  null,
  'khaali naam reject'
);

select throws_ok(
  $$insert into public.user_styles (name, style) values ('Array', '[]')$$,
  '23514',
  null,
  'style object hi hona chahiye'
);

-- ── profiles: preview_identity + credits abhi bhi locked ─────────────────
select lives_ok(
  $$update public.profiles set preview_identity = '{"name":"User A","handle":"usera","verified":false}' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  'client preview_identity update kar sakta hai'
);
select throws_ok(
  $$update public.profiles set preview_identity = '"just text"' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '23514',
  null,
  'preview_identity object hi ho'
);
select throws_ok(
  $$update public.profiles set ai_credits = 999 where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '42501',
  'permission denied for table profiles',
  'ai_credits ab bhi client se update nahi hota'
);

-- ── projects: post_versions + thumbnail_path checks ─────────────────────
select lives_ok(
  $$insert into public.projects (id, editor_state, post_versions, user_id)
    values ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', '{}', '["v1","v2"]', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$$,
  'project post_versions ke saath insert hota hai'
);
select throws_ok(
  $$update public.projects set post_versions = (select jsonb_agg(i) from generate_series(1, 21) i)
    where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'$$,
  '23514',
  null,
  'post_versions max 20'
);
select lives_ok(
  $$update public.projects set thumbnail_path = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa/dddddddd-dddd-4ddd-8ddd-dddddddddddd/thumb.webp'
    where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'$$,
  'apne project folder ka thumbnail path allowed'
);
select throws_ok(
  $$update public.projects set thumbnail_path = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb/x/thumb.webp'
    where id = 'dddddddd-dddd-4ddd-8ddd-dddddddddddd'$$,
  '23514',
  null,
  'doosre user ka thumbnail path reject'
);

-- ── Limits (brand_styles_max 10, projects_max 50) ────────────────────────
-- A ke paas abhi 1 style hai → 9 aur = 10 (limit).
select lives_ok(
  $$insert into public.user_styles (name, style) select 'S' || i, '{}' from generate_series(2, 10) i$$,
  '10 styles tak insert hote hain'
);
select throws_ok(
  $$insert into public.user_styles (name, style) values ('S11', '{}')$$,
  'P0001',
  'BRAND_STYLES_LIMIT_REACHED',
  '11th style BRAND_STYLES_LIMIT_REACHED'
);

reset role;

select is(
  (select name from public.user_styles where user_id = 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'),
  'B ka style',
  'A ka update / delete B ke style tak nahi pahuncha'
);

set local role anon;
select throws_ok(
  $$select * from public.user_styles$$,
  '42501',
  'permission denied for table user_styles',
  'anon user_styles nahi padh sakta'
);
reset role;

-- Limit app_config se aata hai: test ke liye 2 kar do.
update public.app_config set value = '2' where key = 'limits.projects_max';

set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';

select lives_ok(
  $$insert into public.projects (editor_state, user_id) values ('{}', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$$,
  'limit tak project insert hota hai'
);
select throws_ok(
  $$insert into public.projects (editor_state, user_id) values ('{}', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$$,
  'P0001',
  'PROJECTS_LIMIT_REACHED',
  'limit ke baad PROJECTS_LIMIT_REACHED'
);

reset role;

select * from finish();
rollback;
