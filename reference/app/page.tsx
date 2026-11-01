import type { JsonObject } from "@/components/cms/json";
import { latestUpdatesPayload } from "@/components/updates/updatesModel";
import { CONTENT_REGISTRY } from "@/content/registry";
import { getPageContent } from "@/lib/server/getPageContent";
import HomePage from "@/components/pages/HomePage";

export default async function Page() {
  const [content, servicesContent, updatesContent] = await Promise.all([
    getPageContent("home", CONTENT_REGISTRY.home),
    getPageContent("services", CONTENT_REGISTRY.services),
    getPageContent("updates", CONTENT_REGISTRY.updates),
  ]);
  return (
    <HomePage
      content={content}
      servicesContent={servicesContent}
      updatesContent={latestUpdatesPayload(updatesContent as JsonObject)}
    />
  );
}
