begin;

select plan(7);

select is(
  (select ai_credits from public.profiles where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  5,
  'user A starts with 5 credits'
);

set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';

select throws_ok(
  $$select public.consume_credits('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 1, 'test')$$,
  '42501',
  'permission denied for function consume_credits',
  'authenticated consume_credits execute nahi kar sakta'
);

reset role;

select is(
  public.consume_credits('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 2, 'generate'),
  3,
  '3 credits remain after consuming 2'
);

select throws_ok(
  $$select public.consume_credits('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', -1, 'hack')$$,
  'P0001',
  'INVALID_AMOUNT',
  'negative amount reject hota hai'
);

select public.consume_credits('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 3, 'generate');

select throws_ok(
  $$select public.consume_credits('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 1, 'generate')$$,
  'P0001',
  'INSUFFICIENT_CREDITS',
  '0 credits pe INSUFFICIENT_CREDITS'
);

select public.refund_credits('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', 3, 'ai_failed');

select is(
  (select ai_credits from public.profiles where id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  3,
  'refund ke baad 3 credits'
);

select is(
  (select count(*)::int from public.credit_transactions where user_id = 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),
  3,
  'ledger mein 3 entries hain'
);

select * from finish();
rollback;
