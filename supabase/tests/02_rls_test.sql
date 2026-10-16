begin;

select plan(10);

insert into public.projects (id, user_id, editor_state)
values
  ('dddddddd-dddd-4ddd-8ddd-dddddddddddd', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', '{}'),
  ('eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', '{}');

insert into public.posts (user_id, text)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'A ka post');

insert into public.credit_transactions (user_id, delta, reason)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', -1, 'test');

insert into public.x_accounts (user_id, x_user_id, username, access_token_enc, refresh_token_enc, expires_at, scopes)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'x-123', 'usera', 'v1.aa.bb', 'v1.cc.dd', now() + interval '2 hours', 'tweet.read tweet.write users.read');

set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';

select is((select count(*)::int from public.projects), 1, 'user A sirf apne projects dekhta hai');
select is((select count(*)::int from public.posts), 1, 'user A sirf apne posts dekhta hai');
select is((select count(*)::int from public.credit_transactions), 1, 'user A sirf apni ledger dekhta hai');
select is((select count(*)::int from public.profiles), 1, 'user A sirf apni profile dekhta hai');
select is((select username from public.x_accounts), 'usera', 'x_accounts ke public columns readable hain');

select throws_ok(
  $$select access_token_enc from public.x_accounts$$,
  '42501',
  'permission denied for table x_accounts',
  'token column client ko nahi milta'
);

select throws_ok(
  $$update public.profiles set ai_credits = 999 where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  '42501',
  'permission denied for table profiles',
  'client ai_credits update nahi kar sakta'
);

select lives_ok(
  $$update public.profiles set full_name = 'User A Renamed' where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$$,
  'client full_name update kar sakta hai'
);

select throws_ok(
  $$select * from public.rate_limits$$,
  '42501',
  'permission denied for table rate_limits',
  'rate_limits client ko accessible nahi'
);

select throws_ok(
  $$select * from public.pexels_cache$$,
  '42501',
  'permission denied for table pexels_cache',
  'pexels_cache client ko accessible nahi'
);

reset role;

select * from finish();
rollback;
