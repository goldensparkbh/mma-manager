import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { Search, UserCog, Shield, ShieldAlert, Plus, Trash2, Pencil, Mail } from "lucide-react";
import { apiRequest, queryClient } from "@/lib/queryClient";
import type { User } from "@shared/schema";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import type { Role } from "@shared/schema";
import { PERMISSION_GROUPS, PERMISSIONS } from "@/lib/permissions";

export default function Users() {
    const { role: currentUserRole, hasPermission, clubSettings } = useAuth();
    const { t, dir } = useLanguage();
    const { toast } = useToast();
    const [searchQuery, setSearchQuery] = useState("");
    const [roleForm, setRoleForm] = useState<{ name: string; permissions: string[] }>({ name: "", permissions: [] });
    const [isRoleDialogOpen, setIsRoleDialogOpen] = useState(false);
    const [editingRole, setEditingRole] = useState<Role | null>(null);

    const { data: users, isLoading: loadingUsers, error: usersError } = useQuery<User[]>({
        queryKey: ["/api/users"],
    });

    const { data: roles = [], isLoading: loadingRoles } = useQuery<Role[]>({
        queryKey: ["/api/roles"],
    });

    const updateRoleMutation = useMutation({
        mutationFn: async ({ id, role }: { id: string; role: string }) => {
            const response = await apiRequest("PATCH", `/api/users/${id}/role`, { role });
            return response.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/users"] });
            toast({ title: t("common.success"), description: t("users.permissionsUpdated") });
        },
        onError: () => {
            toast({ variant: "destructive", title: t("common.error"), description: t("users.permissionsUpdateError") });
        },
    });

    const mutationCreateRole = useMutation({
        mutationFn: async (data: { name: string; permissions: string[] }) => {
            const res = await apiRequest("POST", "/api/roles", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
            setIsRoleDialogOpen(false);
            setRoleForm({ name: "", permissions: [] });
            toast({ title: t("common.success"), description: t("users.roleCreateSuccess") });
        }
    });

    const mutationUpdateRole = useMutation({
        mutationFn: async ({ id, data }: { id: string, data: { name: string; permissions: string[] } }) => {
            await apiRequest("PATCH", `/api/roles/${id}`, data);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
            setIsRoleDialogOpen(false);
            setEditingRole(null);
            setRoleForm({ name: "", permissions: [] });
            toast({ title: t("common.success"), description: t("users.roleUpdateSuccess") });
        }
    });

    const mutationDeleteRole = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/roles/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/roles"] });
            toast({ title: t("common.success"), description: t("users.roleDeleteSuccess") });
        }
    });

    const mutationDeleteUser = useMutation({
        mutationFn: async (id: string) => {
            await apiRequest("DELETE", `/api/users/${id}`);
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/users"] });
            toast({ title: t("common.success"), description: t("users.userDeleteSuccess") });
        },
        onError: () => {
            toast({ variant: "destructive", title: t("common.error"), description: t("users.userDeleteError") });
        }
    });

    if (!hasPermission(PERMISSIONS.USERS_VIEW)) {
        return (
            <div className="flex h-[80vh] items-center justify-center">
                <div className="text-center space-y-4">
                    <ShieldAlert className="w-16 h-16 text-destructive mx-auto" />
                    <h2 className="text-2xl font-bold">{t('users.accessDenied')}</h2>
                    <p className="text-muted-foreground">{t('users.accessDeniedMsg')}</p>
                </div>
            </div>
        )
    }

    const filteredUsers = users?.filter(
        (user) =>
            user.email?.includes(searchQuery) ||
            user.displayName?.includes(searchQuery)
    );

    const openCreateRole = () => {
        setEditingRole(null);
        setRoleForm({ name: "", permissions: [] });
        setIsRoleDialogOpen(true);
    };

    const openEditRole = (role: Role) => {
        setEditingRole(role);
        setRoleForm({ name: role.name, permissions: role.permissions || [] });
        setIsRoleDialogOpen(true);
    };

    const handleRoleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!roleForm.name.trim()) return;
        const normalized = roleForm.name.trim().toLowerCase();
        const duplicate = roles.some((role) => {
            if (editingRole && role.id === editingRole.id) return false;
            return role.name.trim().toLowerCase() === normalized;
        });
        if (duplicate) {
            toast({ variant: "destructive", title: t('common.error'), description: t("users.roleNameExists") });
            return;
        }

        if (editingRole) {
            mutationUpdateRole.mutate({ id: editingRole.id, data: roleForm });
        } else {
            mutationCreateRole.mutate(roleForm);
        }
    };

    const togglePermission = (permId: string) => {
        setRoleForm(prev => {
            const exists = prev.permissions.includes(permId);
            return {
                ...prev,
                permissions: exists
                    ? prev.permissions.filter(p => p !== permId)
                    : [...prev.permissions, permId]
            };
        });
    };

    // ... (render)
    // Note: I will only replace up to the render return start or just the component functions.
    // Actually, I'll replace the DialogContent in the next step or here if I can target it.
    // The replace block covers imports to handlers, so I need to check render.


    const [isUserDialogOpen, setIsUserDialogOpen] = useState(false);
    const [userForm, setUserForm] = useState({ email: "", password: "", name: "", role: "staff" });

    const mutationCreateUser = useMutation({
        mutationFn: async (data: typeof userForm) => {
            const res = await apiRequest("POST", "/api/users/invite", data);
            return res.json();
        },
        onSuccess: () => {
            queryClient.invalidateQueries({ queryKey: ["/api/users"] });
            setIsUserDialogOpen(false);
            setUserForm({ email: "", password: "", name: "", role: "staff" });
            toast({ title: t("common.success"), description: t("users.userCreateSuccess") });
        },
        onError: (err: Error) => {
            toast({ variant: "destructive", title: t("common.error"), description: err.message });
        }
    });

    const handleUserSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        mutationCreateUser.mutate(userForm);
    };

    // Helper to open email client - keeping for legacy invites or contacting users
    const sendInviteEmail = (email: string, name: string) => {
        const subject = encodeURIComponent(t("users.inviteEmailSubject"));
        const body = encodeURIComponent(
            t("users.inviteEmailBody")
                .replace("{name}", name)
                .replace("{email}", email)
                .replace("{link}", window.location.origin)
        );
        window.open(`mailto:${email}?subject=${subject}&body=${body}`);
    };


    return (
        <div className="space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold">{t('users.title')}</h1>
                    <p className="text-sm text-muted-foreground">{t('users.subtitle')}</p>
                </div>
            </div>

            <Tabs defaultValue="users" className="w-full">
                <TabsList className="grid w-full grid-cols-2 max-w-[400px]">
                    <TabsTrigger value="users">{t('users.tabs.users')}</TabsTrigger>
                    <TabsTrigger value="roles">{t('users.tabs.roles')}</TabsTrigger>
                </TabsList>

                <TabsContent value="users">
                    <Card>
                        <CardHeader className="pb-4">
                            <div className="flex justify-between items-center gap-4">
                                <div>
                                    <CardTitle className="text-base">{t('users.usersList')}</CardTitle>
                                </div>
                                <div className="flex items-center gap-2">
                                    <Dialog open={isUserDialogOpen} onOpenChange={setIsUserDialogOpen}>
                                        <DialogTrigger asChild>
                                            <Button>
                                                <Plus className="w-4 h-4 me-2" />
                                                {t('users.addUser')}
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent>
                                            <DialogHeader>
                                                <DialogTitle>{t("users.addUserTitle")}</DialogTitle>
                                            </DialogHeader>
                                            <form onSubmit={handleUserSubmit} className="space-y-4">
                                                <div className="space-y-2">
                                                    <Label>{t('users.fullName')}</Label>
                                                    <Input
                                                        required
                                                        value={userForm.name}
                                                        onChange={e => setUserForm({ ...userForm, name: e.target.value })}
                                                        placeholder={t("members.name")}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>{t('users.email')}</Label>
                                                    <Input
                                                        required
                                                        type="email"
                                                        value={userForm.email}
                                                        onChange={e => setUserForm({ ...userForm, email: e.target.value })}
                                                        placeholder={t("users.emailPlaceholder")}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>{t('users.password')}</Label>
                                                    <Input
                                                        required
                                                        type="password"
                                                        value={userForm.password}
                                                        onChange={e => setUserForm({ ...userForm, password: e.target.value })}
                                                        placeholder="******"
                                                        minLength={6}
                                                    />
                                                </div>
                                                <div className="space-y-2">
                                                    <Label>{t("users.role")}</Label>
                                                    <Select
                                                        value={userForm.role}
                                                        onValueChange={(val) => setUserForm({ ...userForm, role: val })}
                                                    >
                                                        <SelectTrigger>
                                                            <SelectValue />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {roles.map(r => (
                                                                <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                                                            ))}
                                                        </SelectContent>
                                                    </Select>
                                                </div>
                                                <Button type="submit" className="w-full" disabled={mutationCreateUser.isPending}>
                                                    {mutationCreateUser.isPending ? t('common.loading') : t('users.addUser')}
                                                </Button>
                                            </form>
                                        </DialogContent>
                                    </Dialog>

                                    <div className="relative w-full max-w-sm">
                                        <Search className="absolute start-3 top-2.5 h-4 w-4 text-muted-foreground" />
                                        <Input placeholder={t("common.search")} className="ps-10" value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
                                    </div>
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {usersError ? (
                                <div className="p-4 text-center text-destructive bg-destructive/10 rounded-md">
                                    <p>{t("users.loadError")}: {usersError.message}</p>
                                </div>
                            ) : loadingUsers ? (
                                <div className="space-y-4">
                                    {[1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full" />)}
                                </div>
                            ) : (
                                <div className="overflow-x-auto">
                                    <table className="w-full text-sm" dir={dir}>
                                        <thead className="bg-muted/50 border-b">
                                            <tr>
                                                <th className="p-4 text-start">{t('users.user')}</th>
                                                <th className="p-4 text-start">{t('users.email')}</th>
                                                <th className="p-4 text-start">{t('users.lastLogin')}</th>
                                                <th className="p-4 text-start">{t('users.role')}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {filteredUsers && filteredUsers.length > 0 ? filteredUsers.map(user => (
                                                <tr key={user.id} className="border-b">
                                                    <td className="p-4 text-start font-medium">
                                                        <div className="flex items-center gap-2">
                                                            {user.photoURL ? <img src={user.photoURL} className="w-8 h-8 rounded-full" /> : <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary font-bold">{user.displayName?.[0] || user.email?.[0]}</div>}
                                                            <div>
                                                                <div>{user.displayName || t('users.user')}</div>
                                                                {(user as any).isInvite && <Badge variant="outline" className="text-xs mt-1">{t('users.invitePending')}</Badge>}
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="p-4 text-start font-mono text-muted-foreground">{user.email}</td>
                                                    <td className="p-4 text-start text-muted-foreground">{user.createdAt || t("common.none")}</td>
                                                    <td className="p-4 text-start">
                                                        <div className="flex items-center gap-2">
                                                            {(user as any).isInvite && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    title={t("users.inviteEmailTooltip")}
                                                                    onClick={() => sendInviteEmail(user.email, user.displayName?.replace(" (مدعو)", "") || "")}
                                                                >
                                                                    <Mail className="w-4 h-4 text-blue-500" />
                                                                </Button>
                                                            )}
                                                            <Select
                                                                value={user.role || 'staff'}
                                                                onValueChange={(val) => {
                                                                    if (confirm(t('users.changeRoleConfirm'))) {
                                                                        updateRoleMutation.mutate({ id: user.id, role: val });
                                                                    }
                                                                }}
                                                                disabled={updateRoleMutation.isPending || user.email === clubSettings?.managerEmail}
                                                            >
                                                                <SelectTrigger className="w-32 h-8">
                                                                    <SelectValue />
                                                                </SelectTrigger>
                                                                <SelectContent>
                                                                    {roles.map(r => (
                                                                        <SelectItem key={r.id} value={r.id}>
                                                                            {r.name}
                                                                        </SelectItem>
                                                                    ))}
                                                                </SelectContent>
                                                            </Select>

                                                            {user.email !== clubSettings?.managerEmail && (
                                                                <Button
                                                                    variant="ghost"
                                                                    size="icon"
                                                                    className="text-destructive hover:text-destructive"
                                                                    onClick={() => {
                                                                        if (confirm(t('users.deleteUserConfirm'))) {
                                                                            mutationDeleteUser.mutate(user.id);
                                                                        }
                                                                    }}
                                                                    title={t('common.delete')}
                                                                >
                                                                    <Trash2 className="w-4 h-4" />
                                                                </Button>
                                                            )}
                                                        </div>
                                                    </td>
                                                </tr>
                                            )) : (
                                                <tr><td colSpan={4} className="text-center py-8">{t("users.noUsers")}</td></tr>
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </CardContent>
                    </Card >
                </TabsContent >

                <TabsContent value="roles">
                    <Card>
                        <CardHeader className="pb-4">
                            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                                <div>
                                    <CardTitle className="text-base">{t('users.rolesList')}</CardTitle>
                                    <CardDescription>{t('users.rolesSubtitle')}</CardDescription>
                                </div>
                                <Dialog open={isRoleDialogOpen} onOpenChange={setIsRoleDialogOpen}>
                                    <DialogTrigger asChild>
                                        <Button onClick={openCreateRole}>
                                            <Plus className="w-4 h-4 me-2" />
                                            {t('users.addRole')}
                                        </Button>
                                    </DialogTrigger>
                                    <DialogContent className="max-w-2xl">
                                        <DialogHeader>
                                            <DialogTitle>{editingRole ? t('common.edit') : t('users.addRole')}</DialogTitle>
                                        </DialogHeader>
                                        <form onSubmit={handleRoleSubmit} className="space-y-6">
                                            <div className="space-y-2">
                                                <Label>{t('users.roleName')}</Label>
                                                <Input
                                                    value={roleForm.name}
                                                    onChange={e => setRoleForm({ ...roleForm, name: e.target.value })}
                                                    placeholder={t("users.roleNamePlaceholder")}
                                                />
                                            </div>

                                            <div className="space-y-2">
                                                <Label>{t('users.permissions')}</Label>
                                                <ScrollArea className="h-[400px] border rounded-md p-4 bg-muted/20">
                                                    <div className="space-y-6">
                                                        {PERMISSION_GROUPS.map((group) => (
                                                            <div key={group.label} className="space-y-3">
                                                                <h4 className="font-medium text-primary text-sm border-b pb-1">{t(group.label)}</h4>
                                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3" dir={dir}>
                                                                    {group.permissions.map((perm) => (
                                                                        <div
                                                                            key={perm.id}
                                                                            className={`flex items-center ${dir === "rtl" ? "space-x-2 space-x-reverse" : "space-x-2"}`}
                                                                        >
                                                                            <Checkbox
                                                                                id={perm.id}
                                                                                checked={roleForm.permissions.includes(perm.id)}
                                                                                onCheckedChange={() => togglePermission(perm.id)}
                                                                            />
                                                                            <Label
                                                                                htmlFor={perm.id}
                                                                                className="text-sm font-normal cursor-pointer"
                                                                            >
                                                                                {t(perm.label)}
                                                                            </Label>
                                                                        </div>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                </ScrollArea>
                                            </div>

                                            <Button type="submit" className="w-full" disabled={mutationCreateRole.isPending || mutationUpdateRole.isPending}>
                                                {mutationCreateRole.isPending || mutationUpdateRole.isPending ? t('common.loading') : t('common.save')}
                                            </Button>
                                        </form>
                                    </DialogContent>
                                </Dialog>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-4">
                                {roles.map(role => (
                                    <div key={role.id} className="flex items-center justify-between p-4 border rounded-lg">
                                        <div className="flex items-center gap-3">
                                            <Shield className="w-5 h-5 text-muted-foreground" />
                                            <div>
                                                <p className="font-medium">{role.name}</p>
                                                <p className="text-xs text-muted-foreground font-mono">{t("common.id")}: {role.id}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            {role.id !== 'admin' && (
                                                <Button variant="ghost" size="icon" onClick={() => openEditRole(role)}>
                                                    <Pencil className="w-4 h-4" />
                                                </Button>
                                            )}
                                            {!role.isSystem && (
                                                <Button
                                                    variant="ghost"
                                                    size="icon"
                                                    className="text-destructive hover:text-destructive"
                                                    onClick={() => {
                                                        if (confirm(t('users.deleteRoleConfirm'))) mutationDeleteRole.mutate(role.id);
                                                    }}
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </Button>
                                            )}
                                            {role.isSystem && <Badge variant="secondary">{t('common.active')}</Badge>}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs >
        </div >
    );
}
