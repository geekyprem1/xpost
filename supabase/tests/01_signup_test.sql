begin;

select plan(4);

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values (
  '00000000-0000-0000-0000-000000000000',
  'cccccccc-cccc-4ccc-8ccc-cccccccccccc',
  'authenticated', 'authenticated',
  'signup-test@test.dev', '', now(),
  '{"provider":"email","providers":["email"]}',
  '{"full_name":"Signup Test","avatar_url":"https://example.com/a.png"}',
  now(), now()
);

select is(
  (select count(*)::int from public.profiles where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
  1,
  'signup pe profile row banti hai'
);

select is(
  (select ai_credits from public.profiles where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
  30,
  'app_config ke limit se 30 credits milte hain'
);

select is(
  (select full_name from public.profiles where id = 'cccccccc-cccc-4ccc-8ccc-cccccccccccc'),
  'Signup Test',
  'full_name metadata se aata hai'
);

select is(
  (select value #>> '{}' from public.app_config where key = 'limits.ai_credits_monthly'),
  '30',
  'app_config default set hai'
);

select * from finish();
rollback;
