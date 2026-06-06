import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { apiJson, setToken, getToken } from "@/lib/api";
import { Loader2, Send, Eye } from "lucide-react";

type Payment = {
  id: string;
  tenantName: string;
  tenantEmail: string;
  planName: string;
  amount: number;
  currency: string;
  status: string;
  billingCycle: string;
  invoiceNumber?: string;
  invoiceSentAt?: string;
  paidAt?: string;
  createdAt?: string;
};

type SupportConversation = {
  id: string;
  tenantName: string;
  tenantEmail: string;
  status: string;
  lastMessage?: string;
  lastMessageAt?: string;
};

type SupportMessage = {
  id: string;
  senderType: string;
  senderName?: string;
  body: string;
  createdAt?: string;
};

type PlatformAdminUser = {
  id: string;
  email: string;
  displayName?: string;
  roleId: string;
  roleName?: string;
  isActive: boolean;
};

export function PlatformPaymentsPanel() {
  const { data: payments = [], isLoading } = useQuery<Payment[]>({
    queryKey: ["/api/platform/payments"],
    queryFn: () => apiJson("/api/platform/payments"),
  });

  const statusColor: Record<string, string> = {
    captured: "bg-green-500/10 text-green-700",
    pending: "bg-amber-500/10 text-amber-700",
    failed: "bg-red-500/10 text-red-700",
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Payments & trials</CardTitle>
        <CardDescription>Track TAP payments, trial conversions, and invoice emails</CardDescription>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin" /></div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tenant</TableHead>
                <TableHead>Plan</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Invoice</TableHead>
                <TableHead>Paid</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {payments.map((p) => (
                <TableRow key={p.id}>
                  <TableCell>
                    <p className="font-medium">{p.tenantName}</p>
                    <p className="text-xs text-muted-foreground">{p.tenantEmail}</p>
                  </TableCell>
                  <TableCell>{p.planName} ({p.billingCycle})</TableCell>
                  <TableCell>{p.amount} {p.currency}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={statusColor[p.status] || ""}>{p.status}</Badge>
                  </TableCell>
                  <TableCell className="text-xs">
                    {p.invoiceNumber || "—"}
                    {p.invoiceSentAt && <span className="block text-muted-foreground">Emailed</span>}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {p.paidAt ? new Date(p.paidAt).toLocaleString() : "—"}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

export function PlatformSupportPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  const { data: conversations = [] } = useQuery<SupportConversation[]>({
    queryKey: ["/api/platform/support/conversations"],
    queryFn: () => apiJson("/api/platform/support/conversations"),
    refetchInterval: 8000,
  });

  const { data: messages = [] } = useQuery<SupportMessage[]>({
    queryKey: ["/api/platform/support/messages", selectedId],
    queryFn: () => apiJson(`/api/platform/support/conversations/${selectedId}/messages`),
    enabled: !!selectedId,
    refetchInterval: 5000,
  });

  const sendReply = useMutation({
    mutationFn: () => apiJson(`/api/platform/support/conversations/${selectedId}/messages`, {
      method: "POST",
      body: JSON.stringify({ body: reply }),
    }),
    onSuccess: () => {
      setReply("");
      queryClient.invalidateQueries({ queryKey: ["/api/platform/support/messages", selectedId] });
      toast({ title: "Reply sent" });
    },
    onError: (err: Error) => toast({ variant: "destructive", title: "Error", description: err.message }),
  });

  const selected = conversations.find((c) => c.id === selectedId);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Support inbox</CardTitle>
          <CardDescription>Tenant chatbot and support requests</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2 max-h-[520px] overflow-y-auto">
          {conversations.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedId(c.id)}
              className={`w-full text-start rounded-lg border p-3 transition-colors ${selectedId === c.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"}`}
            >
              <div className="flex justify-between gap-2">
                <p className="font-medium">{c.tenantName}</p>
                <Badge variant="outline">{c.status}</Badge>
              </div>
              <p className="text-xs text-muted-foreground mt-1 line-clamp-2">{c.lastMessage}</p>
            </button>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{selected ? selected.tenantName : "Select a conversation"}</CardTitle>
          {selected && <CardDescription>{selected.tenantEmail}</CardDescription>}
        </CardHeader>
        <CardContent>
          {selectedId ? (
            <div className="space-y-4">
              <div className="h-72 overflow-y-auto space-y-2 rounded-lg border p-3 bg-muted/20">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`text-sm rounded-lg px-3 py-2 max-w-[90%] ${
                      m.senderType === "platform_admin" ? "ms-auto bg-primary text-primary-foreground" : "bg-muted"
                    }`}
                  >
                    <p className="text-[10px] opacity-70 mb-1">{m.senderName || m.senderType}</p>
                    {m.body}
                  </div>
                ))}
              </div>
              <div className="flex gap-2">
                <Textarea value={reply} onChange={(e) => setReply(e.target.value)} rows={2} placeholder="Reply to tenant..." />
                <Button size="icon" disabled={!reply.trim() || sendReply.isPending} onClick={() => sendReply.mutate()}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ) : (
            <p className="text-muted-foreground text-sm">Choose a tenant conversation from the inbox.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

export function PlatformAdminsPanel() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ email: "", password: "", displayName: "", roleId: "support" });

  const { data: admins = [] } = useQuery<PlatformAdminUser[]>({
    queryKey: ["/api/platform/admins"],
    queryFn: () => apiJson("/api/platform/admins"),
  });

  const { data: roles = [] } = useQuery<{ id: string; name: string }[]>({
    queryKey: ["/api/platform/admin-roles"],
    queryFn: () => apiJson("/api/platform/admin-roles"),
  });

  const createAdmin = useMutation({
    mutationFn: () => apiJson("/api/platform/admins", { method: "POST", body: JSON.stringify(form) }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/platform/admins"] });
      setOpen(false);
      setForm({ email: "", password: "", displayName: "", roleId: "support" });
      toast({ title: "Admin user created" });
    },
    onError: (err: Error) => toast({ variant: "destructive", title: "Error", description: err.message }),
  });

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Platform admin users</CardTitle>
            <CardDescription>Role-based access to tenants, plans, payments, and support</CardDescription>
          </div>
          <Button size="sm" onClick={() => setOpen(true)}>Add admin</Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {admins.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.displayName || "—"}</TableCell>
                  <TableCell>{a.email}</TableCell>
                  <TableCell>{a.roleName || a.roleId}</TableCell>
                  <TableCell>
                    <Badge variant={a.isActive ? "default" : "secondary"}>{a.isActive ? "Active" : "Inactive"}</Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Add platform admin</DialogTitle></DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2"><Label>Display name</Label><Input value={form.displayName} onChange={(e) => setForm((f) => ({ ...f, displayName: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Email</Label><Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} /></div>
            <div className="space-y-2"><Label>Password</Label><Input type="password" value={form.password} onChange={(e) => setForm((f) => ({ ...f, password: e.target.value }))} /></div>
            <div className="space-y-2">
              <Label>Role</Label>
              <Select value={form.roleId} onValueChange={(v) => setForm((f) => ({ ...f, roleId: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {roles.map((r) => <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button onClick={() => createAdmin.mutate()} disabled={createAdmin.isPending}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

export function useImpersonateTenant() {
  const { toast } = useToast();
  return useMutation({
    mutationFn: (tenantId: string) => apiJson<{ token: string }>(`/api/platform/tenants/${tenantId}/impersonate`, { method: "POST" }),
    onSuccess: (data) => {
      const current = getToken();
      if (current) sessionStorage.setItem("admin_token_backup", current);
      setToken(data.token);
      window.location.href = "/";
    },
    onError: (err: Error) => toast({ variant: "destructive", title: "Error", description: err.message }),
  });
}

export function ImpersonateTenantButton({ tenantId }: { tenantId: string }) {
  const impersonate = useImpersonateTenant();
  return (
    <Button variant="outline" size="sm" onClick={() => impersonate.mutate(tenantId)} disabled={impersonate.isPending} title="Open tenant dashboard">
      <Eye className="h-4 w-4" />
    </Button>
  );
}
