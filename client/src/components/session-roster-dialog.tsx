import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ar, enUS } from "date-fns/locale";
import { Loader2, Trash2, UserPlus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useLanguage } from "@/context/language-context";
import { apiJson, apiFetch } from "@/lib/api";
import type { Booking, ClassSession, Member } from "@shared/schema";

type Props = {
  session: ClassSession | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
};

export function SessionRosterDialog({ session, open, onOpenChange, canManage }: Props) {
  const { t, language } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const locale = language === "ar" ? ar : enUS;
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedMemberId, setSelectedMemberId] = useState("");

  const { data: bookings = [], isLoading } = useQuery<Booking[]>({
    queryKey: ["/api/bookings", session?.id],
    queryFn: () => apiJson(`/api/bookings?sessionId=${session!.id}`),
    enabled: open && !!session?.id,
  });

  const { data: members = [] } = useQuery<Member[]>({
    queryKey: ["/api/members"],
    queryFn: () => apiJson("/api/members"),
    enabled: open && canManage,
  });

  const filteredMembers = members.filter((m) => {
    const q = memberSearch.toLowerCase();
    return (
      m.name.toLowerCase().includes(q) ||
      m.phone?.includes(q) ||
      m.memberId?.toLowerCase().includes(q)
    );
  });

  const bookMember = useMutation({
    mutationFn: (memberId: string) =>
      apiJson("/api/bookings", {
        method: "POST",
        body: JSON.stringify({ sessionId: session!.id, memberId }),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings", session?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/classes/sessions"] });
      setSelectedMemberId("");
      toast({ title: t("common.success"), description: t("bookings.booked") });
    },
    onError: (err) =>
      toast({ variant: "destructive", title: t("common.error"), description: (err as Error).message }),
  });

  const cancelBooking = useMutation({
    mutationFn: (id: string) => apiFetch(`/api/bookings/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/bookings", session?.id] });
      queryClient.invalidateQueries({ queryKey: ["/api/classes/sessions"] });
      toast({ title: t("common.success"), description: t("bookings.cancelled") });
    },
    onError: (err) =>
      toast({ variant: "destructive", title: t("common.error"), description: (err as Error).message }),
  });

  if (!session) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{session.name}</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {format(new Date(session.startsAt), "EEE d MMM · HH:mm", { locale })}
            {" · "}
            {session.bookedCount ?? 0}/{session.capacity}
          </p>
        </DialogHeader>

        {canManage && (
          <div className="space-y-2 border-b pb-4">
            <p className="text-sm font-medium">{t("bookings.addMember")}</p>
            <Input
              placeholder={t("bookings.searchMember")}
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
            />
            <Select value={selectedMemberId} onValueChange={setSelectedMemberId}>
              <SelectTrigger><SelectValue placeholder={t("bookings.selectMember")} /></SelectTrigger>
              <SelectContent>
                {filteredMembers.slice(0, 50).map((m) => (
                  <SelectItem key={m.id} value={m.id}>
                    {m.name} ({m.phone})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Button
              size="sm"
              className="w-full"
              disabled={!selectedMemberId || bookMember.isPending}
              onClick={() => bookMember.mutate(selectedMemberId)}
            >
              <UserPlus className="h-4 w-4 me-2" />
              {t("bookings.book")}
            </Button>
          </div>
        )}

        <div className="space-y-2">
          <p className="text-sm font-medium">{t("bookings.roster")}</p>
          {isLoading ? (
            <Loader2 className="h-6 w-6 animate-spin mx-auto" />
          ) : bookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("bookings.noBookings")}</p>
          ) : (
            bookings.map((b) => (
              <div key={b.id} className="flex items-center justify-between gap-2 rounded-lg border p-2 text-sm">
                <div>
                  <p className="font-medium">{b.memberName}</p>
                  <Badge variant="outline" className="text-[10px] mt-1">
                    {t(`portal.status.${b.status}`)}
                  </Badge>
                </div>
                {canManage && b.status !== "cancelled" && (
                  <Button
                    size="icon"
                    variant="ghost"
                    className="text-destructive h-8 w-8"
                    disabled={cancelBooking.isPending}
                    onClick={() => cancelBooking.mutate(b.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
