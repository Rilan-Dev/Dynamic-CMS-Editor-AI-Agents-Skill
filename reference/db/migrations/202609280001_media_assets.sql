-- Media uploads kept in Postgres (lib/server/mediaStore.ts).
--
-- The fallback used when object storage refuses writes, served from
-- /media/<name>. The application creates this table at runtime too; this
-- migration owns the definition and applies the same lock-down as
-- page_contents: only the server (table owner / service_role) can touch it.
--
-- Changes no data. Safe to re-run.

CREATE TABLE IF NOT EXISTS public.media_assets (
  name TEXT PRIMARY KEY,
  content_type TEXT NOT NULL,
  bytes BYTEA NOT NULL,
  size INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.media_assets ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.media_assets FROM PUBLIC;

DO $migration$
BEGIN
  IF to_regrole('anon') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE public.media_assets FROM anon';
  END IF;
  IF to_regrole('authenticated') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE public.media_assets FROM authenticated';
  END IF;
END
$migration$;
