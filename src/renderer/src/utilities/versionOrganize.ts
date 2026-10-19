const TAGS_KEY = "relaxing:versionTags";
const ORDER_KEY = "relaxing:versionOrder";

export function loadVersionTags(): Record<string, string[]> {
  try {
    const parsed = JSON.parse(localStorage.getItem(TAGS_KEY) || "{}");
    return parsed && typeof parsed === "object" ? parsed : {};
  } catch {
    return {};
  }
}

export function loadManualOrder(): string[] {
  try {
    const parsed = JSON.parse(localStorage.getItem(ORDER_KEY) || "[]");
    return Array.isArray(parsed)
      ? parsed.filter((x) => typeof x === "string")
      : [];
  } catch {
    return [];
  }
}
