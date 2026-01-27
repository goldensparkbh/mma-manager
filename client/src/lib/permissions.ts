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

    // Belts
    BELTS_VIEW: "belts.view",
    BELTS_UPDATE: "belts.update",

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
        label: "permissions.groups.members",
        permissions: [
            { id: PERMISSIONS.MEMBERS_VIEW, label: "permissions.items.membersView" },
            { id: PERMISSIONS.MEMBERS_CREATE, label: "permissions.items.membersCreate" },
            { id: PERMISSIONS.MEMBERS_UPDATE, label: "permissions.items.membersUpdate" },
            { id: PERMISSIONS.MEMBERS_DELETE, label: "permissions.items.membersDelete" },
        ]
    },
    {
        label: "permissions.groups.attendance",
        permissions: [
            { id: PERMISSIONS.ATTENDANCE_VIEW, label: "permissions.items.attendanceView" },
            { id: PERMISSIONS.ATTENDANCE_CREATE, label: "permissions.items.attendanceCreate" },
            { id: PERMISSIONS.ATTENDANCE_DELETE, label: "permissions.items.attendanceDelete" },
        ]
    },
    {
        label: "permissions.groups.belts",
        permissions: [
            { id: PERMISSIONS.BELTS_VIEW, label: "permissions.items.beltsView" },
            { id: PERMISSIONS.BELTS_UPDATE, label: "permissions.items.beltsUpdate" },
        ]
    },
    {
        label: "permissions.groups.subscriptions",
        permissions: [
            { id: PERMISSIONS.SUBSCRIPTIONS_VIEW, label: "permissions.items.subscriptionsView" },
            { id: PERMISSIONS.SUBSCRIPTIONS_CREATE, label: "permissions.items.subscriptionsCreate" },
            { id: PERMISSIONS.SUBSCRIPTIONS_UPDATE, label: "permissions.items.subscriptionsUpdate" },
            { id: PERMISSIONS.SUBSCRIPTIONS_DELETE, label: "permissions.items.subscriptionsDelete" },
            { id: PERMISSIONS.PACKAGES_MANAGE, label: "permissions.items.packagesManage" },
        ]
    },
    {
        label: "permissions.groups.store",
        permissions: [
            { id: PERMISSIONS.STORE_VIEW, label: "permissions.items.storeView" },
            { id: PERMISSIONS.STORE_CREATE, label: "permissions.items.storeCreate" },
            { id: PERMISSIONS.STORE_UPDATE, label: "permissions.items.storeUpdate" },
            { id: PERMISSIONS.STORE_DELETE, label: "permissions.items.storeDelete" },
        ]
    },
    {
        label: "permissions.groups.sales",
        permissions: [
            { id: PERMISSIONS.SALES_VIEW, label: "permissions.items.salesView" },
            { id: PERMISSIONS.SALES_CREATE, label: "permissions.items.salesCreate" },
            { id: PERMISSIONS.SALES_UPDATE, label: "permissions.items.salesUpdate" },
            { id: PERMISSIONS.SALES_DELETE, label: "permissions.items.salesDelete" },
        ]
    },
    {
        label: "permissions.groups.finance",
        permissions: [
            { id: PERMISSIONS.FINANCE_VIEW, label: "permissions.items.financeView" },
            { id: PERMISSIONS.EXPENSES_CREATE, label: "permissions.items.expensesCreate" },
            { id: PERMISSIONS.EXPENSES_UPDATE, label: "permissions.items.expensesUpdate" },
            { id: PERMISSIONS.EXPENSES_DELETE, label: "permissions.items.expensesDelete" },
        ]
    },
    {
        label: "permissions.groups.system",
        permissions: [
            { id: PERMISSIONS.USERS_VIEW, label: "permissions.items.usersView" },
            { id: PERMISSIONS.USERS_MANAGE, label: "permissions.items.usersManage" },
            { id: PERMISSIONS.ROLES_MANAGE, label: "permissions.items.rolesManage" },
            { id: PERMISSIONS.LOGS_VIEW, label: "permissions.items.logsView" },
        ]
    }
];
