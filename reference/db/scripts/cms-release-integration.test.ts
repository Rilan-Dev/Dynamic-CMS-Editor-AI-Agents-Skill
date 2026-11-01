import { beforeAll, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { getPool } from "@/lib/server/db";
import { saveDraft, getEntry } from "@/lib/server/contentStore";
import { publishCmsRelease, CmsVersionConflictError } from "@/lib/server/cmsRelease";
import { listCmsVersions, getCmsVersion } from "@/lib/server/cmsHistory";
import { restoreCmsRevision, CmsRestoreConflictError, CmsRestoreNotFoundError } from "@/lib/server/cmsRestore";

const run = process.env.DATABASE_URL ? describe : describe.skip;
const seed = "cms-phase1-" + randomUUID().slice(0, 8);
const a = seed + "-a";
const b = seed + "-b";
const c = seed + "-c";
const one = { hero: { title: "First publication" } };
const two = { hero: { title: "Second publication" } };
const input = (slug: string, expectedVersion: number, expectedDraftRevision: number, document: Record<string, any>) => ({
  slug, expectedVersion, expectedDraftRevision, document,
});

run("CMS transactional release integration (isolated database only)", () => {
  beforeAll(async () => {
    if (process.env.DATABASE_SCHEMA === "smts_prod")
      throw new Error("Refusing to run integration tests on production");
    expect(await getPool()).toBeTruthy();
  });

  it("commits grouped snapshots and prevents duplicate releases on retries", async () => {
    const requestId = randomUUID();
    const documents = [input(a, 0, 0, one), input(b, 0, 0, one)];
    const first = await publishCmsRelease({ requestId, documents });
    expect(first.documents.map((d) => d.version)).toEqual([1, 1]);
    expect(first.releaseId).toBeTruthy();
    const again = await publishCmsRelease({ requestId, documents });
    expect(again.releaseId).toBe(first.releaseId);
    const pool = await getPool();
    const rows = await pool.query("SELECT slug, version, snapshot FROM cms_revisions WHERE slug IN ($1,$2)",[a,b]);
    expect(rows.rows).toHaveLength(2);
    expect(rows.rows.every((row: {version:number}) => row.version === 1)).toBe(true);
  });

  it("rolls back every document if one precondition is stale", async () => {
    const changed = [input(c,0,0,one), input(a,99,1,two)];
    await expect(publishCmsRelease({ requestId: randomUUID(), documents: changed }))
      .rejects.toBeInstanceOf(CmsVersionConflictError);
    const pool = await getPool();
    const result = await pool.query("SELECT slug FROM page_contents WHERE slug=$1",[c]);
    expect(result.rows).toHaveLength(0);
  });

  it("accepts only one concurrent publisher per expected version", async () => {
    const changes = [two,{hero:{title:"Competing publication"}}];
    const results = await Promise.allSettled(changes.map((document) => publishCmsRelease({
      requestId:randomUUID(), documents:[input(a,1,1,document)],
    })));
    expect(results.filter((r) => r.status==="fulfilled")).toHaveLength(1);
    expect(results.filter((r) => r.status==="rejected")).toHaveLength(1);
    expect((await getEntry(a))?.version).toBe(2);
  });

  it("guards draft writes with a separate monotonically increasing CAS revision", async () => {
    const entry = await getEntry(b);
    expect(entry?.draftRevision).toBe(1);
    const saved = await saveDraft(b,{title:"Draft only"},1,1);
    expect(saved.draftRevision).toBe(2);
    expect((await getEntry(b))?.version).toBe(1);
    await expect(saveDraft(b,{title:"Stale"},1,1))
      .rejects.toBeInstanceOf(CmsVersionConflictError);
  });

  it("prevents modifying immutable revision snapshots", async () => {
    const pool = await getPool();
    await expect(pool.query("UPDATE cms_revisions SET snapshot='{}'::jsonb WHERE slug=$1",[a]))
      .rejects.toThrow(/immutable/i);
  });
  it("lists stored published versions and retrieves the original immutable content", async () => {
    const timeline = await listCmsVersions(a);
    expect(timeline.items.map((item) => item.version)).toEqual([2,1]);
    expect(timeline.items[0].isCurrent).toBe(true);
    expect(timeline.items[1].isCurrent).toBe(false);
    const first = await getCmsVersion(a,1);
    expect(first?.snapshot).toEqual(one);
    const current = await getCmsVersion(a,2);
    expect(current?.revision.isCurrent).toBe(true);
    await expect(getCmsVersion(a,99)).resolves.toBeNull();
  });

  it("restores an archived version into draft without modifying live content", async()=>{
    const slug=seed+"-rollback-draft";
    await publishCmsRelease({requestId:randomUUID(),documents:[input(slug,0,0,one)]});
    await publishCmsRelease({requestId:randomUUID(),documents:[input(slug,1,1,two)]});
    const before=await getEntry(slug);
    expect(before?.version).toBe(2);
    const restored=await restoreCmsRevision({
      slug,sourceVersion:1,expectedVersion:2,expectedDraftRevision:2,
      mode:"draft",requestId:randomUUID(),
    });
    expect(restored.snapshot).toEqual(one);
    expect(restored.version).toBe(2);
    expect(restored.draftRevision).toBe(3);
    expect((await getEntry(slug))?.published).toEqual(two);
    expect((await getEntry(slug))?.draft).toEqual(one);
    expect((await listCmsVersions(slug)).items.map(v=>v.version)).toEqual([2,1]);
    await expect(restoreCmsRevision({
      slug,sourceVersion:1,expectedVersion:2,expectedDraftRevision:2,
      mode:"draft",requestId:randomUUID(),
    })).rejects.toBeInstanceOf(CmsRestoreConflictError);
  });

  it("rolls back to a new immutable publication and reverses that rollback",async()=>{
    const slug=seed+"-rollback-publish";
    const original={hero:{title:"Historical original"}};
    const newer={hero:{title:"Newer design"}};
    await publishCmsRelease({requestId:randomUUID(),documents:[input(slug,0,0,original)]});
    await publishCmsRelease({requestId:randomUUID(),documents:[input(slug,1,1,newer)]});
    const requestId=randomUUID();
    const opts={slug,sourceVersion:1,expectedVersion:2,expectedDraftRevision:2,
      mode:"publish" as const,requestId};
    const undone=await restoreCmsRevision(opts);
    expect(undone.version).toBe(3);
    expect(undone.restoredFromVersion).toBe(1);
    expect(undone.releaseId).toBeTruthy();
    expect((await getEntry(slug))?.published).toEqual(original);
    expect((await getCmsVersion(slug,3))?.snapshot).toEqual(original);
    expect((await listCmsVersions(slug)).items[0]).toMatchObject({
      version:3,action:"rollback",restoredFromVersion:1,isCurrent:true,
    });
    expect((await getCmsVersion(slug,2))?.snapshot).toEqual(newer);

    const replay=await restoreCmsRevision(opts);
    expect(replay.releaseId).toBe(undone.releaseId);
    expect(replay.version).toBe(3);
    expect((await listCmsVersions(slug)).items).toHaveLength(3);

    await expect(restoreCmsRevision({...opts,sourceVersion:2}))
      .rejects.toThrow("CMS_REQUEST_ID_REUSED");
    const reversed=await restoreCmsRevision({
      slug,sourceVersion:2,expectedVersion:3,expectedDraftRevision:3,
      mode:"publish",requestId:randomUUID(),
    });
    expect(reversed.version).toBe(4);
    expect((await getEntry(slug))?.published).toEqual(newer);
    expect((await listCmsVersions(slug)).items[0]).toMatchObject({version:4,action:"rollback",restoredFromVersion:2});
    expect((await getCmsVersion(slug,3))?.snapshot).toEqual(original);
  });

  it("rejects missing historical versions with no changes",async()=>{
    const slug=seed+"-rollback-missing";
    await publishCmsRelease({requestId:randomUUID(),documents:[input(slug,0,0,one)]});
    await expect(restoreCmsRevision({slug,sourceVersion:999,expectedVersion:1,
      expectedDraftRevision:1,mode:"publish",requestId:randomUUID()}))
      .rejects.toBeInstanceOf(CmsRestoreNotFoundError);
    expect((await getEntry(slug))?.version).toBe(1);
  });

  it("rejects stale restore-and-publish without changing content or history",async()=>{
    const slug=seed+"-rollback-conflict";
    await publishCmsRelease({requestId:randomUUID(),documents:[input(slug,0,0,one)]});
    await publishCmsRelease({requestId:randomUUID(),documents:[input(slug,1,1,two)]});
    await expect(restoreCmsRevision({
      slug,sourceVersion:1,expectedVersion:1,expectedDraftRevision:1,
      mode:"publish",requestId:randomUUID(),
    })).rejects.toBeInstanceOf(CmsRestoreConflictError);
    expect((await getEntry(slug))?.published).toEqual(two);
    expect((await listCmsVersions(slug)).items).toHaveLength(2);
  });

  it("does not bump the live version on an identical rollback and replays exactly",async()=>{
    const slug=seed+"-rollback-noop";
    await publishCmsRelease({requestId:randomUUID(),documents:[input(slug,0,0,one)]});
    const requestId=randomUUID();
    const req={slug,sourceVersion:1,expectedVersion:1,expectedDraftRevision:1,
      mode:"publish" as const,requestId};
    const first=await restoreCmsRevision(req);
    expect(first.changed).toBe(false);
    expect(first.version).toBe(1);
    expect(first.snapshot).toEqual(one);
    expect((await listCmsVersions(slug)).items).toHaveLength(1);
    expect(await restoreCmsRevision(req)).toEqual(first);
    expect((await getEntry(slug))?.version).toBe(1);
  });

});
