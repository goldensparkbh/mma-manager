import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/theme-toggle";
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import {
  PlatformAdminSidebar,
  SECTION_META,
  type PlatformAdminSection,
} from "@/components/platform-admin-sidebar";
import { useLanguage } from "@/context/language-context";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { apiJson } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import type { Tenant, PlatformSubscriptionPlan } from "@shared/schema";
import {
  Building2, Users, DollarSign, Shield, Loader2, Pencil, RefreshCw,
  Plus, Trash2, Power,
} from "lucide-react";
import { PlatformPaymentsPanel, PlatformSupportPanel, PlatformAdminsPanel, ImpersonateTenantButton } from "@/components/platform-admin-panels";
import { PlatformLeadsPanel } from "@/components/platform-leads-panel";

type PlatformStats = {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  mrr: number;
};

const PLAN_FEATURES = [
  { id: "members", label: "Members" },
  { id: "attendance", label: "Attendance" },
  { id: "subscriptions", label: "Subscriptions" },
  { id: "store", label: "Store" },
  { id: "finance", label: "Finance" },
  { id: "belts", label: "Belts" },
  { id: "*", label: "All features" },
] as const;

type PlanForm = {
  name: string;
  slug: string;
  description: string;
  priceMonthly: string;
  priceYearly: string;
  maxMembers: string;
  maxUsers: string;
  sortOrder: string;
  features: string[];
  isActive: boolean;
};

const emptyPlanForm = (): PlanForm => ({
  name: "",
  slug: "",
  description: "",
  priceMonthly: "29",
  priceYearly: "290",
  maxMembers: "100",
  maxUsers: "3",
  sortOrder: "0",
  features: ["members", "attendance", "subscriptions"],
  isActive: true,
});

const statusColors: Record<string, string> = {
  active: "bg-green-500/10 text-green-700",
  trial: "bg-blue-500/10 text-blue-700",
  suspended: "bg-red-500/10 text-red-700",
  cancelled: "bg-gray-500/10 text-gray-700",
};

function planToForm(plan: PlatformSubscriptionPlan): PlanForm {
  return {
    name: plan.name,
    slug: plan.slug,
    description: plan.description || "",
    priceMonthly: String(plan.priceMonthly),
    priceYearly: String(plan.priceYearly),
    maxMembers: String(plan.maxMembers),
    maxUsers: String(plan.maxUsers),
    sortOrder: String(plan.sortOrder ?? 0),
    features: plan.features || [],
    isActive: plan.isActive,
  };
}

function formToPayload(form: PlanForm) {
  return {
    name: form.name.trim(),
    slug: form.slug.trim().toLowerCase().replace(/\s+/g, "_"),
    description: form.description.trim() || null,
    priceMonthly: Number(form.priceMonthly),
    priceYearly: Number(form.priceYearly),
    maxMembers: Number(form.maxMembers),
    maxUsers: Number(form.maxUsers),
    sortOrder: Number(form.sortOrder),
    features: form.features,
    isActive: form.isActive,
  };
}

function StatCard({
  icon: Icon,
  value,
  label,
  stripe,
  iconBg,
  iconColor,
}: {
  icon: typeof Building2;
  value: string | number;
  label: string;
  stripe: string;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <Card className="overflow-hidden border-0 shadow-sm">
      <CardContent className="p-0">
        <div className={`h-1 ${stripe}`} />
        <div className="flex items-center gap-4 p-5">
          <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${iconBg}`}>
            <Icon className={`h-6 w-6 ${iconColor}`} />
          </div>
          <div>
            <p className="text-2xl font-bold tracking-tight">{value}</p>
            <p className="text-sm text-muted-foreground">{label}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export default function PlatformAdmin() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [section, setSection] = useState<PlatformAdminSection>("overview");
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [editForm, setEditForm] = useState({ status: "", planId: "" });
  const [planDialog, setPlanDialog] = useState<{ mode: "create" | "edit"; plan?: PlatformSubscriptionPlan } | null>(null);
  const [planForm, setPlanForm] = useState<PlanForm>(emptyPlanForm());
  const [deletePlan, setDeletePlan] = useState<PlatformSubscriptionPlan | null>(null);

  const { data: stats, isLoading: statsLoading } = useQuery<PlatformStats>({
    queryKey: ["/api/platform/stats"],
    queryFn: () => apiJson("/api/platform/stats"),
  });

  const { data: tenants = [], isLoading: tenantsLoading, refetch } = useQuery<Tenant[]>({
    queryKey: ["/api/platform/tenants"],
    queryFn: () => apiJson("/api/platform/tenants"),
  });

  const { data: plans = [], refetch: refetchPlans } = useQuery<PlatformSubscriptionPlan[]>({
    queryKey: ["/api/platform/plans"],
    queryFn: () => apiJson("/api/platform/plans"),
  });

  const updateTenant = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: Record<string, unknown> }) => {
      await apiJson(`/api/platform/tenants/${id}`, { method: "PATCH", body: JSON.stringify(data) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/tenants"] });
      queryClient.invalidateQueries({ queryKey: ["/api/platform/stats"] });
      setEditTenant(null);
      toast({ title: "Tenant updated" });
    },
    onError: (err: Error) => toast({ variant: "destructive", title: "Error", description: err.message }),
  });

  const savePlan = useMutation({
    mutationFn: async () => {
      const payload = formToPayload(planForm);
      if (!payload.name || !payload.slug) throw new Error("Name and slug are required");
      if (planDialog?.mode === "edit" && planDialog.plan) {
        const { slug: _slug, ...updatePayload } = payload;
        return apiJson(`/api/platform/plans/${planDialog.plan.id}`, {
          method: "PATCH",
          body: JSON.stringify(updatePayload),
        });
      }
      return apiJson("/api/platform/plans", { method: "POST", body: JSON.stringify(payload) });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      setPlanDialog(null);
      toast({ title: planDialog?.mode === "edit" ? "Plan updated" : "Plan created" });
    },
    onError: (err: Error) => toast({ variant: "destructive", title: "Error", description: err.message }),
  });

  const togglePlanActive = useMutation({
    mutationFn: async ({ id, isActive }: { id: string; isActive: boolean }) => {
      return apiJson(`/api/platform/plans/${id}`, {
        method: "PATCH",
        body: JSON.stringify({ isActive }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      toast({ title: "Plan status updated" });
    },
    onError: (err: Error) => toast({ variant: "destructive", title: "Error", description: err.message }),
  });

  const removePlan = useMutation({
    mutationFn: async (id: string) => {
      await apiJson(`/api/platform/plans/${id}`, { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/plans"] });
      queryClient.invalidateQueries({ queryKey: ["/api/plans"] });
      setDeletePlan(null);
      toast({ title: "Plan deleted" });
    },
    onError: (err: Error) => toast({ variant: "destructive", title: "Error", description: err.message }),
  });

  const openEdit = (tenant: Tenant) => {
    setEditTenant(tenant);
    setEditForm({ status: tenant.status, planId: tenant.planId || "" });
  };

  const handleSave = () => {
    if (!editTenant) return;
    updateTenant.mutate({
      id: editTenant.id,
      data: { status: editForm.status, planId: editForm.planId || undefined },
    });
  };

  const openCreatePlan = () => {
    setPlanForm(emptyPlanForm());
    setPlanDialog({ mode: "create" });
  };

  const openEditPlan = (plan: PlatformSubscriptionPlan) => {
    setPlanForm(planToForm(plan));
    setPlanDialog({ mode: "edit", plan });
  };

  const toggleFeature = (featureId: string) => {
    setPlanForm((f) => {
      if (featureId === "*") {
        return { ...f, features: f.features.includes("*") ? [] : ["*"] };
      }
      const withoutAll = f.features.filter((x) => x !== "*");
      const next = withoutAll.includes(featureId)
        ? withoutAll.filter((x) => x !== featureId)
        : [...withoutAll, featureId];
      return { ...f, features: next };
    });
  };

  const meta = SECTION_META[section];
  const style = { "--sidebar-width": "17rem", "--sidebar-width-icon": "4rem" };

  const statsGrid = (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <StatCard
        icon={Building2}
        value={statsLoading ? "—" : (stats?.totalTenants ?? 0)}
        label={t("platformAdmin.stats.totalTenants")}
        stripe="bg-primary"
        iconBg="bg-primary/10"
        iconColor="text-primary"
      />
      <StatCard
        icon={Users}
        value={statsLoading ? "—" : (stats?.activeTenants ?? 0)}
        label={t("platformAdmin.stats.active")}
        stripe="bg-green-500"
        iconBg="bg-green-500/10"
        iconColor="text-green-600"
      />
      <StatCard
        icon={RefreshCw}
        value={statsLoading ? "—" : (stats?.trialTenants ?? 0)}
        label={t("platformAdmin.stats.onTrial")}
        stripe="bg-blue-500"
        iconBg="bg-blue-500/10"
        iconColor="text-blue-600"
      />
      <StatCard
        icon={DollarSign}
        value={statsLoading ? "—" : `$${stats?.mrr?.toFixed(0) ?? 0}`}
        label={t("platformAdmin.stats.mrr")}
        stripe="bg-amber-500"
        iconBg="bg-amber-500/10"
        iconColor="text-amber-600"
      />
    </div>
  );

  return (
    <>
    <ThemeProvider defaultTheme="light" storageKey="platform-admin-theme">
      <TooltipProvider>
        <SidebarProvider style={style as React.CSSProperties}>
          <div className="flex h-screen w-full bg-muted/30">
            <PlatformAdminSidebar active={section} onNavigate={setSection} />
            <div className="flex flex-1 flex-col overflow-hidden">
              <header className="flex items-center justify-between gap-4 border-b bg-card px-4 py-3 shrink-0">
                <div className="flex items-center gap-3 min-w-0">
                  <SidebarTrigger />
                  <div className="min-w-0">
                    <p className="text-xs text-muted-foreground hidden sm:block">
                      {new Intl.DateTimeFormat(language === "ar" ? "ar-BH" : "en-US", {
                        weekday: "long",
                        year: "numeric",
                        month: "long",
                        day: "numeric",
                      }).format(new Date())}
                    </p>
                    <h1 className="text-lg font-bold truncate sm:text-xl">{t(meta.titleKey)}</h1>
                    <p className="text-sm text-muted-foreground truncate hidden sm:block">
                      {t(meta.descriptionKey)}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <Badge variant="outline" className="hidden sm:flex gap-1 font-normal">
                    <Shield className="h-3 w-3" />
                    {user?.email}
                  </Badge>
                  <ThemeToggle />
                </div>
              </header>

              <main className="flex-1 overflow-y-auto p-4 md:p-6 space-y-6">
                {(section === "overview" || section === "tenants") && statsGrid}

                {section === "overview" && (
                  <div className="grid gap-4 lg:grid-cols-2">
                    <Card className="shadow-sm">
                      <CardHeader>
                        <CardTitle>{t("platformAdmin.overview.quickActions")}</CardTitle>
                        <CardDescription>{t("platformAdmin.overview.quickActionsDesc")}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-wrap gap-2">
                        <Button variant="outline" onClick={() => setSection("tenants")}>
                          <Building2 className="h-4 w-4 mr-2" />
                          {t("platformAdmin.nav.tenants")}
                        </Button>
                        <Button variant="outline" onClick={() => setSection("leads")}>
                          <RefreshCw className="h-4 w-4 mr-2" />
                          {t("platformAdmin.nav.leads")}
                        </Button>
                        <Button variant="outline" onClick={() => setSection("plans")}>
                          <DollarSign className="h-4 w-4 mr-2" />
                          {t("platformAdmin.nav.plans")}
                        </Button>
                      </CardContent>
                    </Card>
                    <Card className="shadow-sm">
                      <CardHeader>
                        <CardTitle>{t("platformAdmin.overview.recentClubs")}</CardTitle>
                        <CardDescription>
                          {tenantsLoading ? "…" : t("platformAdmin.overview.clubCount").replace("{n}", String(tenants.length))}
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-2">
                        {tenants.slice(0, 5).map((tenant) => (
                          <div
                            key={tenant.id}
                            className="flex items-center justify-between rounded-lg border px-3 py-2 text-sm"
                          >
                            <span className="font-medium truncate">{tenant.name}</span>
                            <Badge variant="outline" className={statusColors[tenant.status] || ""}>
                              {tenant.status}
                            </Badge>
                          </div>
                        ))}
                        {tenants.length > 5 && (
                          <Button variant="ghost" className="px-0 h-auto" onClick={() => setSection("tenants")}>
                            {t("platformAdmin.overview.viewAll")}
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}

                {section === "leads" && (
                  <Card className="shadow-sm">
                    <CardHeader>
                      <CardTitle>{t("platformAdmin.leads.title")}</CardTitle>
                      <CardDescription>{t("platformAdmin.leads.description")}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <PlatformLeadsPanel />
                    </CardContent>
                  </Card>
                )}

                {section === "tenants" && (
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>All Tenants</CardTitle>
                  <CardDescription>Manage club accounts. Plan changes create a new snapshotted subscription period.</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => refetch()}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </CardHeader>
              <CardContent>
                {tenantsLoading ? (
                  <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Club</TableHead>
                        <TableHead>Email</TableHead>
                        <TableHead>Locked Plan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Members</TableHead>
                        <TableHead>Users</TableHead>
                        <TableHead>Period Ends</TableHead>
                        <TableHead></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {tenants.map((tenant) => (
                        <TableRow key={tenant.id}>
                          <TableCell className="font-medium">{tenant.name}</TableCell>
                          <TableCell>{tenant.email}</TableCell>
                          <TableCell>{tenant.planName || "—"}</TableCell>
                          <TableCell>
                            <Badge variant="outline" className={statusColors[tenant.status] || ""}>
                              {tenant.status}
                            </Badge>
                          </TableCell>
                          <TableCell>{tenant.memberCount ?? 0}</TableCell>
                          <TableCell>{tenant.userCount ?? 0}</TableCell>
                          <TableCell className="text-sm text-muted-foreground">
                            {tenant.currentPeriodEnd
                              ? new Date(tenant.currentPeriodEnd).toLocaleDateString()
                              : "—"}
                          </TableCell>
                          <TableCell>
                            <div className="flex justify-end gap-1">
                              <ImpersonateTenantButton tenantId={tenant.id} />
                              <Button variant="ghost" size="sm" onClick={() => openEdit(tenant)}>
                                <Pencil className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
                )}

                {section === "plans" && (
            <Card className="shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Subscription Plans</CardTitle>
                  <CardDescription>
                    Edit plans for new signups. Existing tenants keep their snapshotted plan until their period ends.
                  </CardDescription>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => refetchPlans()}>
                    <RefreshCw className="h-4 w-4" />
                  </Button>
                  <Button size="sm" onClick={openCreatePlan}>
                    <Plus className="h-4 w-4 mr-2" /> Add Plan
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan</TableHead>
                      <TableHead>Slug</TableHead>
                      <TableHead>Monthly</TableHead>
                      <TableHead>Yearly</TableHead>
                      <TableHead>Limits</TableHead>
                      <TableHead>Subscribers</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-end">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plans.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell>
                          <p className="font-medium">{plan.name}</p>
                          {plan.description && (
                            <p className="text-xs text-muted-foreground line-clamp-1">{plan.description}</p>
                          )}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{plan.slug}</TableCell>
                        <TableCell>${plan.priceMonthly}</TableCell>
                        <TableCell>${plan.priceYearly}</TableCell>
                        <TableCell className="text-sm">
                          {plan.maxMembers} members · {plan.maxUsers} staff
                        </TableCell>
                        <TableCell>{plan.subscriberCount ?? 0}</TableCell>
                        <TableCell>
                          <Badge variant={plan.isActive ? "default" : "secondary"}>
                            {plan.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="flex justify-end gap-1">
                            <Button variant="ghost" size="sm" onClick={() => openEditPlan(plan)} title="Edit">
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => togglePlanActive.mutate({ id: plan.id, isActive: !plan.isActive })}
                              title={plan.isActive ? "Deactivate" : "Activate"}
                            >
                              <Power className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-destructive hover:text-destructive"
                              onClick={() => setDeletePlan(plan)}
                              title="Delete"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
                )}

                {section === "payments" && <PlatformPaymentsPanel />}

                {section === "support" && <PlatformSupportPanel />}

                {section === "admins" && <PlatformAdminsPanel />}
              </main>
            </div>
          </div>
        </SidebarProvider>
      </TooltipProvider>
    </ThemeProvider>

      <Dialog open={!!editTenant} onOpenChange={() => setEditTenant(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Tenant: {editTenant?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Status</Label>
              <Select value={editForm.status} onValueChange={(v) => setEditForm((f) => ({ ...f, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="trial">Trial</SelectItem>
                  <SelectItem value="suspended">Suspended</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Assign new plan (snapshots for new period)</Label>
              <Select value={editForm.planId} onValueChange={(v) => setEditForm((f) => ({ ...f, planId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                <SelectContent>
                  {plans.filter((p) => p.isActive).map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name} — ${p.priceMonthly}/mo</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditTenant(null)}>Cancel</Button>
            <Button onClick={handleSave} disabled={updateTenant.isPending}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!planDialog} onOpenChange={() => setPlanDialog(null)}>
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{planDialog?.mode === "edit" ? "Edit Plan" : "Create Plan"}</DialogTitle>
            <DialogDescription>
              Changes apply to new registrations only. Tenants on this plan keep their locked pricing until their period ends.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={planForm.name} onChange={(e) => setPlanForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Slug *</Label>
                <Input
                  value={planForm.slug}
                  onChange={(e) => setPlanForm((f) => ({ ...f, slug: e.target.value }))}
                  disabled={planDialog?.mode === "edit"}
                  placeholder="starter"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={planForm.description} onChange={(e) => setPlanForm((f) => ({ ...f, description: e.target.value }))} rows={2} />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Monthly price ($)</Label>
                <Input type="number" min="0" step="0.01" value={planForm.priceMonthly} onChange={(e) => setPlanForm((f) => ({ ...f, priceMonthly: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Yearly price ($)</Label>
                <Input type="number" min="0" step="0.01" value={planForm.priceYearly} onChange={(e) => setPlanForm((f) => ({ ...f, priceYearly: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Max members</Label>
                <Input type="number" min="1" value={planForm.maxMembers} onChange={(e) => setPlanForm((f) => ({ ...f, maxMembers: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Max staff users</Label>
                <Input type="number" min="1" value={planForm.maxUsers} onChange={(e) => setPlanForm((f) => ({ ...f, maxUsers: e.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Sort order</Label>
                <Input type="number" value={planForm.sortOrder} onChange={(e) => setPlanForm((f) => ({ ...f, sortOrder: e.target.value }))} />
              </div>
              <div className="flex items-center justify-between rounded-lg border p-3">
                <Label>Active for new signups</Label>
                <Switch checked={planForm.isActive} onCheckedChange={(v) => setPlanForm((f) => ({ ...f, isActive: v }))} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Features</Label>
              <div className="flex flex-wrap gap-2">
                {PLAN_FEATURES.map((feat) => (
                  <Button
                    key={feat.id}
                    type="button"
                    size="sm"
                    variant={planForm.features.includes(feat.id) ? "default" : "outline"}
                    onClick={() => toggleFeature(feat.id)}
                  >
                    {feat.label}
                  </Button>
                ))}
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPlanDialog(null)}>Cancel</Button>
            <Button onClick={() => savePlan.mutate()} disabled={savePlan.isPending}>
              {savePlan.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : planDialog?.mode === "edit" ? "Save changes" : "Create plan"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!deletePlan} onOpenChange={() => setDeletePlan(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete plan: {deletePlan?.name}?</DialogTitle>
            <DialogDescription>
              {deletePlan?.subscriberCount
                ? `This plan has ${deletePlan.subscriberCount} subscription record(s). Deactivate it instead — existing tenants keep their locked plan until their period ends.`
                : "This plan has no subscriptions and can be permanently deleted."}
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeletePlan(null)}>Cancel</Button>
            {deletePlan && !deletePlan.subscriberCount ? (
              <Button variant="destructive" onClick={() => removePlan.mutate(deletePlan.id)} disabled={removePlan.isPending}>
                Delete permanently
              </Button>
            ) : deletePlan ? (
              <Button onClick={() => { togglePlanActive.mutate({ id: deletePlan.id, isActive: false }); setDeletePlan(null); }}>
                Deactivate instead
              </Button>
            ) : null}
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
