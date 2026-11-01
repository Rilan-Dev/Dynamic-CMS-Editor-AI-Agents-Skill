-- Non-destructive CMS rollback. The selected content is always read from an
-- immutable database snapshot, never from JSON supplied by the browser.
-- Migration runner rewrites public. references into DATABASE_SCHEMA.
ALTER TABLE public.cms_releases ADD COLUMN IF NOT EXISTS restore_result JSONB;
CREATE OR REPLACE FUNCTION public.cms_restore_revision(
  p_slug TEXT, p_source_version INTEGER, p_expected_version INTEGER,
  p_expected_draft_revision BIGINT, p_mode TEXT, p_request_id UUID
) RETURNS JSONB LANGUAGE plpgsql SET search_path = '' AS $restore$
DECLARE
  v_live public.page_contents%ROWTYPE;
  v_new public.page_contents%ROWTYPE;
  v_source JSONB;
  v_release UUID;
  v_prior public.cms_releases%ROWTYPE;
  v_hash TEXT;
  v_changed BOOLEAN := FALSE;
  v_result JSONB;
BEGIN
  IF p_slug IS NULL OR p_slug !~ '^[a-z0-9-]+$'
     OR p_source_version IS NULL OR p_source_version < 0
     OR p_expected_version IS NULL OR p_expected_version < 0
     OR p_expected_draft_revision IS NULL OR p_expected_draft_revision < 0
     OR p_mode NOT IN ('draft','publish') OR p_mode IS NULL
     OR p_request_id IS NULL THEN
    RAISE EXCEPTION 'Invalid CMS restoration' USING ERRCODE = '22023';
  END IF;

  -- Reuse the publication advisory lock, keeping restore and publish serialized.
  PERFORM pg_catalog.pg_advisory_xact_lock(712004526);
  v_hash := md5(pg_catalog.jsonb_build_object(
    'kind','rollback','slug',p_slug,'sourceVersion',p_source_version,
    'expectedVersion',p_expected_version,'expectedDraftRevision',p_expected_draft_revision,
    'mode',p_mode)::text);

  IF p_mode = 'publish' THEN
    SELECT * INTO v_prior FROM public.cms_releases WHERE request_id = p_request_id;
    IF FOUND THEN
      IF v_prior.action <> 'rollback' OR v_prior.request_hash IS DISTINCT FROM v_hash THEN
        RAISE EXCEPTION 'CMS_REQUEST_ID_REUSED' USING ERRCODE = '22023';
      END IF;
      IF v_prior.restore_result IS NULL THEN
        RAISE EXCEPTION 'CMS_RESTORE_RESULT_MISSING' USING ERRCODE = '22023';
      END IF;
      RETURN v_prior.restore_result;
    END IF;
  END IF;

  SELECT * INTO v_live FROM public.page_contents WHERE slug = p_slug FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'CMS_SOURCE_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;
  SELECT snapshot INTO v_source FROM public.cms_revisions
    WHERE slug=p_slug AND version=p_source_version;
  IF NOT FOUND THEN RAISE EXCEPTION 'CMS_SOURCE_NOT_FOUND' USING ERRCODE = 'P0002'; END IF;

  IF v_live.version <> p_expected_version
     OR v_live.draft_revision <> p_expected_draft_revision THEN
    RAISE EXCEPTION 'CMS_VERSION_CONFLICT' USING ERRCODE = '40001';
  END IF;

  IF p_mode='draft' THEN
    IF v_live.draft IS DISTINCT FROM v_source THEN
      UPDATE public.page_contents SET draft=v_source,
        draft_revision=draft_revision+1, updated_at=now()
        WHERE slug=p_slug RETURNING * INTO v_new;
      v_changed := TRUE;
    ELSE
      v_new := v_live;
    END IF;
  ELSE
    INSERT INTO public.cms_releases(request_id,request_hash,action,actor)
      VALUES(p_request_id,v_hash,'rollback','cms_session') RETURNING id INTO v_release;
    IF v_live.published IS DISTINCT FROM v_source THEN
      UPDATE public.page_contents SET published=v_source,draft=v_source,
        version=version+1,draft_revision=draft_revision+1,
        updated_at=now(),published_at=now()
        WHERE slug=p_slug RETURNING * INTO v_new;
      INSERT INTO public.cms_revisions(
        slug,version,snapshot,content_hash,release_id,action,
        restored_from_version,published_at,draft_revision
      ) VALUES (
        p_slug,v_new.version,v_source,md5(v_source::text),v_release,'rollback',
        p_source_version,v_new.published_at,v_new.draft_revision
      );
      v_changed := TRUE;
    ELSE
      IF v_live.draft IS DISTINCT FROM v_source THEN
        UPDATE public.page_contents SET draft=v_source,
          draft_revision=draft_revision+1,updated_at=now()
          WHERE slug=p_slug RETURNING * INTO v_new;
      ELSE
        v_new:=v_live;
      END IF;
    END IF;
  END IF;
  v_result := pg_catalog.jsonb_build_object(
    'slug',p_slug,'mode',p_mode,'releaseId',v_release,
    'version',v_new.version,'draftRevision',v_new.draft_revision,
    'restoredFromVersion',p_source_version,'changed',v_changed,
    'snapshot',v_source);
  IF p_mode='publish' THEN
    UPDATE public.cms_releases SET restore_result=v_result WHERE id=v_release;
  END IF;
  RETURN v_result;
END $restore$;

REVOKE ALL ON FUNCTION public.cms_restore_revision(TEXT,INTEGER,INTEGER,BIGINT,TEXT,UUID) FROM PUBLIC;
DO $acl$
BEGIN
  IF to_regrole('anon') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.cms_restore_revision(TEXT,INTEGER,INTEGER,BIGINT,TEXT,UUID) FROM anon';
  END IF;
  IF to_regrole('authenticated') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.cms_restore_revision(TEXT,INTEGER,INTEGER,BIGINT,TEXT,UUID) FROM authenticated';
  END IF;
  IF to_regrole('service_role') IS NOT NULL THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.cms_restore_revision(TEXT,INTEGER,INTEGER,BIGINT,TEXT,UUID) TO service_role';
  END IF;
END $acl$;
