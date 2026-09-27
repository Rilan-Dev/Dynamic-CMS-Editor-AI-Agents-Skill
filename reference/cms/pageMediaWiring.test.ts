import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { CONTENT_REGISTRY } from "@/content/registry";

const source = (path: string) =>
  readFileSync(resolve(process.cwd(), path), "utf8");

describe("CMS media and icon page wiring", () => {
  it("keeps string-backed service and client media as strings", () => {
    const services = source("components/pages/ServicesPage.tsx");
    const clients = source("components/client-logos.tsx");

    expect(services).toMatch(
      /path=\{\["services", originalIndex, "image"\]\}[\s\S]{0,300}storedAs="string"/,
    );
    expect(services).toContain("assetSrc(service.image)");
    expect(clients).toMatch(
      /path=\{\["clients", index, "logo"\]\}[\s\S]{0,300}storedAs="string"/,
    );
    expect(clients).toContain("assetSrc(client.logo)");
  });

  it("uses editable media for every active CMS-backed image", () => {
    const home = source("components/pages/HomePage.tsx");
    const clients = source("components/client-logos.tsx");

    expect(home).not.toContain('from "next/image"');
    expect(home).toContain('path={["aboutPreview", "image"]}');
    expect(clients).not.toContain('from "next/image"');
  });

  it("routes content-owned icons through EditableIcon", () => {
    const directExpectations: Array<[string, string]> = [
      ["components/pages/ServicesPage.tsx", '["services", originalIndex, "icon"]'],
      ["components/pages/HomePage.tsx", '["featuredServices", index, "icon"]'],
      ["components/pages/HomePage.tsx", '["whyChoose", "cards", index, "icon"]'],
      ["components/pages/CertificationsPage.tsx", '["benefits", index, "icon"]'],
      ["components/pages/ContactPage.tsx", '["infoCards", index, "icon"]'],
      ["components/pages/ContactPage.tsx", '["businessHours", "addressIcon"]'],
    ];

    for (const [file, path] of directExpectations) {
      const contents = source(file);
      expect(contents).toContain("<EditableIcon");
      expect(contents).toContain(`path={${path}}`);
    }

    const about = source("components/pages/AboutPage.tsx");
    expect(about).toContain('iconKey: "visionIcon"');
    expect(about).toContain('iconKey: "missionIcon"');
    expect(about).toContain('path={["visionMission", item.iconKey]}');

    const certifications = source("components/pages/CertificationsPage.tsx");
    expect(certifications).toContain('renderCertificateGrid("registrations"');
    expect(certifications).toContain('renderCertificateGrid("isoCertifications"');
    expect(certifications).toContain('path={[path, index, "icon"]}');
  });

  it("provides fallback icon fields for every picker-backed section", () => {
    const registry = CONTENT_REGISTRY as any;

    expect(
      registry.home.whyChoose.cards.every((card: any) => "icon" in card),
    ).toBe(true);
    expect(registry.about.visionMission.visionIcon).toBe("Target");
    expect(registry.about.visionMission.missionIcon).toBe("Briefcase");
    expect(registry.contact.businessHours.addressIcon).toBe("Building");
    expect(
      registry.certifications.registrations.every(
        (item: any) => item.icon === "Award",
      ),
    ).toBe(true);
    expect(
      registry.certifications.isoCertifications.every(
        (item: any) => item.icon === "Award",
      ),
    ).toBe(true);
    expect(
      registry.certifications.benefits.every(
        (item: any) => item.icon === "CheckCircle",
      ),
    ).toBe(true);
  });

  it("enables uploaded image icons in the advanced field editor", () => {
    const editor = source("components/cms/DynamicFieldEditor.tsx");
    expect(editor.match(/allowUpload/g)).toHaveLength(2);
  });

  it("reports icon upload failures and permits retrying the same file", () => {
    const selector = source("components/cms/IconSelector.tsx");
    expect(selector).toContain('toast.error("Icon upload failed"');
    expect(selector).toContain('e.target.value = ""');
  });
});
