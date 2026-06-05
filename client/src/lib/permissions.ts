export const PERMISSIONS = {
    // Members
    MEMBERS_VIEW: "members.view",
    MEMBERS_CREATE: "members.add",
    MEMBERS_UPDATE: "members.edit",
    MEMBERS_DELETE: "members.delete",

    // Attendance
    ATTENDANCE_VIEW: "attendance.view",
    ATTENDANCE_CREATE: "attendance.add",
    ATTENDANCE_DELETE: "attendance.delete",

    // Belts
    BELTS_VIEW: "belts.view",
    BELTS_CREATE: "belts.add",
    BELTS_UPDATE: "belts.edit",
    BELTS_DELETE: "belts.delete",

    // Subscriptions & Packages
    SUBSCRIPTIONS_VIEW: "subscriptions.view",
    SUBSCRIPTIONS_CREATE: "subscriptions.add",
    SUBSCRIPTIONS_UPDATE: "subscriptions.edit",
    SUBSCRIPTIONS_DELETE: "subscriptions.delete",
    PACKAGES_MANAGE: "subscriptions.edit",

    // Store & Products
    STORE_VIEW: "store.view",
    STORE_CREATE: "store.add",
    STORE_UPDATE: "store.edit",
    STORE_DELETE: "store.delete",

    // Sales
    SALES_VIEW: "sales.view",
    SALES_CREATE: "sales.add",
    SALES_UPDATE: "sales.edit",
    SALES_DELETE: "sales.delete",

    // Finance (Includes Expenses)
    FINANCE_VIEW: "finance.view",
    FINANCE_CREATE: "finance.add",
    FINANCE_EDIT: "finance.edit", // For expenses/finance records
    EXPENSES_CREATE: "finance.add",
    EXPENSES_UPDATE: "finance.edit",
    EXPENSES_DELETE: "finance.delete",
    FINANCE_DELETE: "finance.delete",

    // System (Users, Roles)
    USERS_VIEW: "users.view",
    USERS_CREATE: "users.add",
    USERS_EDIT: "users.edit",
    USERS_DELETE: "users.delete",
    USERS_MANAGE: "users.edit",
    ROLES_MANAGE: "users.edit",

    // Logs
    LOGS_VIEW: "logs.view",

    // Settings
    SETTINGS_VIEW: "settings.view",
    SETTINGS_MODIFY: "settings.edit",
} as const;

export const PERMISSION_GROUPS = [
    {
        label: "permissions.groups.members",
        permissions: [
            { id: PERMISSIONS.MEMBERS_VIEW, label: "permissions.items.view" },
            { id: PERMISSIONS.MEMBERS_CREATE, label: "permissions.items.add" },
            { id: PERMISSIONS.MEMBERS_UPDATE, label: "permissions.items.edit" },
            { id: PERMISSIONS.MEMBERS_DELETE, label: "permissions.items.delete" },
        ]
    },
    {
        label: "permissions.groups.attendance",
        permissions: [
            { id: PERMISSIONS.ATTENDANCE_VIEW, label: "permissions.items.view" },
            { id: PERMISSIONS.ATTENDANCE_CREATE, label: "permissions.items.add" },
            { id: PERMISSIONS.ATTENDANCE_DELETE, label: "permissions.items.delete" },
        ]
    },
    {
        label: "permissions.groups.belts",
        permissions: [
            { id: PERMISSIONS.BELTS_VIEW, label: "permissions.items.view" },
            { id: PERMISSIONS.BELTS_CREATE, label: "permissions.items.add" },
            { id: PERMISSIONS.BELTS_UPDATE, label: "permissions.items.edit" },
            { id: PERMISSIONS.BELTS_DELETE, label: "permissions.items.delete" },
        ]
    },
    {
        label: "permissions.groups.subscriptions",
        permissions: [
            { id: PERMISSIONS.SUBSCRIPTIONS_VIEW, label: "permissions.items.view" },
            { id: PERMISSIONS.SUBSCRIPTIONS_CREATE, label: "permissions.items.add" },
            { id: PERMISSIONS.SUBSCRIPTIONS_UPDATE, label: "permissions.items.edit" },
            { id: PERMISSIONS.SUBSCRIPTIONS_DELETE, label: "permissions.items.delete" },
        ]
    },
    {
        label: "permissions.groups.store",
        permissions: [
            { id: PERMISSIONS.STORE_VIEW, label: "permissions.items.view" },
            { id: PERMISSIONS.STORE_CREATE, label: "permissions.items.add" },
            { id: PERMISSIONS.STORE_UPDATE, label: "permissions.items.edit" },
            { id: PERMISSIONS.STORE_DELETE, label: "permissions.items.delete" },
        ]
    },
    {
        label: "permissions.groups.sales",
        permissions: [
            { id: PERMISSIONS.SALES_VIEW, label: "permissions.items.view" },
            { id: PERMISSIONS.SALES_CREATE, label: "permissions.items.add" },
            { id: PERMISSIONS.SALES_UPDATE, label: "permissions.items.edit" },
            { id: PERMISSIONS.SALES_DELETE, label: "permissions.items.delete" },
        ]
    },
    {
        label: "permissions.groups.finance",
        permissions: [
            { id: PERMISSIONS.FINANCE_VIEW, label: "permissions.items.view" },
            { id: PERMISSIONS.FINANCE_CREATE, label: "permissions.items.add" },
            { id: PERMISSIONS.FINANCE_EDIT, label: "permissions.items.edit" },
            { id: PERMISSIONS.FINANCE_DELETE, label: "permissions.items.delete" },
        ]
    },
    {
        label: "permissions.groups.users",
        permissions: [
            { id: PERMISSIONS.USERS_VIEW, label: "permissions.items.view" },
            { id: PERMISSIONS.USERS_CREATE, label: "permissions.items.add" },
            { id: PERMISSIONS.USERS_EDIT, label: "permissions.items.edit" },
            { id: PERMISSIONS.USERS_DELETE, label: "permissions.items.delete" },
        ]
    },
    {
        label: "permissions.groups.settings",
        permissions: [
            { id: "settings.view", label: "permissions.items.view" },
            { id: "settings.edit", label: "permissions.items.edit" },
        ]
    },
    {
        label: "permissions.groups.system",
        permissions: [
            { id: PERMISSIONS.LOGS_VIEW, label: "permissions.items.logsView" },
        ]
    }
];
