begin;
select no_plan();

insert into public.billing_orders(id,user_id,product_key,product_id,environment,credits,price_cents) values
('11111111-1111-4111-8111-111111111111','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','credits100','prod100','test_mode',100,299),
('22222222-2222-4222-8222-222222222222','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','credits500','prod500','test_mode',500,899),
('33333333-3333-4333-8333-333333333333','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','lifetime','prodLife','test_mode',100,999);

select ok(public.claim_dodo_checkout('11111111-1111-4111-8111-111111111111'),'first checkout claim succeeds');
select ok(not public.claim_dodo_checkout('11111111-1111-4111-8111-111111111111'),'concurrent checkout claim blocked');
set local role authenticated;
set local request.jwt.claims = '{"sub":"bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb","role":"authenticated"}';
select is((select count(*)::int from public.billing_orders),0,'other user cannot read receipts');
select throws_ok($$select public.claim_dodo_checkout('11111111-1111-4111-8111-111111111111')$$,'42501','permission denied for function claim_dodo_checkout','clients cannot claim checkout');
select throws_ok($$update public.profiles set lifetime_editor=true where id='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'$$,'42501','permission denied for table profiles','clients cannot unlock lifetime');
select throws_ok($$insert into public.billing_orders(id,product_key,product_id,environment,credits,price_cents) values(gen_random_uuid(),'lifetime','hack','live_mode',99999,1)$$,'42501','permission denied for table billing_orders','clients cannot forge orders');
reset role;

select throws_ok($$select public.sync_dodo_order('11111111-1111-4111-8111-111111111111','pay100','wrong','cks100',299,'USD',0,'test_mode')$$,'P0001','PAYMENT_MISMATCH','wrong product rejected');
select throws_ok($$select public.sync_dodo_order('11111111-1111-4111-8111-111111111111','pay100','prod100','cks100',1,'USD',0,'test_mode')$$,'P0001','PAYMENT_MISMATCH','underpayment rejected');
select throws_ok($$select public.sync_dodo_order('11111111-1111-4111-8111-111111111111','pay100','prod100','cks100',299,'USD',0,'live_mode')$$,'P0001','PAYMENT_MISMATCH','test/live isolation');

select public.sync_dodo_order('11111111-1111-4111-8111-111111111111','pay100','prod100','cks100',299,'USD',0,'test_mode');
select is((select ai_credits from public.profiles where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),105,'credit purchase grants 100 once');
select public.sync_dodo_order('11111111-1111-4111-8111-111111111111','pay100','prod100','cks100',299,'USD',0,'test_mode');
select is((select ai_credits from public.profiles where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),105,'duplicate payment does not grant again');
select is((select count(*)::int from public.credit_transactions where reason='purchase:credits100'),1,'single purchase ledger entry');

select public.consume_credits('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',103,'test_usage');
select public.sync_dodo_order('11111111-1111-4111-8111-111111111111','pay100','prod100','cks100',299,'USD',149,'test_mode');
select is((select ai_credits from public.profiles where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),0,'refund clamps available balance to zero');
select is((select credit_debt from public.profiles where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),48,'used refunded credits become debt');
select public.sync_dodo_order('11111111-1111-4111-8111-111111111111','pay100','prod100','cks100',299,'USD',299,'test_mode');
select is((select credit_debt from public.profiles where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),98,'full refund revokes remaining credit entitlement');
select public.sync_dodo_order('11111111-1111-4111-8111-111111111111','pay100','prod100','cks100',299,'USD',0,'test_mode');
select is((select credit_debt from public.profiles where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),98,'stale succeeded event cannot reverse refund');
select public.refund_credits('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',20,'failed_generation');
select is((select credit_debt from public.profiles where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),78,'failed AI refunds settle debt first');

select public.sync_dodo_order('22222222-2222-4222-8222-222222222222','pay500','prod500','cks500',899,'USD',0,'test_mode');
select is((select ai_credits from public.profiles where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),422,'top-up settles debt then adds remaining credits');
select is((select credit_debt from public.profiles where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),0,'debt settled');
update public.profiles set credits_reset_at=now()-interval '2 months' where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select public.reset_monthly_credits();
select is((select ai_credits from public.profiles where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),422,'scheduled monthly reset cannot erase paid credits');

select public.sync_dodo_order('33333333-3333-4333-8333-333333333333','payLife','prodLife','cksLife',999,'USD',0,'test_mode');
select ok((select lifetime_editor from public.profiles where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),'lifetime purchase unlocks editor');
select is((select ai_credits from public.profiles where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),522,'lifetime includes 100 credits');
select public.sync_dodo_order('33333333-3333-4333-8333-333333333333','payLife','prodLife','cksLife',999,'USD',999,'test_mode');
select ok(not (select lifetime_editor from public.profiles where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),'full lifetime refund revokes licence');
select is((select ai_credits from public.profiles where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),422,'full lifetime refund revokes bundled credits');

select throws_ok($$select public.sync_dodo_order('22222222-2222-4222-8222-222222222222','different_payment','prod500','cks500',899,'USD',0,'test_mode')$$,'P0001','PAYMENT_MISMATCH','order cannot be credited by a second payment');
set local role authenticated;
set local request.jwt.claims = '{"sub":"aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa","role":"authenticated"}';
select is((select count(*)::int from public.billing_orders),3,'owner can read own receipts');
select throws_ok($$select public.sync_dodo_order('22222222-2222-4222-8222-222222222222','pay500','prod500','cks500',899,'USD',0,'test_mode')$$,'42501','permission denied for function sync_dodo_order','client cannot execute fulfilment');
reset role;
select * from finish();
rollback;
