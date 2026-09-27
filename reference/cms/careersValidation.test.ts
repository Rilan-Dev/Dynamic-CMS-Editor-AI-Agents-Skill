import { describe, expect, it } from "vitest";
import { validateCmsDocuments } from "./documentValidation";

describe("Careers publish validation", () => {
  it("rejects malformed email and incomplete visible open jobs", () => {
    const errors = validateCmsDocuments(
      {
        applicationEmail: "bad-address",
        jobsIntro: { title: "Open Positions" },
        jobs: [
          {
            id: "job-1",
            title: "",
            department: "",
            location: "",
            postedDate: "23/07/2026",
            closingDate: "2026-01-01",
            status: "open",
            visible: true,
          },
        ],
      },
      null,
    );

    expect(errors.map((error) => error.code)).toEqual(
      expect.arrayContaining([
        "invalid-career-email",
        "missing-job-title",
        "missing-job-department",
        "missing-job-location",
        "invalid-job-posted-date",
      ]),
    );
  });

  it("allows incomplete hidden or closed Careers records", () => {
    const errors = validateCmsDocuments(
      {
        applicationEmail: "careers@smtscontracting.com",
        jobsIntro: { title: "Open Positions" },
        jobs: [
          {
            id: "hidden",
            title: "",
            postedDate: "not-a-date",
            closingDate: "also-invalid",
            status: "open",
            visible: false,
          },
          {
            id: "closed",
            title: "",
            postedDate: "not-a-date",
            closingDate: "also-invalid",
            status: "closed",
            visible: true,
          },
        ],
      },
      null,
    );

    expect(
      errors.filter(
        (error) =>
          error.code.startsWith("missing-job") ||
          error.code.startsWith("invalid-job-") ||
          error.code === "job-closing-before-posted",
      ),
    ).toEqual([]);
  });

  it("rejects invalid job status", () => {
    const errors = validateCmsDocuments(
      {
        applicationEmail: "careers@smtscontracting.com",
        jobsIntro: { title: "Open Positions" },
        jobs: [{ id: "job-1", status: "draft", visible: true }],
      },
      null,
    );

    expect(errors.map((error) => error.code)).toContain("invalid-job-status");
  });

  it("rejects closing dates before the posted date for visible open jobs", () => {
    const errors = validateCmsDocuments(
      {
        applicationEmail: "careers@smtscontracting.com",
        jobsIntro: { title: "Open Positions" },
        jobs: [
          {
            id: "job-1",
            title: "Site Engineer",
            department: "Civil",
            location: "Dubai, UAE",
            postedDate: "2026-07-23",
            closingDate: "2026-07-01",
            status: "open",
            visible: true,
          },
        ],
      },
      null,
    );

    expect(errors.map((error) => error.code)).toContain(
      "job-closing-before-posted",
    );
  });

  it("rejects unsafe Careers button targets", () => {
    const errors = validateCmsDocuments(
      {
        applicationEmail: "careers@smtscontracting.com",
        jobsIntro: { title: "Open Positions" },
        hero: { primaryButtonHref: "javascript:alert(1)" },
        finalCta: { buttonHref: "data:text/html,bad" },
        jobs: [],
      },
      null,
    );

    expect(errors.filter((error) => error.code === "unsafe-url")).toHaveLength(
      2,
    );
  });
});
