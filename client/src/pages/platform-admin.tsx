import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/context/auth-context";
import { apiJson, apiFetch } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";
import type { Tenant, PlatformSubscriptionPlan } from "@shared/schema";
import {
  Building2, Users, DollarSign, Shield, LogOut, Loader2, Pencil, RefreshCw,
} from "lucide-react";

type PlatformStats = {
  totalTenants: number;
  activeTenants: number;
  trialTenants: number;
  mrr: number;
};

const statusColors: Record<string, string> = {
  active: "bg-green-500/10 text-green-700",
  trial: "bg-blue-500/10 text-blue-700",
  suspended: "bg-red-500/10 text-red-700",
  cancelled: "bg-gray-500/10 text-gray-700",
};

export default function PlatformAdmin() {
  const { user, signOutUser } = useAuth();
  const { toast } = useToast();
  const [editTenant, setEditTenant] = useState<Tenant | null>(null);
  const [editForm, setEditForm] = useState({ status: "", planId: "" });

  const { data: stats, isLoading: statsLoading } = useQuery<PlatformStats>({
    queryKey: ["/api/platform/stats"],
    queryFn: () => apiJson("/api/platform/stats"),
  });

  const { data: tenants = [], isLoading: tenantsLoading, refetch } = useQuery<Tenant[]>({
    queryKey: ["/api/platform/tenants"],
    queryFn: () => apiJson("/api/platform/tenants"),
  });

  const { data: plans = [] } = useQuery<PlatformSubscriptionPlan[]>({
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

  return (
    <div className="min-h-screen bg-muted/20">
      <header className="border-b bg-card px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <div>
            <h1 className="text-xl font-bold">Platform Admin</h1>
            <p className="text-sm text-muted-foreground">{user?.email}</p>
          </div>
        </div>
        <Button variant="outline" onClick={signOutUser}>
          <LogOut className="h-4 w-4 mr-2" /> Sign Out
        </Button>
      </header>

      <main className="p-6 max-w-7xl mx-auto space-y-6">
        <div className="grid gap-4 md:grid-cols-4">
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <Building2 className="h-10 w-10 text-primary opacity-80" />
              <div>
                <p className="text-2xl font-bold">{statsLoading ? "—" : stats?.totalTenants}</p>
                <p className="text-sm text-muted-foreground">Total Tenants</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <Users className="h-10 w-10 text-green-600 opacity-80" />
              <div>
                <p className="text-2xl font-bold">{statsLoading ? "—" : stats?.activeTenants}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <RefreshCw className="h-10 w-10 text-blue-600 opacity-80" />
              <div>
                <p className="text-2xl font-bold">{statsLoading ? "—" : stats?.trialTenants}</p>
                <p className="text-sm text-muted-foreground">On Trial</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-4">
              <DollarSign className="h-10 w-10 text-amber-600 opacity-80" />
              <div>
                <p className="text-2xl font-bold">{statsLoading ? "—" : `$${stats?.mrr?.toFixed(0)}`}</p>
                <p className="text-sm text-muted-foreground">Est. MRR</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="tenants">
          <TabsList>
            <TabsTrigger value="tenants">Tenants</TabsTrigger>
            <TabsTrigger value="plans">Subscription Plans</TabsTrigger>
          </TabsList>

          <TabsContent value="tenants">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>All Tenants</CardTitle>
                  <CardDescription>Manage club accounts, subscriptions, and access</CardDescription>
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
                        <TableHead>Plan</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Members</TableHead>
                        <TableHead>Users</TableHead>
                        <TableHead>Subscription</TableHead>
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
                            {tenant.subscriptionStatus || "—"}
                            {tenant.currentPeriodEnd && (
                              <span className="block text-xs">
                                until {new Date(tenant.currentPeriodEnd).toLocaleDateString()}
                              </span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Button variant="ghost" size="sm" onClick={() => openEdit(tenant)}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="plans">
            <Card>
              <CardHeader>
                <CardTitle>Subscription Plans</CardTitle>
                <CardDescription>Platform pricing tiers for tenants</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Plan</TableHead>
                      <TableHead>Monthly</TableHead>
                      <TableHead>Yearly</TableHead>
                      <TableHead>Max Members</TableHead>
                      <TableHead>Max Users</TableHead>
                      <TableHead>Active</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {plans.map((plan) => (
                      <TableRow key={plan.id}>
                        <TableCell className="font-medium">{plan.name}</TableCell>
                        <TableCell>${plan.priceMonthly}</TableCell>
                        <TableCell>${plan.priceYearly}</TableCell>
                        <TableCell>{plan.maxMembers}</TableCell>
                        <TableCell>{plan.maxUsers}</TableCell>
                        <TableCell>
                          <Badge variant={plan.isActive ? "default" : "secondary"}>
                            {plan.isActive ? "Active" : "Inactive"}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>

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
              <Label>Plan</Label>
              <Select value={editForm.planId} onValueChange={(v) => setEditForm((f) => ({ ...f, planId: v }))}>
                <SelectTrigger><SelectValue placeholder="Select plan" /></SelectTrigger>
                <SelectContent>
                  {plans.map((p) => (
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
    </div>
  );
}
