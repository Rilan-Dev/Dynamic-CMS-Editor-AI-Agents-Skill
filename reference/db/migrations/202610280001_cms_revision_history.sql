-- Immutable CMS snapshots, one per published document version.
-- Safe on existing deployments: never overwrite page_contents or renumber prior releases.
-- Migration runner rewrites public. references to DATABASE_SCHEMA; all writes stay environment-local.

ALTER TABLE public.page_contents
  ADD COLUMN IF NOT EXISTS draft_revision BIGINT NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS public.cms_releases (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  request_id UUID NOT NULL UNIQUE,
  action TEXT NOT NULL DEFAULT 'publish'
    CHECK (action IN ('publish', 'rollback', 'baseline')),
  actor TEXT NOT NULL DEFAULT 'cms_session',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.cms_revisions (
  slug TEXT NOT NULL REFERENCES public.page_contents(slug) ON DELETE RESTRICT,
  version INTEGER NOT NULL CHECK (version >= 0),
  snapshot JSONB NOT NULL,
  content_hash TEXT NOT NULL,
  release_id UUID REFERENCES public.cms_releases(id) ON DELETE RESTRICT,
  action TEXT NOT NULL DEFAULT 'publish'
    CHECK (action IN ('publish', 'rollback', 'baseline')),
  restored_from_version INTEGER,
  published_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (slug, version)
);

CREATE INDEX IF NOT EXISTS cms_revisions_recent_idx
  ON public.cms_revisions (slug, version DESC);
CREATE INDEX IF NOT EXISTS cms_revisions_release_idx
  ON public.cms_revisions (release_id);

-- Baseline entries represent the latest published version that predates this feature.
-- Historical versions earlier than this baseline cannot be reconstructed.
INSERT INTO public.cms_revisions (
  slug, version, snapshot, content_hash, action, published_at
)
SELECT slug, version, published, md5(published::text), 'baseline',
       COALESCE(published_at, updated_at, now())
FROM public.page_contents
WHERE published IS NOT NULL
ON CONFLICT (slug, version) DO NOTHING;

-- Lock down internal archives from API-exposed browser roles.
ALTER TABLE public.cms_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cms_releases ENABLE ROW LEVEL SECURITY;
REVOKE ALL PRIVILEGES ON TABLE public.cms_revisions FROM PUBLIC;
REVOKE ALL PRIVILEGES ON TABLE public.cms_releases FROM PUBLIC;

DO $cms_history_acl$
BEGIN
  IF to_regrole('anon') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE public.cms_revisions FROM anon';
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE public.cms_releases FROM anon';
  END IF;
  IF to_regrole('authenticated') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE public.cms_revisions FROM authenticated';
    EXECUTE 'REVOKE ALL PRIVILEGES ON TABLE public.cms_releases FROM authenticated';
  END IF;
END
$cms_history_acl$;

-- History is append-only even for accidental UPDATE/DELETE by the server role.
-- Existing rows may be inserted during backfill; the trigger blocks all mutation after insertion.
CREATE OR REPLACE FUNCTION public.cms_deny_revision_mutation()
RETURNS trigger
LANGUAGE plpgsql
AS $cms_immutable$
BEGIN
  RAISE EXCEPTION 'CMS revision history is immutable' USING ERRCODE = '55000';
END
$cms_immutable$;

DROP TRIGGER IF EXISTS cms_revisions_immutable ON public.cms_revisions;
CREATE TRIGGER cms_revisions_immutable
BEFORE UPDATE OR DELETE ON public.cms_revisions
FOR EACH ROW EXECUTE FUNCTION public.cms_deny_revision_mutation();
