// Single source of truth for Hot / Warm / Cold classification.
// Always derived from the numeric score — never trust a freeform
// category string from the AI, since that can drift from these bands.

export type PriorityCategory = "hot" | "warm" | "cold" | "unscored";

export function getPriorityCategory(
  score: number | null | undefined
): PriorityCategory {
  if (score === null || score === undefined) return "unscored";
  if (score >= 80) return "hot";
  if (score >= 50) return "warm";
  return "cold";
}

export function getPriorityMeta(score: number | null | undefined) {
  const category = getPriorityCategory(score);
  switch (category) {
    case "hot":
      return { category, label: "HOT", icon: "🔥", colorKey: "amber" as const };
    case "warm":
      return { category, label: "WARM", icon: "🟡", colorKey: "lime" as const };
    case "cold":
      return { category, label: "COLD", icon: "🔵", colorKey: "teal" as const };
    default:
      return { category, label: "UNSCORED", icon: "⚪", colorKey: "gray" as const };
  }
}