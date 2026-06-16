import { translations } from "@/lib/i18n/translations";

type StoreLanguage = "ar" | "en";

/** Label for a store product category without triggering missing-key warnings. */
export function getStoreCategoryLabel(
  t: (key: string) => string,
  category: string,
  language: StoreLanguage,
): string {
  if (category === "all") return t("common.all");
  const candidates = [category, category.toLowerCase()];
  const storeCategories = (translations[language] as { store?: { categories?: Record<string, string> } })
    ?.store?.categories;
  for (const c of candidates) {
    if (storeCategories?.[c]) return storeCategories[c];
  }
  const key = `store.categories.${category}`;
  const label = t(key);
  return label === key ? category : label;
}
