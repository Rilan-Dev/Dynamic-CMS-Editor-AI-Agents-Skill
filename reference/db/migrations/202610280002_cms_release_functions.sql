-- Atomic CMS releases. Called through server-owned pg connections or service-role Supabase RPC.
-- Rewritten into DATABASE_SCHEMA by the existing migration runner.
ALTER TABLE public.cms_releases ADD COLUMN IF NOT EXISTS request_hash TEXT;
ALTER TABLE public.cms_revisions ADD COLUMN IF NOT EXISTS draft_revision BIGINT NOT NULL DEFAULT 0;

CREATE OR REPLACE FUNCTION public.cms_save_draft(
  p_slug TEXT, p_draft JSONB, p_expected_version INTEGER, p_expected_draft_revision BIGINT
) RETURNS JSONB LANGUAGE plpgsql SET search_path = '' AS $save$
DECLARE v_row public.page_contents%ROWTYPE;
BEGIN
  IF p_slug !~ '^[a-z0-9-]+$' OR jsonb_typeof(p_draft) <> 'object'
    OR p_expected_version IS NULL OR p_expected_draft_revision IS NULL
    OR p_expected_version < 0 OR p_expected_draft_revision < 0 THEN
    RAISE EXCEPTION 'Invalid CMS draft request' USING ERRCODE = '22023';
  END IF;
  IF p_expected_version <> 0 OR p_expected_draft_revision <> 0 THEN
    -- This statement can only update a previously existing row.
    UPDATE public.page_contents SET draft = p_draft,
      draft_revision = draft_revision + 1, updated_at = now()
    WHERE slug = p_slug AND version = p_expected_version
      AND draft_revision = p_expected_draft_revision
    RETURNING * INTO v_row;
  ELSE
    INSERT INTO public.page_contents (slug, draft, version, draft_revision)
    VALUES (p_slug, p_draft, 0, 1)
    ON CONFLICT (slug) DO UPDATE SET
      draft = EXCLUDED.draft,
      draft_revision = public.page_contents.draft_revision + 1,
      updated_at = now()
    WHERE public.page_contents.version = 0
      AND public.page_contents.draft_revision = 0
    RETURNING * INTO v_row;
  END IF;
  IF v_row.slug IS NULL THEN
    RAISE EXCEPTION 'CMS_VERSION_CONFLICT' USING ERRCODE = '40001';
  END IF;
  RETURN to_jsonb(v_row);
END $save$;

CREATE OR REPLACE FUNCTION public.cms_discard_draft(
  p_slug TEXT, p_expected_version INTEGER, p_expected_draft_revision BIGINT
) RETURNS JSONB LANGUAGE plpgsql SET search_path = '' AS $discard$
DECLARE v_row public.page_contents%ROWTYPE;
BEGIN
  IF p_slug !~ '^[a-z0-9-]+$' OR p_expected_version IS NULL
     OR p_expected_draft_revision IS NULL THEN
    RAISE EXCEPTION 'Invalid discard request' USING ERRCODE = '22023';
  END IF;
  UPDATE public.page_contents SET draft = published,
    draft_revision = draft_revision + 1, updated_at = now()
    WHERE slug = p_slug AND version = p_expected_version
      AND draft_revision = p_expected_draft_revision
    RETURNING * INTO v_row;
  IF v_row.slug IS NULL THEN RAISE EXCEPTION 'CMS_VERSION_CONFLICT' USING ERRCODE = '40001'; END IF;
  RETURN to_jsonb(v_row);
END $discard$;

CREATE OR REPLACE FUNCTION public.cms_publish_release(p_request_id UUID, p_documents JSONB)
RETURNS JSONB LANGUAGE plpgsql SET search_path = '' AS $release$
DECLARE
  v_item JSONB;
  v_slug TEXT;
  v_doc JSONB;
  v_old public.page_contents%ROWTYPE;
  v_new public.page_contents%ROWTYPE;
  v_expected_version INTEGER;
  v_expected_draft BIGINT;
  v_seen TEXT[] := ARRAY[]::TEXT[];
  v_release UUID;
  v_request_hash TEXT := md5(p_documents::TEXT);
  v_previous public.cms_releases%ROWTYPE;
  v_docs JSONB := '[]'::JSONB;
  v_changes INTEGER := 0;
BEGIN
  IF p_request_id IS NULL OR jsonb_typeof(p_documents) <> 'array'
    OR jsonb_array_length(p_documents) = 0 OR jsonb_array_length(p_documents) > 25 THEN
    RAISE EXCEPTION 'Invalid CMS release' USING ERRCODE = '22023';
  END IF;
  -- Serializes releases; ordinary draft saves still coordinate via row versions.
  PERFORM pg_catalog.pg_advisory_xact_lock(712004526);
  SELECT * INTO v_previous FROM public.cms_releases WHERE request_id = p_request_id;
  IF FOUND THEN
    IF v_previous.request_hash IS DISTINCT FROM v_request_hash THEN
      RAISE EXCEPTION 'CMS_REQUEST_ID_REUSED' USING ERRCODE = '22023';
    END IF;
    RETURN pg_catalog.jsonb_build_object('releaseId', v_previous.id,
      'documents', COALESCE((SELECT pg_catalog.jsonb_agg(
        pg_catalog.jsonb_build_object('slug', slug, 'version', version, 'draftRevision', draft_revision))
        FROM public.cms_revisions WHERE release_id = v_previous.id), '[]'::JSONB));
  END IF;
  -- Preconditions on *every* document precede all publication changes.
  FOR v_item IN SELECT value FROM pg_catalog.jsonb_array_elements(p_documents) LOOP
    v_slug := v_item->>'slug';
    IF v_slug IS NULL OR v_slug !~ '^[a-z0-9-]+$' OR v_slug = ANY(v_seen)
      OR jsonb_typeof(v_item->'document') <> 'object'
      OR jsonb_typeof(v_item->'expectedVersion') <> 'number'
      OR jsonb_typeof(v_item->'expectedDraftRevision') <> 'number' THEN
      RAISE EXCEPTION 'Invalid CMS release document' USING ERRCODE = '22023';
    END IF;
    v_seen := array_append(v_seen, v_slug);
    v_expected_version := (v_item->>'expectedVersion')::INTEGER;
    v_expected_draft := (v_item->>'expectedDraftRevision')::BIGINT;
    IF v_expected_version < 0 OR v_expected_draft < 0 THEN
      RAISE EXCEPTION 'Invalid CMS release precondition' USING ERRCODE = '22023';
    END IF;
    INSERT INTO public.page_contents (slug, version, draft_revision)
      VALUES (v_slug, 0, 0) ON CONFLICT DO NOTHING;
    SELECT * INTO v_old FROM public.page_contents WHERE slug = v_slug FOR UPDATE;
    IF v_old.version <> v_expected_version OR v_old.draft_revision <> v_expected_draft THEN
      RAISE EXCEPTION 'CMS_VERSION_CONFLICT' USING ERRCODE = '40001';
    END IF;
  END LOOP;
  FOR v_item IN SELECT value FROM pg_catalog.jsonb_array_elements(p_documents) LOOP
    v_slug := v_item->>'slug';
    v_doc := v_item->'document';
    SELECT * INTO v_old FROM public.page_contents WHERE slug = v_slug FOR UPDATE;
    IF v_old.published IS DISTINCT FROM v_doc THEN
      IF v_release IS NULL THEN
        INSERT INTO public.cms_releases (request_id, request_hash, action, actor)
          VALUES (p_request_id, v_request_hash, 'publish', 'cms_session') RETURNING id INTO v_release;
      END IF;
      UPDATE public.page_contents SET published = v_doc, draft = v_doc,
        version = version + 1, draft_revision = draft_revision + 1,
        updated_at = now(), published_at = now()
        WHERE slug = v_slug RETURNING * INTO v_new;
      INSERT INTO public.cms_revisions (
        slug, version, snapshot, content_hash, release_id, action, published_at, draft_revision
      ) VALUES (
        v_slug, v_new.version, v_doc, md5(v_doc::TEXT),
        v_release, 'publish', v_new.published_at, v_new.draft_revision
      );
      v_docs := v_docs || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
        'slug', v_slug, 'version', v_new.version, 'draftRevision', v_new.draft_revision));
      v_changes := v_changes + 1;
    ELSE
      v_docs := v_docs || pg_catalog.jsonb_build_array(pg_catalog.jsonb_build_object(
        'slug', v_slug, 'version', v_old.version, 'draftRevision', v_old.draft_revision));
    END IF;
  END LOOP;
  RETURN pg_catalog.jsonb_build_object('releaseId', v_release, 'documents', v_docs, 'changed', v_changes);
END $release$;

-- Only the server-side service role or the SQL connection owner may invoke mutation functions.
REVOKE ALL ON FUNCTION public.cms_save_draft(TEXT, JSONB, INTEGER, BIGINT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cms_discard_draft(TEXT, INTEGER, BIGINT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.cms_publish_release(UUID, JSONB) FROM PUBLIC;
DO $acl$
BEGIN
  IF to_regrole('anon') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.cms_publish_release(UUID, JSONB) FROM anon';
  END IF;
  IF to_regrole('authenticated') IS NOT NULL THEN
    EXECUTE 'REVOKE ALL ON FUNCTION public.cms_publish_release(UUID, JSONB) FROM authenticated';
  END IF;
  IF to_regrole('service_role') IS NOT NULL THEN
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.cms_save_draft(TEXT, JSONB, INTEGER, BIGINT) TO service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.cms_discard_draft(TEXT, INTEGER, BIGINT) TO service_role';
    EXECUTE 'GRANT EXECUTE ON FUNCTION public.cms_publish_release(UUID, JSONB) TO service_role';
  END IF;
END $acl$;
