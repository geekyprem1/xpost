begin;

select plan(9);

insert into public.x_accounts (user_id, x_user_id, username, access_token_enc, refresh_token_enc, expires_at, scopes)
values ('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'x-777', 'usera', 'v1.aa.bb', 'v1.cc.dd', now() + interval '2 hours', 'tweet.read tweet.write users.read');

select is(public.claim_x_token_refresh('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), true, 'pehla refresh claim milta hai');
select is(public.claim_x_token_refresh('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'), false, 'lease ke andar doosra claim nahi milta');

select isnt(
  public.reserve_x_post('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'normal post', 'image', false, null),
  null::uuid,
  'normal post reserve hoti hai'
);

select is(
  (select weight from public.posts where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and has_url = false),
  1,
  'normal post ka weight 1 hai'
);

select isnt(
  public.reserve_x_post('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'link post', 'image', true, null),
  null::uuid,
  'link post reserve hoti hai'
);

select is(
  (select weight from public.posts where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and has_url = true),
  5,
  'link post ka weight 5 hai'
);

select throws_ok(
  $$select public.reserve_x_post('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'link post 2', 'image', true, null)$$,
  'P0001',
  'X_POST_LIMIT_REACHED',
  'limit cross hone pe X_POST_LIMIT_REACHED'
);

update public.posts set status = 'failed' where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';

select isnt(
  public.reserve_x_post('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 'link post 3', 'image', true, null),
  null::uuid,
  'failed posts limit mein count nahi hote'
);

select is(
  (select coalesce(sum(weight), 0)::int from public.posts where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa' and status in ('pending', 'posted')),
  5,
  'period ka used weight sirf active posts ka hai'
);

select * from finish();
rollback;
