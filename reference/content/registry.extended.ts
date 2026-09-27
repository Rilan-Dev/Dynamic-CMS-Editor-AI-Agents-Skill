import type { JsonObject } from "@/components/cms/json";
import { CAREERS_CONTENT } from "./careers";
import { CONTENT_REGISTRY as BASE_CONTENT_REGISTRY } from "./registry";

export const CONTENT_REGISTRY: Record<string, JsonObject> = {
  ...BASE_CONTENT_REGISTRY,
  careers: CAREERS_CONTENT,
};
