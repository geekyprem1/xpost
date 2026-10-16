-- CI test fixtures — real project pe nahi chalta (ARCH §11.1 rule 4)

insert into auth.users (instance_id, id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
values
  ('00000000-0000-0000-0000-000000000000', 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'authenticated', 'authenticated', 'user-a@test.dev', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"User A"}', now(), now()),
  ('00000000-0000-0000-0000-000000000000', 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', 'authenticated', 'authenticated', 'user-b@test.dev', '', now(), '{"provider":"email","providers":["email"]}', '{"full_name":"User B"}', now(), now());
