insert into public.app_config (key, value)
values
  ('limits.ai_credits_monthly', '30'),
  ('limits.x_posts_monthly', '10'),
  ('limits.x_link_post_weight', '5'),
  ('credits.cost_generate', '1'),
  ('credits.cost_refine', '1')
on conflict (key) do nothing;
