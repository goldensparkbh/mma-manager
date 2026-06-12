import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { endOfDay, isWithinInterval, parseISO, startOfDay } from "date-fns";
import { Calendar, LogIn, LogOut, QrCode, Search, Trash2, UserCheck, Users } from "lucide-react";
import { Link } from "wouter";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { safeFormat } from "@/lib/formatDate";
import { cn } from "@/lib/utils";
import type { Attendance, Member, InsertAttendance } from "@shared/schema";
import { useLanguage } from "@/context/language-context";

import { useAuth } from "@/context/auth-context";
import { PERMISSIONS } from "@/lib/permissions";

type MemberStatus = "in" | "out" | "absent";

export default function AttendancePage() {
  const { hasPermission } = useAuth();
  const canAdd = hasPermission(PERMISSIONS.ATTENDANCE_CREATE);
  const canDelete = hasPermission(PERMISSIONS.ATTENDANCE_DELETE);
  const { toast } = useToast();
  const { t, language } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | MemberStatus>("all");
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null);

  const { data: attendanceRecords, isLoading: loadingAttendance } = useQuery<Attendance[]>({
    queryKey: ["/api/attendance", selectedDate],
  });

  const { data: members, isLoading: loadingMembers } = useQuery<Member[]>({
    queryKey: ["/api/members"],
  });

  const attendanceKey = ["/api/attendance", selectedDate];

  const recordAttendance = useMutation({
    mutationFn: async (data: InsertAttendance) => {
      const response = await apiRequest("POST", "/api/attendance", data);
      return response.json();
    },
    onMutate: async (newRecord) => {
      await queryClient.cancelQueries({ queryKey: attendanceKey });
      const previous = queryClient.getQueryData<Attendance[]>(attendanceKey);
      queryClient.setQueryData<Attendance[]>(attendanceKey, (old) => [
        ...(old ?? []),
        { ...(newRecord as Attendance), id: `optimistic-${newRecord.memberId}` },
      ]);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(attendanceKey, context.previous);
      toast({
        title: t("common.error"),
        description: t("attendance.addAttendanceError"),
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
    },
  });

  const checkOutAttendance = useMutation({
    mutationFn: async (attendanceId: string) => {
      const response = await apiRequest("PATCH", `/api/attendance/${attendanceId}/checkout`, {
        checkOut: new Date().toISOString(),
      });
      return response.json();
    },
    onMutate: async (attendanceId) => {
      await queryClient.cancelQueries({ queryKey: attendanceKey });
      const previous = queryClient.getQueryData<Attendance[]>(attendanceKey);
      const checkOut = new Date().toISOString();
      queryClient.setQueryData<Attendance[]>(attendanceKey, (old) =>
        (old ?? []).map((record) =>
          record.id === attendanceId ? { ...record, checkOut } : record,
        ),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(attendanceKey, context.previous);
      toast({
        title: t("common.error"),
        description: t("attendance.addAttendanceError"),
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
    },
  });

  const bulkRecordAttendance = useMutation({
    mutationFn: async (entries: { memberId: string; memberName: string }[]) => {
      const response = await apiRequest("POST", "/api/attendance/bulk", {
        members: entries,
        date: selectedDate,
        checkIn: new Date().toISOString(),
      });
      return response.json();
    },
    onMutate: async (entries) => {
      await queryClient.cancelQueries({ queryKey: attendanceKey });
      const previous = queryClient.getQueryData<Attendance[]>(attendanceKey);
      const checkIn = new Date().toISOString();
      queryClient.setQueryData<Attendance[]>(attendanceKey, (old) => [
        ...(old ?? []),
        ...entries.map((entry) => ({
          id: `optimistic-${entry.memberId}`,
          memberId: entry.memberId,
          memberName: entry.memberName,
          date: selectedDate,
          checkIn,
        }) as Attendance),
      ]);
      return { previous };
    },
    onSuccess: (_data, entries) => {
      toast({
        title: t("common.success"),
        description: t("attendance.bulkSuccess").replace("{count}", String(entries.length)),
      });
      setSelectedIds(new Set());
      setSelectMode(false);
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(attendanceKey, context.previous);
      toast({
        title: t("common.error"),
        description: t("attendance.addAttendanceError"),
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
    },
  });

  const bulkCheckOutAttendance = useMutation({
    mutationFn: async (memberIds: string[]) => {
      const response = await apiRequest("POST", "/api/attendance/bulk-checkout", {
        memberIds,
        date: selectedDate,
        checkOut: new Date().toISOString(),
      });
      return response.json();
    },
    onMutate: async (memberIds) => {
      await queryClient.cancelQueries({ queryKey: attendanceKey });
      const previous = queryClient.getQueryData<Attendance[]>(attendanceKey);
      const checkOut = new Date().toISOString();
      const ids = new Set(memberIds);
      queryClient.setQueryData<Attendance[]>(attendanceKey, (old) =>
        (old ?? []).map((record) =>
          ids.has(record.memberId) && !record.checkOut ? { ...record, checkOut } : record,
        ),
      );
      return { previous };
    },
    onSuccess: (_data, memberIds) => {
      toast({
        title: t("common.success"),
        description: t("attendance.bulkCheckOutSuccess").replace("{count}", String(memberIds.length)),
      });
      setSelectedIds(new Set());
      setSelectMode(false);
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(attendanceKey, context.previous);
      toast({
        title: t("common.error"),
        description: t("attendance.addAttendanceError"),
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
    },
  });

  const removeAttendance = useMutation({
    mutationFn: async (attendanceId: string) => {
      await apiRequest("DELETE", `/api/attendance/${attendanceId}`);
      return true;
    },
    onMutate: async (attendanceId) => {
      await queryClient.cancelQueries({ queryKey: attendanceKey });
      const previous = queryClient.getQueryData<Attendance[]>(attendanceKey);
      queryClient.setQueryData<Attendance[]>(attendanceKey, (old) =>
        (old ?? []).filter((record) => record.id !== attendanceId),
      );
      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) queryClient.setQueryData(attendanceKey, context.previous);
      toast({
        title: t("common.error"),
        description: t("attendance.deleteError"),
        variant: "destructive",
      });
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/attendance"] });
    },
  });

  // Members can have several check-in/check-out sessions per day.
  const sessionsByMember = new Map<string, Attendance[]>();
  attendanceRecords?.forEach((record) => {
    const list = sessionsByMember.get(record.memberId) ?? [];
    list.push(record);
    sessionsByMember.set(record.memberId, list);
  });
  sessionsByMember.forEach((list) =>
    list.sort((a, b) => String(b.checkIn ?? "").localeCompare(String(a.checkIn ?? ""))),
  );

  const getMemberSessions = (member: Member): Attendance[] =>
    sessionsByMember.get(member.id) ?? sessionsByMember.get(member.memberId) ?? [];

  const getMemberStatus = (member: Member): MemberStatus => {
    const sessions = getMemberSessions(member);
    if (sessions.length === 0) return "absent";
    return sessions[0].checkOut ? "out" : "in";
  };

  const isMemberActive = (member: Member, date: string) => {
    if (!member.subscriptionStart || !member.subscriptionEnd) return false;
    try {
      const selected = startOfDay(parseISO(date));
      const start = startOfDay(parseISO(member.subscriptionStart));
      const end = endOfDay(parseISO(member.subscriptionEnd));
      return isWithinInterval(selected, { start, end });
    } catch {
      return false;
    }
  };

  const getInitials = (name: string) => {
    const parts = name.trim().split(/\s+/);
    if (parts.length === 0) return "?";
    return parts
      .slice(0, 2)
      .map((part) => part[0])
      .join("");
  };

  const denyAccess = () =>
    toast({
      title: t("common.error"),
      description: t("common.accessDeniedMessage"),
      variant: "destructive",
    });

  const handleToggleAttendance = (member: Member) => {
    const status = getMemberStatus(member);

    if (status === "in") {
      // Open session → record the check-out time.
      const open = getMemberSessions(member)[0];
      if (open.id.startsWith("optimistic-")) return;
      if (!canAdd) return denyAccess();
      checkOutAttendance.mutate(open.id);
      return;
    }

    // Absent or already checked out → start a new check-in session.
    if (!canAdd) return denyAccess();
    recordAttendance.mutate({
      memberId: member.id,
      memberName: member.name,
      date: selectedDate,
      checkIn: new Date().toISOString(),
    });
  };

  const handleDeleteSession = (record: Attendance) => {
    if (record.id.startsWith("optimistic-")) return;
    if (!canDelete) return denyAccess();
    removeAttendance.mutate(record.id);
  };

  const toggleSelect = (member: Member) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(member.id)) next.delete(member.id);
      else next.add(member.id);
      return next;
    });
  };

  const exitSelectMode = () => {
    setSelectMode(false);
    setSelectedIds(new Set());
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat(language === 'ar' ? 'ar-BH' : 'en-US', {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(date);
  };

  const formatTime = (value: unknown) =>
    value ? safeFormat(value, "HH:mm", { fallback: String(value) }) : "—";

  const activeMembers = (members ?? []).filter((member) =>
    isMemberActive(member, selectedDate)
  );

  const inCount = activeMembers.filter((m) => getMemberStatus(m) === "in").length;
  const outCount = activeMembers.filter((m) => getMemberStatus(m) === "out").length;
  const absentCount = activeMembers.length - inCount - outCount;

  const filteredMembers = activeMembers.filter((member) => {
    if (statusFilter !== "all" && getMemberStatus(member) !== statusFilter) return false;
    const query = searchQuery.trim().toLowerCase();
    if (!query) return true;
    return (
      member.name.toLowerCase().includes(query) ||
      member.memberId.toLowerCase().includes(query)
    );
  });

  // Check-in applies to selected members who are not currently in;
  // check-out applies to selected members with an open session.
  const selectedMembers = activeMembers.filter((member) => selectedIds.has(member.id));
  const selectedForCheckIn = selectedMembers.filter((member) => getMemberStatus(member) !== "in");
  const selectedForCheckOut = selectedMembers.filter((member) => getMemberStatus(member) === "in");

  const submitBulkCheckIn = () => {
    const entries = selectedForCheckIn.map((member) => ({
      memberId: member.id,
      memberName: member.name,
    }));
    if (entries.length === 0) return;
    bulkRecordAttendance.mutate(entries);
  };

  const submitBulkCheckOut = () => {
    const memberIds = selectedForCheckOut.map((member) => member.id);
    if (memberIds.length === 0) return;
    bulkCheckOutAttendance.mutate(memberIds);
  };

  const selectedMember =
    filteredMembers.find((m) => m.id === selectedMemberId) ??
    activeMembers.find((m) => m.id === selectedMemberId) ??
    null;

  const selectedSessions = selectedMember ? getMemberSessions(selectedMember) : [];

  useEffect(() => {
    if (filteredMembers.length === 0) {
      setSelectedMemberId(null);
      return;
    }
    if (!selectedMemberId || !filteredMembers.some((m) => m.id === selectedMemberId)) {
      setSelectedMemberId(filteredMembers[0].id);
    }
  }, [filteredMembers, selectedMemberId]);

  const handleMemberRowClick = (member: Member) => {
    if (selectMode) {
      toggleSelect(member);
      return;
    }
    setSelectedMemberId(member.id);
  };

  const handleDetailToggle = () => {
    if (!selectedMember) return;
    handleToggleAttendance(selectedMember);
  };

  if (loadingAttendance || loadingMembers) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-full max-w-sm" />
        <div className="flex gap-4 min-h-[480px]">
          <Skeleton className="w-72 shrink-0" />
          <Skeleton className="flex-1" />
        </div>
      </div>
    );
  }

  const selectedStatus = selectedMember ? getMemberStatus(selectedMember) : null;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
        <div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold" data-testid="text-page-title">
              {t('attendance.title')}
            </h1>
            <Badge className="bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300">
              {inCount} / {activeMembers.length} {t('common.present')}
            </Badge>
          </div>
          <p className="text-sm text-muted-foreground">{formatDate(selectedDate)}</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 w-full lg:w-auto">
          {canAdd && (
            <Link href="/scan">
              <Button variant="outline" className="w-full sm:w-auto">
                <QrCode className="h-4 w-4 me-2" />
                {t("checkin.scannerTitle")}
              </Button>
            </Link>
          )}
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-muted-foreground" />
            <Input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full sm:w-44"
              data-testid="input-attendance-date"
            />
          </div>
          <div className="relative w-full sm:w-64">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={t('common.search')}
              className="pr-10"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              data-testid="input-search-attendance"
            />
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-2">
          <Button
            variant={statusFilter === "all" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("all")}
          >
            {t('common.all')} ({activeMembers.length})
          </Button>
          <Button
            variant={statusFilter === "in" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("in")}
          >
            {t('common.present')} ({inCount})
          </Button>
          <Button
            variant={statusFilter === "out" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("out")}
          >
            {t('attendance.checkedOut')} ({outCount})
          </Button>
          <Button
            variant={statusFilter === "absent" ? "default" : "outline"}
            size="sm"
            onClick={() => setStatusFilter("absent")}
          >
            {t('common.absent')} ({absentCount})
          </Button>
        </div>
        {canAdd && (
          <div className="flex flex-wrap gap-2">
            {selectMode ? (
              <>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const absentIds = filteredMembers
                      .filter((member) => getMemberStatus(member) === "absent")
                      .map((member) => member.id);
                    setSelectedIds(new Set(absentIds));
                  }}
                >
                  {t('attendance.selectAllAbsent')}
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    const presentIds = filteredMembers
                      .filter((member) => getMemberStatus(member) === "in")
                      .map((member) => member.id);
                    setSelectedIds(new Set(presentIds));
                  }}
                >
                  {t('attendance.selectAllPresent')}
                </Button>
                <Button
                  size="sm"
                  disabled={selectedForCheckIn.length === 0 || bulkRecordAttendance.isPending}
                  onClick={submitBulkCheckIn}
                >
                  <UserCheck className="h-4 w-4 me-2" />
                  {t('attendance.checkInSelected').replace("{count}", String(selectedForCheckIn.length))}
                </Button>
                <Button
                  size="sm"
                  variant="secondary"
                  disabled={selectedForCheckOut.length === 0 || bulkCheckOutAttendance.isPending}
                  onClick={submitBulkCheckOut}
                >
                  <LogOut className="h-4 w-4 me-2" />
                  {t('attendance.checkOutSelected').replace("{count}", String(selectedForCheckOut.length))}
                </Button>
                <Button variant="ghost" size="sm" onClick={exitSelectMode}>
                  {t('common.cancel')}
                </Button>
              </>
            ) : (
              <Button variant="outline" size="sm" onClick={() => setSelectMode(true)}>
                <Users className="h-4 w-4 me-2" />
                {t('attendance.bulkMode')}
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="flex flex-col lg:flex-row gap-4 min-h-[calc(100vh-16rem)]">
        {/* Member list — single column, scrollable */}
        <div className="w-full lg:w-72 xl:w-80 shrink-0 flex flex-col border rounded-lg bg-card overflow-hidden">
          <div className="px-3 py-2 border-b text-xs font-medium text-muted-foreground">
            {filteredMembers.length} {t("members.title")}
          </div>
          <div className="flex-1 overflow-y-auto">
            {filteredMembers.length > 0 ? (
              filteredMembers.map((member) => {
                const status = getMemberStatus(member);
                const isSelected = selectMode
                  ? selectedIds.has(member.id)
                  : selectedMemberId === member.id;

                return (
                  <button
                    key={member.id}
                    type="button"
                    className={cn(
                      "w-full flex items-center gap-3 px-3 py-2.5 text-start border-b last:border-b-0 transition-colors hover:bg-muted/60",
                      isSelected && "bg-primary/10 border-s-2 border-s-primary",
                      status === "in" && !isSelected && "bg-green-50/50 dark:bg-green-900/5",
                    )}
                    onClick={() => handleMemberRowClick(member)}
                    data-testid={`card-attendance-${member.id}`}
                  >
                    <Avatar className="h-9 w-9 shrink-0">
                      <AvatarImage src={member.imageUrl ?? undefined} alt={member.name} />
                      <AvatarFallback className="text-xs">{getInitials(member.name)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-sm truncate">{member.name}</p>
                      <p className="text-xs text-muted-foreground">#{member.memberId}</p>
                    </div>
                    {status === "in" && (
                      <Badge className="shrink-0 bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 text-[10px] px-1.5">
                        {t("common.present")}
                      </Badge>
                    )}
                    {status === "out" && (
                      <Badge className="shrink-0 bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300 text-[10px] px-1.5">
                        {t("attendance.checkedOut")}
                      </Badge>
                    )}
                    {status === "absent" && (
                      <Badge variant="secondary" className="shrink-0 text-[10px] px-1.5">
                        {t("common.absent")}
                      </Badge>
                    )}
                  </button>
                );
              })
            ) : (
              <div className="py-12 px-4 text-center text-sm text-muted-foreground">
                {searchQuery ? t("common.noResults") : t("members.noMembers")}
              </div>
            )}
          </div>
        </div>

        {/* Attendance detail table for selected member */}
        <div className="flex-1 flex flex-col border rounded-lg bg-card overflow-hidden min-h-[320px]">
          {selectedMember ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 border-b">
                <div className="flex items-center gap-3 min-w-0">
                  <Avatar className="h-10 w-10 shrink-0">
                    <AvatarImage src={selectedMember.imageUrl ?? undefined} alt={selectedMember.name} />
                    <AvatarFallback>{getInitials(selectedMember.name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{selectedMember.name}</p>
                    <p className="text-xs text-muted-foreground">
                      #{selectedMember.memberId} · {formatDate(selectedDate)}
                    </p>
                  </div>
                </div>
                {canAdd && !selectMode && (
                  <Button
                    size="sm"
                    variant={selectedStatus === "in" ? "secondary" : "default"}
                    onClick={handleDetailToggle}
                  >
                    {selectedStatus === "in" ? (
                      <>
                        <LogOut className="h-4 w-4 me-2" />
                        {t("attendance.checkOut")}
                      </>
                    ) : (
                      <>
                        <LogIn className="h-4 w-4 me-2" />
                        {t("attendance.checkIn")}
                      </>
                    )}
                  </Button>
                )}
              </div>
              <div className="flex-1 overflow-y-auto">
                {selectedSessions.length > 0 ? (
                  <table className="w-full text-sm">
                    <thead className="sticky top-0 bg-muted/80 backdrop-blur-sm z-10">
                      <tr className="border-b">
                        <th className="text-start py-2.5 px-4 font-medium text-muted-foreground w-12">#</th>
                        <th className="text-start py-2.5 px-4 font-medium text-muted-foreground">
                          {t("attendance.checkIn")}
                        </th>
                        <th className="text-start py-2.5 px-4 font-medium text-muted-foreground">
                          {t("attendance.checkOut")}
                        </th>
                        {canDelete && (
                          <th className="text-end py-2.5 px-4 font-medium text-muted-foreground w-16">
                            {t("common.actions")}
                          </th>
                        )}
                      </tr>
                    </thead>
                    <tbody>
                      {[...selectedSessions]
                        .sort((a, b) => String(a.checkIn ?? "").localeCompare(String(b.checkIn ?? "")))
                        .map((session, index) => (
                          <tr key={session.id} className="border-b last:border-0 hover:bg-muted/40">
                            <td className="py-2.5 px-4 text-muted-foreground">{index + 1}</td>
                            <td className="py-2.5 px-4">
                              <span className="inline-flex items-center gap-1.5 font-medium">
                                <LogIn className="h-3.5 w-3.5 text-green-600" />
                                {formatTime(session.checkIn)}
                              </span>
                            </td>
                            <td className="py-2.5 px-4">
                              <span className="inline-flex items-center gap-1.5 font-medium">
                                <LogOut className="h-3.5 w-3.5 text-amber-600" />
                                {session.checkOut ? formatTime(session.checkOut) : "—"}
                              </span>
                            </td>
                            {canDelete && (
                              <td className="py-2.5 px-4 text-end">
                                {!session.id.startsWith("optimistic-") && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 text-muted-foreground hover:text-destructive"
                                    onClick={() => handleDeleteSession(session)}
                                    aria-label={t("common.delete")}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </td>
                            )}
                          </tr>
                        ))}
                    </tbody>
                  </table>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full py-16 text-muted-foreground">
                    <p className="text-sm">{t("attendance.noAttendance")}</p>
                    {canAdd && !selectMode && (
                      <Button size="sm" className="mt-4" onClick={handleDetailToggle}>
                        <LogIn className="h-4 w-4 me-2" />
                        {t("attendance.checkIn")}
                      </Button>
                    )}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-1 items-center justify-center text-muted-foreground text-sm py-16">
              {t("members.selectMember")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
