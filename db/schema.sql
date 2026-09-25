-- Run once against your Postgres database (Neon / Supabase / Vercel Marketplace).
CREATE TABLE IF NOT EXISTS posts (
  id              SERIAL PRIMARY KEY,
  platform        TEXT NOT NULL,              -- facebook | linkedin | x | skool
  niche           TEXT NOT NULL,
  content_type    TEXT NOT NULL,
  language        TEXT NOT NULL,              -- en | bn
  slot_hour       INT  NOT NULL,              -- local hour 0-23
  scheduled_at    TIMESTAMPTZ NOT NULL,
  status          TEXT NOT NULL DEFAULT 'draft', -- draft | approved | published | manual | rejected | failed
  body            TEXT NOT NULL,
  poster_title    TEXT,
  external_id     TEXT,
  error           TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at    TIMESTAMPTZ,
  reach           INT,
  reactions       INT,
  comments        INT,
  shares          INT,
  score           REAL,
  metrics_source  TEXT,                       -- api | manual
  metrics_updated_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS posts_due_idx ON posts (status, scheduled_at);
CREATE INDEX IF NOT EXISTS posts_platform_idx ON posts (platform, published_at);

-- Dashboard settings; secret values are encrypted by the app.
CREATE TABLE IF NOT EXISTS settings (
  key        TEXT PRIMARY KEY,
  value      TEXT NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
