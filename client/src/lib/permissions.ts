export const PERMISSIONS = {
    // Members
    MEMBERS_VIEW: "members.view",
    MEMBERS_CREATE: "members.modify",
    MEMBERS_UPDATE: "members.modify",
    MEMBERS_DELETE: "members.modify",

    // Attendance
    ATTENDANCE_VIEW: "attendance.view",
    ATTENDANCE_CREATE: "attendance.modify",
    ATTENDANCE_DELETE: "attendance.modify",

    // Belts
    BELTS_VIEW: "belts.view",
    BELTS_CREATE: "belts.modify",
    BELTS_UPDATE: "belts.modify",
    BELTS_DELETE: "belts.modify",

    // Subscriptions & Packages
    SUBSCRIPTIONS_VIEW: "subscriptions.view",
    SUBSCRIPTIONS_CREATE: "subscriptions.modify",
    SUBSCRIPTIONS_UPDATE: "subscriptions.modify",
    SUBSCRIPTIONS_DELETE: "subscriptions.modify",
    PACKAGES_MANAGE: "subscriptions.modify",

    // Store & Products
    STORE_VIEW: "store.view",
    STORE_CREATE: "store.modify",
    STORE_UPDATE: "store.modify",
    STORE_DELETE: "store.modify",

    // Sales
    SALES_VIEW: "sales.view",
    SALES_CREATE: "sales.modify",
    SALES_UPDATE: "sales.modify",
    SALES_DELETE: "sales.modify",

    // Finance (Includes Expenses)
    FINANCE_VIEW: "finance.view",
    FINANCE_CREATE: "finance.modify",
    EXPENSES_CREATE: "finance.modify",
    EXPENSES_UPDATE: "finance.modify",
    EXPENSES_DELETE: "finance.modify",

    // System (Users, Roles)
    USERS_VIEW: "users.view",
    USERS_MANAGE: "users.modify",
    ROLES_MANAGE: "users.modify",

    // Logs
    LOGS_VIEW: "logs.view",

    // Settings
    SETTINGS_VIEW: "settings.view",
    SETTINGS_MODIFY: "settings.modify",
} as const;

export const PERMISSION_GROUPS = [
    {
        label: "permissions.groups.members",
        permissions: [
            { id: PERMISSIONS.MEMBERS_VIEW, label: "permissions.items.view" },
            { id: "members.modify", label: "permissions.items.modify" },
        ]
    },
    {
        label: "permissions.groups.attendance",
        permissions: [
            { id: PERMISSIONS.ATTENDANCE_VIEW, label: "permissions.items.view" },
            { id: "attendance.modify", label: "permissions.items.modify" },
        ]
    },
    {
        label: "permissions.groups.belts",
        permissions: [
            { id: PERMISSIONS.BELTS_VIEW, label: "permissions.items.view" },
            { id: "belts.modify", label: "permissions.items.modify" },
        ]
    },
    {
        label: "permissions.groups.subscriptions",
        permissions: [
            { id: PERMISSIONS.SUBSCRIPTIONS_VIEW, label: "permissions.items.view" },
            { id: "subscriptions.modify", label: "permissions.items.modify" },
        ]
    },
    {
        label: "permissions.groups.store",
        permissions: [
            { id: PERMISSIONS.STORE_VIEW, label: "permissions.items.view" },
            { id: "store.modify", label: "permissions.items.modify" },
        ]
    },
    {
        label: "permissions.groups.sales",
        permissions: [
            { id: PERMISSIONS.SALES_VIEW, label: "permissions.items.view" },
            { id: "sales.modify", label: "permissions.items.modify" },
        ]
    },
    {
        label: "permissions.groups.finance",
        permissions: [
            { id: PERMISSIONS.FINANCE_VIEW, label: "permissions.items.view" },
            { id: "finance.modify", label: "permissions.items.modify" },
        ]
    },
    {
        label: "permissions.groups.users",
        permissions: [
            { id: PERMISSIONS.USERS_VIEW, label: "permissions.items.view" },
            { id: "users.modify", label: "permissions.items.modify" },
        ]
    },
    {
        label: "permissions.groups.settings",
        permissions: [
            { id: "settings.view", label: "permissions.items.view" },
            { id: "settings.modify", label: "permissions.items.modify" },
        ]
    },
    {
        label: "permissions.groups.system",
        permissions: [
            { id: PERMISSIONS.LOGS_VIEW, label: "permissions.items.logsView" },
        ]
    }
];
