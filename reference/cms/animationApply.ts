import type { AnimationTarget } from "@/components/animations/targetRegistry";
import type { AnimationTargetType } from "@/components/animations/types";
import type { JsonObject, JsonValue } from "./json";

const clone = <T extends JsonValue>(value: T): T =>
  JSON.parse(JSON.stringify(value)) as T;

export function applyAnimationToKeys(
  record: JsonObject,
  keys: string[],
  config: JsonObject,
): JsonObject {
  const next: JsonObject = { ...record };
  keys.forEach((key) => {
    next[key] = clone(config);
  });
  return next;
}

export function applyAnimationToSimilarTargets(
  record: JsonObject,
  targets: AnimationTarget[],
  type: AnimationTargetType,
  config: JsonObject,
): JsonObject {
  const keys = targets.filter((target) => target.type === type).map((target) => target.id);
  return applyAnimationToKeys(record, keys, config);
}

export function resetAnimationAtKey(record: JsonObject, key: string): JsonObject {
  return { ...record, [key]: { mode: "inherit" } };
}

export function copyAnimationConfig(config: JsonObject): JsonObject {
  return clone(config);
}
