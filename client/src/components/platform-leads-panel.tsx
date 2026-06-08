import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { apiJson } from "@/lib/api";

type Lead = {
  id: string;
  clubName?: string;
  contactName: string;
  email: string;
  phone?: string;
  status: string;
  createdAt?: string;
};

const STATUSES = ["new", "contacted", "qualified", "converted", "lost"];

export function PlatformLeadsPanel() {
  const queryClient = useQueryClient();
  const { data: leads = [], isLoading } = useQuery<Lead[]>({
    queryKey: ["/api/platform/leads"],
    queryFn: () => apiJson("/api/platform/leads"),
  });

  const update = useMutation({
    mutationFn: ({ id, status }: { id: string; status: string }) =>
      apiJson(`/api/platform/leads/${id}`, { method: "PATCH", body: JSON.stringify({ status }) }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["/api/platform/leads"] }),
  });

  if (isLoading) return <Loader2 className="h-8 w-8 animate-spin mx-auto" />;

  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Club</TableHead>
          <TableHead>Contact</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Status</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {leads.map((lead) => (
          <TableRow key={lead.id}>
            <TableCell>{lead.clubName || "—"}</TableCell>
            <TableCell>{lead.contactName}</TableCell>
            <TableCell>{lead.email}</TableCell>
            <TableCell>
              <Select value={lead.status} onValueChange={(v) => update.mutate({ id: lead.id, status: v })}>
                <SelectTrigger className="w-[130px] h-8"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                </SelectContent>
              </Select>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
