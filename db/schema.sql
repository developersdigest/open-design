-- Mock users
CREATE TABLE IF NOT EXISTS app_user (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Each brand decode = the root record
CREATE TABLE IF NOT EXISTS brand_run (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES app_user(id) ON DELETE CASCADE,
  source_url text NOT NULL,
  brand_name text,
  branding jsonb,
  copy jsonb,
  screenshot_url text,
  tokens int,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS brand_run_user_idx ON brand_run(user_id, created_at DESC);

-- Design system specs (1:N to brand_run since you can re-generate)
CREATE TABLE IF NOT EXISTS design_spec (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_run_id uuid NOT NULL REFERENCES brand_run(id) ON DELETE CASCADE,
  strategy jsonb,
  design_md text,
  tokens int,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Generated landing pages
CREATE TABLE IF NOT EXISTS landing_page (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_run_id uuid NOT NULL REFERENCES brand_run(id) ON DELETE CASCADE,
  outline jsonb,
  html text,
  tokens int,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Marketing asset packs
CREATE TABLE IF NOT EXISTS asset_pack (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_run_id uuid NOT NULL REFERENCES brand_run(id) ON DELETE CASCADE,
  assets jsonb,
  mocked boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Seed a couple mock users so the demo has accounts
INSERT INTO app_user (email, name) VALUES
  ('jonathan@dd.dev', 'Jonathan'),
  ('alice@indie.co',  'Alice Founder'),
  ('riley@agency.io', 'Riley PM')
ON CONFLICT (email) DO NOTHING;

-- Extracted font URLs from a brand site (deterministic CSS parse, no LLM)
CREATE TABLE IF NOT EXISTS font_pack (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  brand_run_id uuid REFERENCES brand_run(id) ON DELETE CASCADE,
  source_url text NOT NULL,
  fonts jsonb NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
