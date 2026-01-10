export const PERMISSIONS = {
    // Members
    MEMBERS_VIEW: "members.view",
    MEMBERS_CREATE: "members.create",
    MEMBERS_UPDATE: "members.update",
    MEMBERS_DELETE: "members.delete",

    // Attendance
    ATTENDANCE_VIEW: "attendance.view",
    ATTENDANCE_CREATE: "attendance.create",
    ATTENDANCE_DELETE: "attendance.delete",

    // Subscriptions & Packages
    SUBSCRIPTIONS_VIEW: "subscriptions.view",
    SUBSCRIPTIONS_CREATE: "subscriptions.create",
    SUBSCRIPTIONS_UPDATE: "subscriptions.update",
    SUBSCRIPTIONS_DELETE: "subscriptions.delete",
    PACKAGES_MANAGE: "packages.manage", // Create/Delete packages

    // Store & Products
    STORE_VIEW: "store.view",
    STORE_CREATE: "store.create",
    STORE_UPDATE: "store.update",
    STORE_DELETE: "store.delete",

    // Sales
    SALES_VIEW: "sales.view",
    SALES_CREATE: "sales.create",
    SALES_UPDATE: "sales.update", // e.g. cancel
    SALES_DELETE: "sales.delete",

    // Finance
    FINANCE_VIEW: "finance.view",
    EXPENSES_CREATE: "expenses.create",
    EXPENSES_UPDATE: "expenses.update",
    EXPENSES_DELETE: "expenses.delete",

    // System
    USERS_VIEW: "users.view",
    USERS_MANAGE: "users.manage", // Create/Delete/Role assign
    ROLES_MANAGE: "roles.manage",
    LOGS_VIEW: "logs.view",
} as const;

export const PERMISSION_GROUPS = [
    {
        label: "الأعضاء",
        permissions: [
            { id: PERMISSIONS.MEMBERS_VIEW, label: "عرض الأعضاء" },
            { id: PERMISSIONS.MEMBERS_CREATE, label: "إضافة أعضاء" },
            { id: PERMISSIONS.MEMBERS_UPDATE, label: "تعديل بيانات الأعضاء" },
            { id: PERMISSIONS.MEMBERS_DELETE, label: "حذف الأعضاء" },
        ]
    },
    {
        label: "الحضور",
        permissions: [
            { id: PERMISSIONS.ATTENDANCE_VIEW, label: "عرض سجل الحضور" },
            { id: PERMISSIONS.ATTENDANCE_CREATE, label: "تسجيل حضور" },
            { id: PERMISSIONS.ATTENDANCE_DELETE, label: "حذف سجل حضور" },
        ]
    },
    {
        label: "الاشتراكات",
        permissions: [
            { id: PERMISSIONS.SUBSCRIPTIONS_VIEW, label: "عرض الاشتراكات" },
            { id: PERMISSIONS.SUBSCRIPTIONS_CREATE, label: "إضافة اشتراك" },
            { id: PERMISSIONS.SUBSCRIPTIONS_UPDATE, label: "تعديل اشتراك" },
            { id: PERMISSIONS.SUBSCRIPTIONS_DELETE, label: "حذف اشتراك" },
            { id: PERMISSIONS.PACKAGES_MANAGE, label: "إدارة الباقات" },
        ]
    },
    {
        label: "المتجر والمنتجات",
        permissions: [
            { id: PERMISSIONS.STORE_VIEW, label: "عرض المنتجات" },
            { id: PERMISSIONS.STORE_CREATE, label: "إضافة منتج" },
            { id: PERMISSIONS.STORE_UPDATE, label: "تعديل منتج" },
            { id: PERMISSIONS.STORE_DELETE, label: "حذف منتج" },
        ]
    },
    {
        label: "المبيعات",
        permissions: [
            { id: PERMISSIONS.SALES_VIEW, label: "عرض المبيعات" },
            { id: PERMISSIONS.SALES_CREATE, label: "تسجيل بيع" },
            { id: PERMISSIONS.SALES_UPDATE, label: "إلغاء/تعديل بيع" },
            { id: PERMISSIONS.SALES_DELETE, label: "حذف سجل بيع" },
        ]
    },
    {
        label: "المالية",
        permissions: [
            { id: PERMISSIONS.FINANCE_VIEW, label: "عرض لوحة المالية" },
            { id: PERMISSIONS.EXPENSES_CREATE, label: "تسجيل مصروفات" },
            { id: PERMISSIONS.EXPENSES_UPDATE, label: "تعديل مصروفات" },
            { id: PERMISSIONS.EXPENSES_DELETE, label: "حذف مصروفات" },
        ]
    },
    {
        label: "إدارة النظام",
        permissions: [
            { id: PERMISSIONS.USERS_VIEW, label: "عرض المستخدمين" },
            { id: PERMISSIONS.USERS_MANAGE, label: "إدارة المستخدمين" },
            { id: PERMISSIONS.ROLES_MANAGE, label: "إدارة الأدوار" },
            { id: PERMISSIONS.LOGS_VIEW, label: "عرض السجلات" },
        ]
    }
];
