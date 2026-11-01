-- Lock down the CMS content table.
--
-- page_contents was created at runtime by lib/server/db.ts, so it inherited
-- the public schema's default privileges: anon and authenticated could read
-- every row (drafts included) and INSERT/UPDATE/DELETE/TRUNCATE it through
-- the Data API. The application only ever reaches this table server-side, as
-- the table owner (postgres) or service_role, both of which bypass RLS.
--
-- Changes no data. Safe to re-run: the migration runner applies every file
-- on each invocation.

-- Owning table creation here means a fresh database never gets the table
-- created by the app first under those wide-open default privileges.
-- Definition matches ensureSchema() in lib/server/db.ts.
CREATE TABLE IF NOT EXISTS public.page_contents (
  slug TEXT PRIMARY KEY,
  draft JSONB,
  published JSONB,
  version INTEGER NOT NULL DEFAULT 0,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  published_at TIMESTAMPTZ
);

ALTER TABLE public.page_contents ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.page_contents FROM PUBLIC;

-- Explicit deny for every command. With RLS enabled and no permissive
-- policy these roles are already refused; the restrictive policies make
-- that intent visible and keep it true if a permissive policy is ever added.
DROP POLICY IF EXISTS page_contents_deny_select ON public.page_contents;
DROP POLICY IF EXISTS page_contents_deny_insert ON public.page_contents;
DROP POLICY IF EXISTS page_contents_deny_update ON public.page_contents;
DROP POLICY IF EXISTS page_contents_deny_delete ON public.page_contents;

DO $migration$
BEGIN
  IF to_regrole('anon') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE public.page_contents FROM anon';
  END IF;

  IF to_regrole('authenticated') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE public.page_contents FROM authenticated';
  END IF;

  -- Policies only name roles that exist, so this also runs on plain
  -- Postgres without Supabase's roles.
  IF to_regrole('anon') IS NOT NULL AND to_regrole('authenticated') IS NOT NULL THEN
    EXECUTE $policy$
      CREATE POLICY page_contents_deny_select ON public.page_contents
      AS RESTRICTIVE FOR SELECT TO anon, authenticated
      USING (false)
    $policy$;
    EXECUTE $policy$
      CREATE POLICY page_contents_deny_insert ON public.page_contents
      AS RESTRICTIVE FOR INSERT TO anon, authenticated
      WITH CHECK (false)
    $policy$;
    EXECUTE $policy$
      CREATE POLICY page_contents_deny_update ON public.page_contents
      AS RESTRICTIVE FOR UPDATE TO anon, authenticated
      USING (false)
      WITH CHECK (false)
    $policy$;
    EXECUTE $policy$
      CREATE POLICY page_contents_deny_delete ON public.page_contents
      AS RESTRICTIVE FOR DELETE TO anon, authenticated
      USING (false)
    $policy$;
  END IF;
END
$migration$;
