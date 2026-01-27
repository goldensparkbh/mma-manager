import type { Member } from "@shared/schema";

export type WhatsAppTemplate = {
  id: string;
  title: string;
  body: string;
};

export const normalizeWhatsAppTemplates = (
  rawTemplates: unknown,
  legacyTemplate?: string,
) => {
  const templates = Array.isArray(rawTemplates) ? rawTemplates : [];
  const normalized = templates
    .filter((item) => item && typeof item === "object")
    .map((item, index) => {
      const template = item as Partial<WhatsAppTemplate>;
      return {
        id:
          typeof template.id === "string" && template.id
            ? template.id
            : `template-${index + 1}`,
        title:
          typeof template.title === "string" && template.title
            ? template.title
            : `Template ${index + 1}`,
        body: typeof template.body === "string" ? template.body : "",
      };
    });

  if (normalized.length === 0 && legacyTemplate) {
    return [
      {
        id: "legacy-template",
        title: "Default Template",
        body: legacyTemplate,
      },
    ];
  }

  return normalized;
};

export const applyWhatsAppTemplate = (
  template: string,
  member: Member,
  t: (key: string) => string,
) => {
  return template
    .replace(/{name}/g, member.name || "")
    .replace(/{firstName}/g, member.firstName || "")
    .replace(/{lastName}/g, member.lastName || "")
    .replace(/{memberId}/g, member.memberId || "")
    .replace(/{phone}/g, member.phone || "")
    .replace(/{startDate}/g, member.subscriptionStart || "")
    .replace(/{endDate}/g, member.subscriptionEnd || "")
    .replace(/{balance}/g, member.balance ? member.balance.toString() : "0")
    .replace(
      /{status}/g,
      member.status === "active" ? t("common.active") : t("common.expired"),
    );
};
