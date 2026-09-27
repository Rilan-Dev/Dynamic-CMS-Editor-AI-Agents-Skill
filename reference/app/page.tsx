import { CONTENT_REGISTRY } from "@/content/registry";
import { getPageContent } from "@/lib/server/getPageContent";
import HomePage from "@/components/pages/HomePage";

export default async function Page() {
  const content = await getPageContent("home", CONTENT_REGISTRY.home);
  return <HomePage content={content} />;
}
