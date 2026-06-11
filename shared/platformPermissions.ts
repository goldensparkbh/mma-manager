export const PLATFORM_PERMISSIONS = {
  ALL: "*",
  TENANTS_VIEW: "platform.tenants.view",
  TENANTS_EDIT: "platform.tenants.edit",
  TENANTS_IMPERSONATE: "platform.tenants.impersonate",
  PLANS_VIEW: "platform.plans.view",
  PLANS_EDIT: "platform.plans.edit",
  PAYMENTS_VIEW: "platform.payments.view",
  SUPPORT_VIEW: "platform.support.view",
  SUPPORT_REPLY: "platform.support.reply",
  ADMINS_VIEW: "platform.admins.view",
  ADMINS_EDIT: "platform.admins.edit",
  PUSH_VIEW: "platform.push.view",
  PUSH_EDIT: "platform.push.edit",
  PUSH_SEND: "platform.push.send",
} as const;

export type PlatformPermission = (typeof PLATFORM_PERMISSIONS)[keyof typeof PLATFORM_PERMISSIONS];

export const PLATFORM_ROLE_PRESETS: Record<string, { name: string; permissions: string[] }> = {
  super_admin: {
    name: "Super Admin",
    permissions: ["*"],
  },
  support: {
    name: "Support",
    permissions: [
      PLATFORM_PERMISSIONS.TENANTS_VIEW,
      PLATFORM_PERMISSIONS.SUPPORT_VIEW,
      PLATFORM_PERMISSIONS.SUPPORT_REPLY,
      PLATFORM_PERMISSIONS.PAYMENTS_VIEW,
    ],
  },
  billing: {
    name: "Billing",
    permissions: [
      PLATFORM_PERMISSIONS.TENANTS_VIEW,
      PLATFORM_PERMISSIONS.PAYMENTS_VIEW,
      PLATFORM_PERMISSIONS.PLANS_VIEW,
    ],
  },
  operations: {
    name: "Operations",
    permissions: [
      PLATFORM_PERMISSIONS.TENANTS_VIEW,
      PLATFORM_PERMISSIONS.TENANTS_EDIT,
      PLATFORM_PERMISSIONS.TENANTS_IMPERSONATE,
      PLATFORM_PERMISSIONS.PLANS_VIEW,
      PLATFORM_PERMISSIONS.PLANS_EDIT,
      PLATFORM_PERMISSIONS.PAYMENTS_VIEW,
    ],
  },
};

export function hasPlatformPermission(userPermissions: string[], permission: string): boolean {
  if (userPermissions.includes("*")) return true;
  return userPermissions.includes(permission);
}
