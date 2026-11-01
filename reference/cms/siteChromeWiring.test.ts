import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (path: string) => readFileSync(resolve(process.cwd(), path), "utf8");

describe("shared site chrome CMS wiring", () => {
  it("server-loads and passes the published site document", () => {
    const layout = source("app/layout.tsx");
    expect(layout).toContain('getPageContent("site", CONTENT_REGISTRY.site)');
    expect(layout).toContain("<Navbar\n                    content={siteContent}");
    expect(layout).toContain("<Footer content={siteContent}");
  });

  it("wires navbar labels, destinations, icons and actions to site paths", () => {
    const navbar = source("components/navbar.tsx");
    for (const fragment of [
      '["navbar", "brand", "prefix"]',
      '["navbar", "brand", "highlight"]',
      '["navbar", "brand", "suffix"]',
      '["navbar", "links", index, "name"]',
      '["navbar", "quoteButton", "label"]',
      '["navbar", "quoteButton", "icon"]',
    ]) {
      expect(navbar).toContain(fragment);
    }
    expect(navbar).toContain("const href = typeof link.href");
  });

  it("renders navigation links as text only and keeps the phone out of the bar", () => {
    const navbar = source("components/navbar.tsx");
    expect(navbar).not.toContain('["navbar", "links", index, "icon"]');
    expect(navbar).not.toContain("tel:");
  });

  it("floats the call button beside WhatsApp, editing the navbar phone", () => {
    const footer = source("components/footer.tsx");
    expect(footer).toContain('["navbar", "phone"]');
    expect(footer).toContain('["navbar", "phoneIcon"]');
    expect(footer).toContain("href={`tel:${");
    const stack = footer.slice(footer.indexOf("fixed bottom-6"));
    expect(stack.indexOf("tel:")).toBeLessThan(stack.indexOf('["footer", "whatsapp", "icon"]'));
  });

  it("renders footer columns, contacts, social, legal and WhatsApp from the site document", () => {
    const footer = source("components/footer.tsx");
    for (const fragment of [
      "footer.columns",
      "footer.socialLinks",
      "footer.legalLinks",
      "footer.copyright",
      "footer.whatsapp",
      '["footer", "columns", columnIndex, "heading"]',
      "FooterSocialLinksEditor",
      "SocialPlatformIcon",
      '["footer", "legalLinks", index, "label"]',
      '["footer", "whatsapp", "icon"]',
    ]) {
      expect(footer).toContain(fragment);
    }
    expect(footer).not.toContain('href="https://facebook.com"');
    expect(footer).not.toContain("tel:${email}");
  });
});
